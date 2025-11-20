VerseUp! 프로젝트 계획 보고서
작성일: 2025-11-15
프로젝트명: VerseUp! – 편하게 놀고 소통하는 웹 메타버스 학습 플랫폼
1. 프로젝트 개요
1.1 사용자 선택 시나리오
코로나19 이후 비대면 교육 수요가 폭발적으로 늘어나면서 기존 화상 강의 중심의 학습 모델은 몰입감과 상호작용 부족이라는 한계에 직면했습니다. 학습자들은 집이나 원격지에서도 실제 캠퍼스처럼 동료와 소통하고, 강사와 실시간으로 피드백을 주고받으며, 과제·자료·출결을 하나의 공간에서 처리할 수 있는 환경을 원합니다. VerseUp!은 이러한 요구를 메타버스 공간, 아바타 기반 상호작용, WebRTC 실시간 스트리밍, 협업 위젯으로 결합해 “왜 이 플랫폼을 선택해야 하는가”에 대한 명확한 답을 제공합니다.
1.2 프로젝트 목적
VerseUp!은 다음 네 가지 핵심 목적을 달성하기 위해 설계되었습니다.
•	고객 편의성 극대화: 온라인 주문/참여 시스템과 GPS 기반 주변 공간 추천, 실시간 세션 추적을 통해 언제 어디서나 편하게 학습/참여 가능하도록 지원
•	강사 운영 효율 향상: 자동화된 커리큘럼 관리, 재고(콘텐츠) 관리, 실시간 알림으로 강사의 수업 준비 및 진행 시간을 단축
•	관리자·운영 본사 통합 관리: 전체 세션/사용자 네트워크를 모니터링하고 정책·콘텐츠 배포를 중앙집중식으로 수행
•	비즈니스 프로세스 디지털화: 출결·과제·결제·알림을 시스템화하여 데이터 기반 의사결정과 확장 가능한 메타버스 학습 모델을 구현
1.3 개발 배경 및 문제 정의
원격 학습이 보편화되었지만, 기존 화상 강의는 실제 공간감과 상호작용이 부족합니다. 아바타 동기화, 실시간 음성/영상, 협업 도구를 결합한 학습 공간이 필요합니다.
1.4 타깃 사용자 및 시장 분석
•	예비 개발자 및 주니어 엔지니어: 실습형 커리큘럼과 실시간 피드백 필요
•	현직 강사 및 교육 기관: 대규모 동시 접속과 몰입형 강의 환경 요구
•	기업/커뮤니티 스터디 모임: 공동 작업 공간과 커스터마이즈된 룸 필요
1.5 프로젝트 범위(MVP)
•	데스크톱 브라우저 기반 React 웹 클라이언트
•	실시간 강의/스터디룸(음성/영상/채팅/손들기) + 아바타 커스터마이즈
•	강사/학생/관리자별 핵심 기능 및 일정/알림
•	PostgreSQL 기반 핵심 데이터 엔터티와 인증(OAuth + 이메일)
1.6 기대 효과
•	학습 몰입 및 참여도 향상: 메타버스 공간과 실시간 협업 기능 제공
•	운영 효율성 증대: 강사 도구, 출결/과제 자동화, 녹화/VOD 관리
•	글로벌 확장 기반 확보: i18n과 클라우드 인프라 설계로 다국가 사용자 수용
2. 요구사항 분석
2.1 기능 요구사항(FR)
역할별 핵심 기능은 다음과 같습니다.
강사
•	강의/세션 CRUD, 템플릿 기반 커리큘럼 구성, 일정 및 참여 조건 설정
•	실시간 강의 제어: 참석자 목록, 음성/영상/화면 공유, 손들기 관리
•	과제 등록·채점, 출결 수정, 녹화/VOD 발행 및 피드백 열람
학생
•	강의 탐색·검색, 수강 신청/취소, 개인화 추천
•	실시간 강의/스터디룸 참여: 장비 체크, 손들기, 채팅, 음성/영상, 이모션
•	아바타 커스터마이즈, 나만의 방, 출석 체크 및 변경 요청
•	VOD/자료 열람, 과제 제출, 일정/알림/추천 관리
관리자
•	사용자·역할 관리, 강사 승인, 신고/공지 처리
•	시스템 모니터링(WebRTC/TURN 상태, QoS 지표)
•	상점·아이템·이벤트 관리(커스터마이즈 아이템 판매 대비)
2.2 비기능 요구사항(NFR)
•	Latency: 실시간 음성/영상 왕복 300ms 이하, 텍스트/상태 150ms 이하
•	Concurrency: 세션당 50명, 플랫폼 동시 접속 500명 이상 확장 가능
•	Availability: 주요 서비스 99.5%+, TURN/WebRTC 노드 페일오버 구성
•	Security: HTTPS, JWT, OAuth 안전 저장, AES-256 at rest, DDoS/Rate-limit, 관리자 2FA
•	Accessibility: WCAG 2.1 AA, 실시간 자막/텍스트 대체, 키보드 내비게이션 지원
•	Localization: 기본 한국어, 영어 병행, i18n 리소스 관리 및 알림 언어 분기
•	Observability/Compliance: 요청·세션·QoS 로그 중앙화, SLA 모니터링, GDPR/개인정보보호법 기준에 맞춘 데이터 수명 주기 관리
2.3 유즈케이스(User Flow)
신규 사용자 여정, 학생 라이브 참여, 강사 세션 관리, 스터디룸/나만의 방, 관리자 운영 플로우를 정의하여 화면별 CTA, 권한, 상태 전이를 문서화합니다. 각 플로우는 장비 체크 → 입장 규칙 → 실시간 협업 → 종료 후 피드백까지 명확한 상태 다이어그램을 제공합니다.
2.4 서비스 시나리오(사용자 흐름)
•	신규 사용자: 랜딩 → 가입/로그인 → 온보딩 → 대시보드 진입
•	학생 라이브: 알림/캘린더 → 세션 상세 → 장비 체크 → 로비 → 라이브룸 → 종료 요약
•	강사 운영: 콘솔 → 템플릿 선택 → 일정 설정 → 리허설 → 제어 패널 → 녹화 발행
•	스터디룸/나만의 방: 룸 선택 → 즉시 입장 → 협업 위젯 → 아이템/아바타 꾸미기
•	관리자: 대시보드 → 사용자/강의/신고 → 상태 변경 → 시스템 상태 → 경보 전파
3. 시스템 아키텍처 설계
3.1 전체 구조
React SPA 클라이언트와 Node.js 기반 API/실시간 서비스, Socket.IO 시그널링, WebRTC 미디어 경로, PostgreSQL/Redis/S3 계층으로 구성된 3-tier 구조를 설계합니다.
•	경량 SPA + 모듈형 UI: React 19 + Vite로 빠른 로딩, Code-splitting 적용
•	Stateless API + 실시간 계층: REST/GraphQL, Socket.IO, JWT 인증, Redis 캐시
•	데이터/스토리지: PostgreSQL 17, Redis, 오브젝트 스토리지(S3 호환)로 구분된 책임
•	Infra/보안: Cloudflare/WAF, Terraform IaC, GitHub Actions CI/CD, 비밀 관리(Vault/Secrets Manager)
3.2 오디오/영상 스트리밍 구조(WebRTC)
•	P2P 우선 전략, 필요 시 SFU(ion-sfu) 도입으로 다자간 품질 유지
•	TURN 서버(coturn) 다중 지역 배치 및 Geo DNS
•	QoS 테레메트리 수집과 실시간 상태 대시보드 제공
3.3 서버 구성도
Signaling 서버(Socket.IO), REST/GraphQL API, Auth 서비스, File Proxy, TURN 서버를 Render/Railway 및 전용 VM에 배치하고 Terraform으로 IaC 관리합니다.
3.4 DB 및 API 구조
PostgreSQL 17 기반 핵심 엔터티(User, Session 등)와 Redis 캐시, S3 호환 스토리지를 결합하며, GraphQL/REST API로 노출합니다.
•	API 버전 관리 및 스키마 문서화(OpenAPI/GraphQL SDL)
•	CQRS 패턴 일부 적용: 읽기 API는 캐싱·리플리카 활용, 쓰기 API는 ACID 트랜잭션 보장
•	파일/녹화 자산은 S3 버킷에 저장하고 서명 URL로 접근 통제
3.5 주요 기술 스택
•	Frontend: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Headless UI
•	State: Zustand, TanStack Query, React Hook Form
•	Backend: Node.js(Express/Nest), Socket.IO, Supabase Auth/JWT, python/openpyxl(문서 자동화)
•	Infra: Render/Railway, GitHub Actions, Terraform, Cloudflare/WAF
4. 데이터베이스 설계
•	User ↔ Role/Permission / OAuthProfile / AvatarState 1:1 관계
•	Course-Lesson-LiveSession 계층 + ScheduleSlot, TurnServerCredential, Recording
•	Enrollment/SessionAttendance/AttendanceStatus 히스토리
•	ContentAsset-Lesson/Assignment 연결, Submission-Feedback, QuizQuestion/Answer
•	ChatRoom-ChatMessage, Notification-DeliveryStatus, RealtimePresence
•	SubscriptionPlan-UserSubscription, PaymentTransaction, SystemMetrics(Time-series)
•	Analytics: SessionMetrics, FeatureUsage, ErrorLog 테이블로 행동 데이터 축적, Privacy-safe export
5. 화면(UI/UX) 설계
5.1 정보 구조도(IA)
주요 내비게이션은 랜딩, 강의, 실시간 공간, 스터디룸, 자료실, 커스터마이즈, 관리자 콘솔로 구성되며 접근성 기준에 맞춘 계층 구조를 유지합니다. 키보드 탭 순서·명확한 ARIA 레이블·명도 대비 4.5:1 이상을 기본으로 합니다.
5.2 와이어프레임(Figma)
모든 화면은 Figma 기반 컴포넌트 시스템으로 작성하며 CTA 1개, 진행 상태, 자주 쓰는 행동 단축 버튼을 포함합니다. 프리젠테이션·튜토리얼·디자인 토큰(색상/타이포/간격)을 공유 라이브러리로 관리합니다.
5.3 주요 화면 설명
•	랜딩/온보딩: 가치 제안, 데모 영상, 가입 플로우, 아바타 초기 설정
•	대시보드: 캘린더, 추천 세션, 출석 위젯, 최근 활동 요약
•	실시간 강의 공간: AV 패널, 채팅, 손들기, 협업 보드, 강사 제어 패널
•	강사용 콘솔: 커리큘럼 템플릿, 일정/참여 조건, 리허설 모드, 녹화 관리
•	스터디룸/나만의 방: 룸 목록, 즉시 입장, 아이템 슬롯, 커스터마이즈 패널
6. 구현 계획
6.1 MVP 버전 구현 범위
실시간 강의/스터디룸, 기본 아바타, 과제·자료·알림, 관리자 콘솔, WebRTC/TURN 모니터링 최소 기능까지 포함합니다.
•	클라이언트: 대시보드, 강의 상세, 실시간 룸, 스터디룸 베타, 커스터마이즈 기본 슬롯
•	백엔드: 사용자/세션/콘텐츠 API, 실시간 시그널링, 녹화 메타 관리, 알림 서비스
•	운영: 관리자 콘솔 v1, QoS 모니터링, Slack 알림 웹훅, 기본 결제/구독 훅
•	문서화: OpenAPI/GraphQL 스키마, 운영 Runbook, 장애 대응 체크리스트
6.2 개발 일정(간트 차트)
총 5주 로드맵: Week1~Week5 집중 개발
스프린트	기간	주요 산출물
Week 1	1주	UX 리서치, 정보 구조, 디자인 시스템, 환경 세팅, WebRTC/인증 스파이크
Week 2	1주	온보딩/대시보드, 강의 리스트/상세, 수강 신청, 이메일 로그인, 기본 알림, 관리자 CRUD
Week 3	1주	실시간 강의 MVP(로비/장비 체크/스트림/채팅/손들기), 강사용 콘솔, 녹화 메타데이터
Week 4	1주	과제/자료 공유, 출결, 알림센터, 스터디룸 베타, 관리자 WebRTC/TURN 모니터링
Week 5	1주	성능/보안/로그/접근성 점검, 분석 대시보드, QA 및 배포 준비
6.3 기능별 개발 우선순위(Roadmap)
•	우선순위 A: 가입/로그인, 대시보드, 강의 리스트/상세, 기본 알림
•	우선순위 B: 실시간 강의 MVP, 강사용 콘솔, 녹화 메타데이터, 출결/과제
•	우선순위 C: 스터디룸, 나만의 방, 커스터마이즈, 관리자 모니터링, 분석 대시보드
6.4 테스트 계획(오디오 딜레이 검증)
•	오디오/비디오 지연 측정 및 장비 체크 자동화
•	실시간 세션 부하 테스트 및 TURN 장애 시나리오
•	접근성/국제화 확인, E2E 학습 플로우 검증
7. 시스템 운영 계획
7.1 서버 환경 및 배포 구조
앱/API는 Render 또는 Railway에 배포하고, 시그널링·TURN 서버는 전용 VM에 Terraform으로 구성하여 지역별로 확장 가능하게 설계합니다.
7.2 장애/지연 대응 전략
•	PaaS 헬스체크 + Pingdom/Upptime 외부 모니터링
•	PostgreSQL 스냅샷 및 PITR, TURN/시그널링 블루그린 배포
•	Redis, 오브젝트 스토리지 백업 자동화 및 복구 훈련
7.3 보안 및 개인정보 관리
•	HTTPS 전 구간 적용, JWT/OAuth 비밀 관리, 관리자 2FA
•	Row Level Security와 최소 권한 원칙, DLP+RBAC 정책
•	개인정보 최소 수집, 삭제 요청 즉시 처리, 백업 90일 보관
7.4 로그/모니터링 체계
•	OpenTelemetry 기반 트레이싱, Grafana Cloud/New Relic 대시보드
•	WebRTC QoS Exporter, Slack/Email 경보, Metabase/Superset 지표
•	접근/오류 로그 12개월, QoS 로그 6개월 보관
8. 성과 및 향후 고도화 계획
8.1 기능 확장 계획
•	글로벌 언어 지원 확대 및 지역별 TURN 증설
•	실시간 공동 코딩/화이트보드, AI 튜터, 커스텀 아바타 마켓
•	기업/교육 기관용 커스텀 도메인, 인증 연동
8.2 수익 모델(구독/프리미엄)
•	무료 체험 → Pro/Team/Enterprise 구독 모델
•	기관 라이선스와 사용량 기반 과금
•	아바타 아이템, 브랜디드 룸 등 인앱 결제
8.3 장기 로드맵
B2B 파트너와의 공동 커리큘럼, 국제 부트캠프, 커뮤니티 이벤트 개최를 통해 사용자 저변을 확대하고, 확장 가능한 멀티 메타버스 허브로 성장합니다.
9. 프로젝트 관리
9.1 협업 도구
•	GitHub (코드), Linear/Jira (이슈·로드맵), Notion (문서), Slack/Discord (커뮤니케이션)
•	Partner Portal 및 공유 캘린더로 외부 이해관계자 소통
9.2 정보 공유
•	주간 스탠드업, 스프린트 리뷰/회고, 월간 운영위원회
•	파트너 OKR 대시보드, 보안 문서 DLP+RBAC 적용, Incident Report 템플릿
9.3 리스크 관리
•	Notion Risk Register, Incident Commander 체계, SLA 위반 대응 플랜
•	정기 DR 리허설, 취약점 스캔(Snyk/Dependabot), 감사 로그 검토
10. 결론 및 요청 사항
VerseUp!은 메타버스 기반 실시간 학습 경험을 통해 차별화된 가치를 제공하고, 확장 가능한 아키텍처와 운영 계획을 갖추었습니다. 본 문서를 기반으로 와이어프레임, ERD, 시스템 다이어그램 등 상세 산출물 제작과 MVP 개발을 진행합니다.
