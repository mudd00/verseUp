# VerseUp 데이터베이스 마이그레이션 가이드

이 폴더는 VerseUp 프로젝트의 Supabase 데이터베이스 스키마를 관리하는 마이그레이션 파일들을 포함합니다.

## 📁 마이그레이션 파일 구조

마이그레이션 파일은 기능별로 구성되어 있으며, **순서대로 실행**되어야 합니다:

### 🔹 핵심 스키마 (001-003)
| 파일 | 내용 | 의존성 |
|------|------|--------|
| `001_core_schema.sql` | 프로필, 결제, 강의, 수강 테이블 + enrolled_count 통합 트리거 | - |
| `002_live_sessions.sql` | 실시간 강의, 채팅 메시지 | 001 |
| `003_classrooms_and_schedules.sql` | 강의실, 시간표, 일정 시스템 | 001 |

### 🔹 기능별 스키마 (004-008)
| 파일 | 내용 | 의존성 |
|------|------|--------|
| `004_payments_and_refunds.sql` | 결제, 환불 시스템 | 001 |
| `005_course_materials.sql` | 강의 자료 + Storage | 001 |
| `006_assignments.sql` | 과제, 제출, 채점 + Storage | 001 |
| `007_notifications.sql` | 알림 시스템 | 001 |
| `008_audit_logs.sql` | 감사 로그 (보안/규정 준수) | 001 |

### 🔹 유틸리티 & 데이터 (009-011)
| 파일 | 내용 | 의존성 |
|------|------|--------|
| `009_helper_functions.sql` | 프로필 관리, 통계, 동기화 함수 | 001 |
| `010_initial_data.sql` | 강의실 A-E, 시간표 25개 슬롯 | 003 |
| `011_test_accounts.sql` | 테스트 계정 (개발 전용) ⚠️ | 001 |

## 🚀 마이그레이션 실행 방법

### 로컬 개발 환경

```bash
# Supabase CLI 설치 확인
supabase --version

# 로컬 Supabase 시작
supabase start

# 모든 마이그레이션 적용
supabase db reset

# 또는 특정 마이그레이션 실행
supabase migration up
```

### Supabase Dashboard (수동 실행)

1. Supabase Project 대시보드 접속
2. **SQL Editor** 메뉴 클릭
3. 마이그레이션 파일을 **001부터 순서대로** 복사하여 실행
4. 각 파일 실행 후 에러가 없는지 확인

### ⚠️ 주의사항

- **반드시 001부터 순서대로 실행**하세요 (의존성 때문)
- **011_test_accounts.sql**은 **개발 환경에서만** 실행하세요
- 프로덕션 배포 전 011 파일을 제거하거나 실행하지 마세요

## 🔑 주요 기능

### 1. Enrolled Count 자동 관리
`001_core_schema.sql`의 `manage_enrolled_count()` 트리거가 자동으로 처리:
- ✅ 수강 신청 → `enrolled_count +1`
- ✅ 수강 취소 → `enrolled_count -1`
- ✅ 재수강 → 중복 증가 방지 (기존 문제 해결)
- ✅ 수료 → `enrolled_count -1`

### 2. RLS (Row Level Security) 정책
모든 테이블에 역할 기반 접근 제어:
- **학생**: 본인의 수강/과제/알림만 조회
- **강사**: 본인 강의의 학생 데이터 관리
- **관리자**: 전체 데이터 접근

### 3. Storage 버킷
- `course-materials`: 강의 자료 (50MB, 공개)
- `assignment-submissions`: 과제 제출 (20MB, 비공개)

### 4. 트리거 & 자동화
- `handle_new_user()`: 회원가입 시 프로필 자동 생성
- `manage_enrolled_count()`: 수강 인원 자동 관리
- `auto_generate_course_code()`: 강의 코드 자동 생성
- `update_updated_at_column()`: 타임스탬프 자동 업데이트

## 🛠️ 유틸리티 함수 사용법

### enrolled_count 수동 동기화

```sql
-- 특정 강의
SELECT sync_course_enrolled_count('course-uuid');

-- 모든 강의
SELECT sync_course_enrolled_count();
```

### 프로필 통계 조회

```sql
SELECT * FROM get_profile_stats('user-uuid');
```

### 역할 확인

```sql
SELECT is_instructor_or_admin('user-uuid'); -- true/false
SELECT get_user_role('user-uuid');          -- 'student', 'instructor', 'admin'
```

## 📊 데이터 검증

마이그레이션 후 다음 쿼리로 데이터 정합성 확인:

```sql
-- enrolled_count 정확성 확인
SELECT
  c.id,
  c.title,
  c.enrolled_count as db_count,
  COUNT(e.id) FILTER (WHERE e.status = 'active') as actual_count,
  CASE
    WHEN c.enrolled_count = COUNT(e.id) FILTER (WHERE e.status = 'active')
    THEN '✅ 일치'
    ELSE '❌ 불일치'
  END as status
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.enrolled_count;

-- 트리거 설치 확인
SELECT
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'enrollments'
ORDER BY trigger_name;
```

## 🔄 데이터 초기화

개발 중 데이터를 초기화하려면:

```bash
# scripts 폴더의 reset_data_simple.sql 사용
supabase db execute -f scripts/reset_data_simple.sql
```

또는 Supabase Dashboard에서 `scripts/reset_data_simple.sql` 실행

## 📝 테스트 계정

`011_test_accounts.sql` 실행 전 Supabase Dashboard에서 수동 생성 필요:

1. **Authentication → Users** 메뉴
2. **Add user** 클릭
3. 다음 계정 생성:
   - `instructor@test.com` (비밀번호: testtest123)
   - `student@test.com` (비밀번호: testtest123)
4. 이후 `011_test_accounts.sql` 실행하여 프로필 생성

### 프로덕션 배포 시 삭제

```sql
DELETE FROM auth.users
WHERE email IN ('student@test.com', 'instructor@test.com');
```

## 📦 기존 마이그레이션 백업

기존 마이그레이션 파일들은 `old_migrations/` 폴더에 백업되어 있습니다.
참고용으로만 사용하고, 새로운 마이그레이션은 현재 폴더의 001-011 파일을 사용하세요.

## 🐛 디버깅 스크립트

`scripts/` 폴더에 유용한 디버깅 스크립트가 있습니다:

- `check_enrolled_count.sql`: enrolled_count 불일치 확인
- `debug_enrollment.sql`: enrollment 상태 추적
- `check_accounts.sql`: 계정 상태 확인
- `create_admin_account.sql`: 관리자 계정 생성
- `reset_data_simple.sql`: 데이터 초기화

## 💡 트러블슈팅

### enrolled_count 불일치 발생 시

```sql
-- scripts/check_enrolled_count.sql 실행하여 확인
-- 불일치가 있다면 동기화 함수 실행
SELECT sync_course_enrolled_count();
```

### 트리거가 작동하지 않는 경우

```sql
-- 트리거 설치 확인
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'enrollments';

-- manage_enrolled_count_trigger가 없다면 001 파일 재실행
```

### Storage 버킷이 없는 경우

Supabase Dashboard에서 수동 생성:
1. **Storage** 메뉴
2. **New bucket** 클릭
3. 버킷 생성:
   - `course-materials` (Public, 50MB)
   - `assignment-submissions` (Private, 20MB)

## 📚 추가 문서

- `supabase/old_migrations/`: 기존 마이그레이션 백업
- `scripts/`: 디버깅 및 유틸리티 스크립트
- 프로젝트 루트의 `CLAUDE.md`: 전체 프로젝트 가이드

## 🤝 기여 가이드

새로운 마이그레이션 추가 시:
1. 파일명: `012_feature_name.sql` (다음 번호 사용)
2. 파일 상단에 목적과 내용 주석 추가
3. 의존성이 있는 경우 주석에 명시
4. README.md의 표에 추가
5. 테스트 후 커밋

---

**Last Updated**: 2024-12-22
**Database Version**: PostgreSQL 15 (Supabase)
**Migration Count**: 11 files
