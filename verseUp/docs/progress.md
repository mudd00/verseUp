# VerseUp 문서화 진행 현황

## 1. 프로젝트 개요
- **핵심 가치**: 메타버스 공간에서 프로그래밍 학습/활동을 집에서도 편리하게 제공.
- **타깃**: 프로그래밍을 공부하려는 모든 연령층, 특히 개발자/지망생.
- **플랫폼**: 데스크톱 웹 브라우저(React 프런트엔드) 우선.
- **상호작용 수준**: 실시간 음성/영상/아바타 동기화가 가능한 양방향 수업 경험.

## 2. 기술 및 인프라 방향
- **프런트엔드**: React.
- **백엔드**: Node.js 기반 API/실시간 서비스.
- **실시간 통신**: WebRTC(미디어/데이터) + Socket.IO(시그널링/일반 이벤트).
- **DB**: PostgreSQL.
- **인증**: 자체 이메일/비밀번호 + OAuth(Google, GitHub).
- **콘텐츠 저장**: 초기 로컬 파일, 이후 외부 스토리지나 동영상 플랫폼으로 이전 계획.
- **배포 후보**: Render 또는 Railway (백엔드/DB). TURN 서버는 추후 별도 VM(coturn) 고려.
- **환경 이식성 메모**: 외부 머신에서도 python/openpyxl 설치, Node/React/DB 접근 정보만 새로 설정하면 문서 업데이트 가능.

## 3. 기능 요구사항 (역할별)
### 강사
1. 강의/세션 CRUD 및 일정·참여 조건 설정.
2. 실시간 강의 제어(참석자 관리, 음성/영상/채팅, 화면 공유).
3. 과제 등록·채점, 출결 확인 및 수정 처리.
4. 녹화/VOD 관리, 학습 진척·피드백 확인.

### 학생
1. 강의 탐색/검색, 수강 신청/취소.
2. 실시간 강의/스터디룸 참여, 손들기·채팅·음성/영상.
3. 아바타 커스터마이즈, 나만의 방, 출석 체크 및 변경 요청.
4. VOD/자료 열람, 과제 제출, 알림/일정/추천 관리.

### 관리자
1. 사용자/역할 관리, 강사 승인, 신고/공지 처리.
2. 시스템 모니터링(WebRTC/TURN 상태 포함).
3. 상점·아이템 관리(향후 커스터마이징 판매 대비).

## 4. 비기능 요구사항
- **Latency**: AV 왕복 ≤300ms, 텍스트/상태 ≤150ms.
- **Concurrency**: 세션당 50명, 플랫폼 동시 500명까지 확장 가능 설계.
- **Availability**: 핵심 서비스 99.5% 이상, TURN/WebRTC 노드 페일오버.
- **Security**: HTTPS, JWT, OAuth 안전 저장, AES-256 at rest, DDoS/Rate-limit, 관리자 2FA.
- **Scalability**: Stateless API 수평 확장, 실시간 룸 샤딩, Postgres read replica 고려.
- **Observability**: 요청/에러 로그 중앙화, QoS 모니터링, Slack/Email 알림.
- **Compliance/Privacy**: 동의 기반 수집, 녹화 보관·삭제 정책, 로그 1년 보관.
- **Accessibility**: WCAG 2.1 AA, 실시간 자막/텍스트 대체, 키보드 내비게이션.
- **Localization**: ko 기본, en 병행; i18n 리소스 관리, 알림/콘텐츠 언어 분기 가능 구조.

## 5. 데이터 엔터티(현재 포함)
User, Session, Course, Lesson, LiveSession, Recording/VOD, ContentAsset, Assignment/Quiz, Progress, CalendarEvent, ChatMessage, AvatarState, RealtimePresence, Notification, Payment/Subscription(향후), Feedback, SystemMetrics, TurnServerCredential.

> 제외 예정: CodeCollabDocument, CodeReviewComment (팀 프로젝트 기능 도입 시 재검토).

## 6. 화면/경험 구성 초안
- 랜딩·온보딩, 대시보드, 강의 리스트/상세, 실시간 강의 공간, VOD/자료 뷰어, 강사용 콘솔, 스터디룸 로비, 나만의 방 & 아바타 커스터마이즈.

## 7. 다음 단계 제안
1. 화면별 유저 플로우 및 와이어프레임 정의.
2. 시스템 아키텍처(웹/시그널링/TURN/DB) 다이어그램 구체화.
3. ERD 및 핵심 스키마 초안 작성.
4. MVP 기능 우선순위·로드맵(스프린트) 수립.
