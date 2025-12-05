-- 환불 중복 방지 UNIQUE constraint 추가
-- 동일한 enrollment_id에 대해 한 번만 환불 가능하도록 제약

-- refunds 테이블에 UNIQUE constraint 추가
ALTER TABLE refunds
ADD CONSTRAINT unique_enrollment_refund
UNIQUE (enrollment_id);

-- 기존 데이터 중복 확인 (있다면 수동으로 정리 필요)
-- SELECT enrollment_id, COUNT(*)
-- FROM refunds
-- GROUP BY enrollment_id
-- HAVING COUNT(*) > 1;

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_refunds_enrollment
ON refunds(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_refunds_user_status
ON refunds(user_id, status);

COMMENT ON CONSTRAINT unique_enrollment_refund ON refunds IS
'동일한 수강 신청에 대해 중복 환불 방지';
