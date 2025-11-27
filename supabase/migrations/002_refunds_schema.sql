-- Refunds 테이블 생성
-- 환불 정보를 저장하는 테이블

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,

  -- 환불 금액 정보
  original_amount INTEGER NOT NULL, -- 원래 결제 금액
  refund_amount INTEGER NOT NULL,   -- 실제 환불 금액
  refund_rate INTEGER NOT NULL,     -- 환불율 (0-100)

  -- 환불 상태
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),

  -- 환불 사유 및 정책
  reason TEXT NOT NULL DEFAULT 'user_request', -- user_request, policy_violation, etc.
  policy_applied TEXT, -- 적용된 환불 정책 설명

  -- 토스페이먼츠 환불 정보
  toss_cancel_key TEXT, -- 토스페이먼츠 취소 키
  toss_transaction_key TEXT, -- 토스페이먼츠 거래 키

  -- 타임스탬프
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- 메타데이터
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS refunds_payment_id_idx ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS refunds_user_id_idx ON refunds(user_id);
CREATE INDEX IF NOT EXISTS refunds_enrollment_id_idx ON refunds(enrollment_id);
CREATE INDEX IF NOT EXISTS refunds_status_idx ON refunds(status);
CREATE INDEX IF NOT EXISTS refunds_created_at_idx ON refunds(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 환불 내역만 조회 가능
CREATE POLICY "Users can view their own refunds"
  ON refunds FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 인증된 사용자는 환불 요청 생성 가능
CREATE POLICY "Authenticated users can create refunds"
  ON refunds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Updated_at 자동 업데이트 트리거
CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Payments 테이블에 refund_amount 컬럼 추가
-- 결제 건에 대해 환불된 금액 추적
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'refund_amount'
  ) THEN
    ALTER TABLE payments ADD COLUMN refund_amount INTEGER DEFAULT 0;
  END IF;
END $$;

-- Payments 테이블에 is_refunded 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'is_refunded'
  ) THEN
    ALTER TABLE payments ADD COLUMN is_refunded BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 환불 완료 시 payment의 refund_amount와 is_refunded를 업데이트하는 함수
CREATE OR REPLACE FUNCTION update_payment_refund_info()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE payments
    SET
      refund_amount = COALESCE(refund_amount, 0) + NEW.refund_amount,
      is_refunded = true,
      updated_at = NOW()
    WHERE id = NEW.payment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 환불 완료 시 payment 업데이트 트리거
CREATE TRIGGER update_payment_on_refund_complete
  AFTER UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_refund_info();

COMMENT ON TABLE refunds IS '환불 정보를 저장하는 테이블';
COMMENT ON COLUMN refunds.original_amount IS '원래 결제 금액';
COMMENT ON COLUMN refunds.refund_amount IS '실제 환불 금액';
COMMENT ON COLUMN refunds.refund_rate IS '환불율 (0-100)';
COMMENT ON COLUMN refunds.status IS '환불 상태 (pending, completed, failed)';
COMMENT ON COLUMN refunds.reason IS '환불 사유';
COMMENT ON COLUMN refunds.policy_applied IS '적용된 환불 정책 설명';
