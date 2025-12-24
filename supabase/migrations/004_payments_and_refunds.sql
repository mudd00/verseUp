-- =====================================================
-- PAYMENTS AND REFUNDS SCHEMA
-- =====================================================
-- This migration creates the payments and refunds system for course enrollments
-- Includes payment tracking, refund management, and related triggers

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
-- Stores payment information for course enrollments

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,

  -- Payment amount and status
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method TEXT,
  transaction_id TEXT,

  -- Refund tracking
  refund_amount INTEGER DEFAULT 0 CHECK (refund_amount >= 0),
  is_refunded BOOLEAN DEFAULT false,

  -- Timestamps
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON public.payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON public.payments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Comments
COMMENT ON TABLE public.payments IS 'Payment records for course enrollments';
COMMENT ON COLUMN public.payments.amount IS 'Payment amount in KRW';
COMMENT ON COLUMN public.payments.status IS 'Payment status: pending, completed, failed, cancelled';
COMMENT ON COLUMN public.payments.refund_amount IS 'Total refunded amount';
COMMENT ON COLUMN public.payments.is_refunded IS 'Whether this payment has been refunded';

-- =====================================================
-- REFUNDS TABLE
-- =====================================================
-- Stores refund requests and processing information

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,

  -- Refund amount and reason
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT,

  -- Refund status and processing
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure only one refund per enrollment
  CONSTRAINT unique_enrollment_refund UNIQUE (enrollment_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_enrollment ON public.refunds(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_requested_by ON public.refunds(requested_by);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON public.refunds(created_at DESC);

-- Comments
COMMENT ON TABLE public.refunds IS 'Refund requests and processing records';
COMMENT ON COLUMN public.refunds.amount IS 'Refund amount in KRW';
COMMENT ON COLUMN public.refunds.status IS 'Refund status: pending, approved, rejected, completed';
COMMENT ON COLUMN public.refunds.requested_by IS 'User who requested the refund';
COMMENT ON COLUMN public.refunds.processed_by IS 'Admin/instructor who processed the refund';
COMMENT ON CONSTRAINT unique_enrollment_refund ON public.refunds IS 'Prevents duplicate refunds for the same enrollment';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update payments.updated_at timestamp
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update refunds.updated_at timestamp
CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Update payment refund info when refund is completed
CREATE OR REPLACE FUNCTION update_payment_refund_info()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.payments
    SET
      refund_amount = COALESCE(refund_amount, 0) + NEW.amount,
      is_refunded = true,
      updated_at = NOW()
    WHERE id = NEW.payment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update payment when refund is completed
CREATE TRIGGER update_payment_on_refund_complete
  AFTER UPDATE ON public.refunds
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION update_payment_refund_info();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update payments"
  ON public.payments FOR UPDATE
  USING (true);

-- Refunds policies
CREATE POLICY "Users can view their own refunds"
  ON public.refunds FOR SELECT
  USING (
    auth.uid() = requested_by
    OR auth.uid() IN (
      SELECT instructor_id FROM public.courses
      WHERE id = (
        SELECT course_id FROM public.enrollments WHERE id = enrollment_id
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can request refunds"
  ON public.refunds FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Instructors and admins can process refunds"
  ON public.refunds FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT instructor_id FROM public.courses
      WHERE id = (
        SELECT course_id FROM public.enrollments WHERE id = enrollment_id
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
