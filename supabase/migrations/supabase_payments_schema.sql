-- Payments 테이블 생성
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE,
  payment_key TEXT NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- completed, pending, cancelled
  method TEXT, -- 결제 수단 (카드, 간편결제 등)
  order_name TEXT,
  approved_at TIMESTAMPTZ,
  receipt_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id);
CREATE INDEX IF NOT EXISTS payments_course_id_idx ON payments(course_id);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 결제 내역만 조회 가능
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 인증된 사용자는 결제 생성 가능
CREATE POLICY "Authenticated users can create payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enrollments 테이블에 payment_id 컬럼 추가 (이미 있다면 스킵)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;
    CREATE INDEX enrollments_payment_id_idx ON enrollments(payment_id);
  END IF;
END $$;

COMMENT ON TABLE payments IS '결제 정보를 저장하는 테이블';
COMMENT ON COLUMN payments.order_id IS '토스페이먼츠 주문 ID (ORDER_로 시작)';
COMMENT ON COLUMN payments.payment_key IS '토스페이먼츠 결제 키';
COMMENT ON COLUMN payments.course_id IS '결제한 강의 ID (nullable)';
COMMENT ON COLUMN payments.amount IS '결제 금액 (원 단위)';
COMMENT ON COLUMN payments.status IS '결제 상태 (completed, pending, cancelled)';
COMMENT ON COLUMN payments.method IS '결제 수단 (카드, 간편결제 등)';
