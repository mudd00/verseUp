-- refunds 테이블 존재 여부 확인
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'refunds'
) as refunds_table_exists;

-- refunds 테이블이 존재하면 데이터 조회
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'refunds') THEN
    RAISE NOTICE 'refunds 테이블이 존재합니다.';
    RAISE NOTICE '데이터 조회 중...';
  ELSE
    RAISE NOTICE 'refunds 테이블이 존재하지 않습니다!';
    RAISE NOTICE '마이그레이션을 실행해주세요: 002_refunds_schema.sql';
  END IF;
END $$;

-- refunds 테이블 데이터 조회 (존재하는 경우)
SELECT
  r.id,
  r.user_id,
  p.email as user_email,
  r.original_amount,
  r.refund_amount,
  r.refund_rate,
  r.status,
  r.policy_applied,
  r.created_at
FROM refunds r
LEFT JOIN profiles p ON r.user_id = p.id
ORDER BY r.created_at DESC
LIMIT 10;
