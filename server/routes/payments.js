import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_your_secret_key'

/**
 * 결제 승인 및 검증
 * POST /api/payments/confirm
 */
router.post('/confirm', authMiddleware, async (req, res) => {
  try {
    const { orderId, paymentKey, amount } = req.body

    console.log('결제 승인 요청:', { orderId, paymentKey, amount })

    if (!orderId || !paymentKey || !amount) {
      return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' })
    }

    // Authorization 헤더 생성
    const encodedKey = Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')
    console.log('Secret Key:', TOSS_SECRET_KEY)

    // 토스페이먼츠 결제 승인 API 호출
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        paymentKey,
        amount,
      }),
    })

    const tossData = await tossResponse.json()

    if (!tossResponse.ok) {
      console.error('토스페이먼츠 승인 실패:', {
        status: tossResponse.status,
        data: tossData,
      })
      return res.status(tossResponse.status).json({
        error: '결제 승인에 실패했습니다.',
        details: tossData,
      })
    }

    console.log('결제 승인 성공:', tossData)

    // 결제 정보를 데이터베이스에 저장
    let savedPayment = null
    if (supabase) {
      try {
        const { data: payment, error: dbError } = await supabase
          .from('payments')
          .insert({
            user_id: req.user.id,
            order_id: orderId,
            payment_key: paymentKey,
            amount: amount,
            status: 'completed',
            method: tossData.method,
            order_name: tossData.orderName,
            approved_at: tossData.approvedAt,
            receipt_url: tossData.receipt?.url,
            metadata: tossData.metadata || {},
          })
          .select()
          .single()

        if (dbError) {
          console.error('결제 정보 저장 실패:', dbError)
        } else {
          savedPayment = payment
          console.log('✅ 결제 정보 저장 완료:', payment.id)
        }
      } catch (err) {
        console.error('결제 정보 저장 오류:', err)
      }
    }

    // URL에서 courseId 추출 (metadata가 null이므로 orderId에서 추출)
    // orderId 형식: ORDER_{courseId}_{timestamp}
    let courseId = null
    if (orderId && orderId.startsWith('ORDER_')) {
      const parts = orderId.split('_')
      if (parts.length >= 2) {
        courseId = parts.slice(1, -1).join('_') // 마지막 타임스탬프 제외
      }
    }

    console.log('추출된 courseId:', courseId)

    // 수강 신청 처리
    let enrollmentId = null
    if (courseId && req.user?.id && supabase) {
      try {
        // 기존 수강 신청 확인 (모든 상태)
        const { data: existingEnrollment, error: checkError } = await supabase
          .from('enrollments')
          .select('id, status')
          .eq('student_id', req.user.id)
          .eq('course_id', courseId)
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('수강 신청 확인 오류:', checkError)
        }

        if (existingEnrollment) {
          if (existingEnrollment.status === 'active') {
            console.log('✅ 이미 수강 중인 강의입니다:', courseId)
            enrollmentId = existingEnrollment.id
          } else {
            // dropped 상태를 active로 변경
            const { data: updated, error: updateError } = await supabase
              .from('enrollments')
              .update({
                status: 'active',
                enrolled_at: new Date().toISOString(),
                payment_id: savedPayment?.id,
              })
              .eq('id', existingEnrollment.id)
              .select()
              .single()

            if (updateError) {
              console.error('수강 신청 재활성화 실패:', updateError)
            } else {
              console.log('✅ 수강 신청 재활성화 완료:', updated.id)
              enrollmentId = updated.id
            }
          }
        } else {
          // 새로운 수강 신청
          const { data: enrollment, error: enrollError } = await supabase
            .from('enrollments')
            .insert({
              student_id: req.user.id,
              course_id: courseId,
              status: 'active',
              enrolled_at: new Date().toISOString(),
              payment_id: savedPayment?.id,
            })
            .select()
            .single()

          if (enrollError) {
            console.error('수강 신청 실패:', enrollError)
          } else {
            console.log('✅ 수강 신청 완료:', enrollment.id)
            enrollmentId = enrollment.id

            // 강의의 enrolled_count 증가 (RPC 함수가 있다면)
            try {
              await supabase.rpc('increment_course_enrolled_count', {
                course_uuid: courseId,
              })
            } catch (rpcErr) {
              // RPC 함수가 없을 수 있으므로 무시
              console.log('enrolled_count 증가 건너뜀 (RPC 함수 없음)')
            }
          }
        }
      } catch (err) {
        console.error('수강 신청 오류:', err)
      }
    }

    // 결제 성공 응답
    res.json({
      success: true,
      orderId: tossData.orderId,
      orderName: tossData.orderName,
      amount: tossData.totalAmount,
      method: tossData.method,
      approvedAt: tossData.approvedAt,
      receipt: tossData.receipt?.url,
      courseId: courseId, // 수강 신청된 강의 ID
      enrolled: !!enrollmentId, // 수강 신청 성공 여부
      enrollmentId: enrollmentId, // 수강 신청 ID
    })
  } catch (error) {
    console.error('결제 검증 오류:', error)
    res.status(500).json({ error: '결제 검증 중 오류가 발생했습니다.' })
  }
})

/**
 * 결제 내역 조회
 * GET /api/payments/:orderId
 */
router.get('/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params

    if (!supabase) {
      return res.status(200).json({
        payment: {
          orderId,
          amount: 50000,
          status: 'completed',
          method: '카드',
          approvedAt: new Date().toISOString(),
        },
      })
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', req.user.id)
      .single()

    if (error) {
      console.error('결제 내역 조회 오류:', error)
      return res.status(404).json({ error: '결제 내역을 찾을 수 없습니다.' })
    }

    res.json({
      payment: {
        orderId: payment.order_id,
        paymentKey: payment.payment_key,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        orderName: payment.order_name,
        approvedAt: payment.approved_at,
        receipt: payment.receipt_url,
      },
    })
  } catch (error) {
    console.error('결제 내역 조회 오류:', error)
    res.status(500).json({ error: '결제 내역 조회에 실패했습니다.' })
  }
})

/**
 * 내 결제 내역 목록
 * GET /api/payments
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ payments: [] })
    }

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('결제 내역 목록 조회 오류:', error)
      return res.status(500).json({ error: '결제 내역 조회에 실패했습니다.' })
    }

    const formattedPayments = payments.map((payment) => ({
      orderId: payment.order_id,
      paymentKey: payment.payment_key,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      orderName: payment.order_name,
      approvedAt: payment.approved_at,
      receipt: payment.receipt_url,
    }))

    res.json({ payments: formattedPayments })
  } catch (error) {
    console.error('결제 내역 목록 조회 오류:', error)
    res.status(500).json({ error: '결제 내역 조회에 실패했습니다.' })
  }
})

export default router
