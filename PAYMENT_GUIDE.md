# 토스페이먼츠 결제 시스템 구현 가이드

## 개요

VerseUp 프로젝트에 토스페이먼츠 결제 시스템이 통합되었습니다. 학생이 유료 강의를 수강하려고 할 때 결제를 진행할 수 있으며, **현재는 테스트 모드로 설정되어 실제 금액이 이동하지 않습니다.**

## 설치 방법

### 1. 토스페이먼츠 SDK 설치

```bash
npm install @tosspayments/tosspayments-sdk
```

### 2. 환경 변수 설정

`.env` 파일에 다음 환경 변수를 추가하세요 (`.env.example` 참조):

```bash
# 프론트엔드 - 토스페이먼츠 클라이언트 키 (결제창 API용, test_ck로 시작)
VITE_TOSS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q4wVN97Eoqe

# 백엔드 - 토스페이먼츠 시크릿 키 (테스트용)
TOSS_SECRET_KEY=test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R
```

**⚠️ 중요**:
- 현재 설정된 키는 **테스트용 키**입니다.
- 결제창 API 방식을 사용하며, `test_ck_`로 시작하는 클라이언트 키를 사용합니다.
- 테스트 모드에서는 실제 금액이 이동하지 않습니다.
- 실제 서비스 배포 시에는 토스페이먼츠 개발자센터에서 발급받은 실제 키로 교체해야 합니다.

## 기능 설명

### 1. 결제 흐름

1. **강의 상세 페이지**: 유료 강의의 경우 "수강 신청하기" 버튼 클릭 시 결제 페이지로 이동
2. **결제 페이지** (`/payment`): 토스페이먼츠 결제 위젯이 표시되며, 결제 수단 선택 가능
3. **결제 승인**: 결제 정보 입력 후 결제 요청
4. **결제 검증**: 백엔드에서 토스페이먼츠 API를 통해 결제 승인 및 검증
5. **수강 신청 처리**: 결제 성공 시 자동으로 수강 신청 처리
6. **결과 페이지**: 성공 시 `/payment/success`, 실패 시 `/payment/fail`로 리디렉션

### 2. 구현된 페이지

#### `/payment` - 결제 페이지
- 강의 정보 및 결제 금액 표시
- 결제창 API 방식 (팝업)
- "결제하기" 버튼 클릭 시 토스페이먼츠 결제창이 팝업으로 표시
- 테스트 모드 안내 메시지

#### `/payment/success` - 결제 성공 페이지
- 결제 완료 메시지
- 결제 내역 상세 정보
- 대시보드/강의 목록으로 이동 버튼

#### `/payment/fail` - 결제 실패 페이지
- 결제 실패 메시지 및 오류 정보
- 재시도 버튼
- 강의 목록으로 돌아가기 버튼

### 3. 백엔드 API

#### `POST /api/payments/confirm` - 결제 승인 및 검증
- 토스페이먼츠 결제 승인 API 호출
- 결제 검증 및 수강 신청 처리
- 인증 필요 (authMiddleware)

**요청 본문**:
```json
{
  "orderId": "ORDER_123_1234567890",
  "paymentKey": "payment_key_from_toss",
  "amount": 50000
}
```

**응답**:
```json
{
  "success": true,
  "orderId": "ORDER_123_1234567890",
  "orderName": "강의명",
  "amount": 50000,
  "method": "카드",
  "approvedAt": "2025-01-26T12:00:00Z",
  "receipt": "https://receipt.url"
}
```

#### `GET /api/payments/:orderId` - 결제 내역 조회
- 특정 주문의 결제 내역 조회
- 인증 필요

#### `GET /api/payments` - 내 결제 내역 목록
- 사용자의 모든 결제 내역 조회
- 인증 필요

## 테스트 방법

### 1. 개발 서버 실행

```bash
npm run dev:both
```

### 2. 테스트 시나리오

1. 로그인 (학생 계정)
2. 강의 목록에서 유료 강의 선택
3. "수강 신청하기" 버튼 클릭
4. 결제 페이지에서 결제 수단 선택
5. 테스트 카드 정보 입력:
   - 카드번호: 토스페이먼츠 테스트 카드 번호 사용
   - 유효기간: 미래 날짜
   - CVC: 임의의 3자리 숫자
6. 결제 진행
7. 결제 성공 페이지에서 결과 확인

### 3. 테스트 카드 정보

토스페이먼츠 공식 문서에서 제공하는 테스트 카드를 사용하세요:
- [토스페이먼츠 테스트 카드 정보](https://docs.tosspayments.com/guides/test-card)

## 주요 파일

### 프론트엔드
- `src/pages/Payment.jsx` - 결제 페이지
- `src/pages/PaymentSuccess.jsx` - 결제 성공 페이지
- `src/pages/PaymentFail.jsx` - 결제 실패 페이지
- `src/pages/CourseDetail.jsx` - 강의 상세 (결제 연동)

### 백엔드
- `server/routes/payments.js` - 결제 관련 API 라우트

### 설정
- `.env.example` - 환경 변수 예시

## 주의사항

1. **테스트 모드**: 현재 설정은 테스트 모드로, 실제 금액이 이동하지 않습니다.
2. **프로덕션 배포**: 실제 서비스 배포 시 반드시 실제 클라이언트 키와 시크릿 키로 교체하세요.
3. **보안**: 시크릿 키는 절대 프론트엔드에 노출되어서는 안 되며, 백엔드에서만 사용해야 합니다.
4. **데이터베이스**: 현재 결제 정보와 수강 신청은 TODO로 표시되어 있으며, Supabase 연동이 필요합니다.

## TODO

- [ ] Supabase `payments` 테이블 생성 및 스키마 정의
- [ ] 결제 성공 시 Supabase에 결제 정보 저장
- [ ] 결제 성공 시 자동 수강 신청 처리 (Supabase enrollments 테이블)
- [ ] 결제 내역 조회 기능 구현 (대시보드)
- [ ] 환불 기능 구현
- [ ] 결제 실패 시 로깅 및 모니터링
- [ ] 실제 키로 교체 (프로덕션 배포 시)

## 참고 문서

- [토스페이먼츠 공식 문서](https://docs.tosspayments.com/)
- [토스페이먼츠 SDK v2](https://docs.tosspayments.com/sdk/v2/js)
- [결제위젯 연동 가이드](https://docs.tosspayments.com/guides/payment-widget/integration)
- [테스트 결제](https://docs.tosspayments.com/guides/test-card)
