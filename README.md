# verseUp! 🎓

> **메타버스 기반 교육 플랫폼** - 3D 가상 교실에서 실시간으로 함께 배우는 새로운 교육 경험

## 📖 프로젝트 소개

verseUp!은 교수자와 학생들이 메타버스 공간에서 실시간으로 수업을 진행할 수 있는 혁신적인 교육 플랫폼입니다. 3D 가상 교실, 실시간 화면 공유, 비디오/오디오 통신을 통해 물리적 거리를 넘어선 몰입형 학습 환경을 제공합니다.

### ✨ 주요 기능

- 🏫 **3D 메타버스 교실**: Three.js 기반의 몰입형 3D 가상 교실 환경
- 👥 **실시간 멀티플레이어**: 교수자와 다수의 학생이 동시에 참여 가능
- 🖥️ **화면 공유**: 교수자의 화면을 학생들의 메타버스 공간에 실시간 렌더링
- 🎥 **비디오/오디오 통신**: WebRTC 기반의 P2P 실시간 통신
- 💬 **실시간 채팅**: Socket.io를 통한 즉각적인 메시지 교환
- 🎮 **아바타 컨트롤**: 자유로운 캐릭터 이동 및 상호작용

## 🛠️ 기술 스택

### Frontend (client/)
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **3D Engine**: Three.js + React Three Fiber + Drei
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Real-time Communication**: WebRTC (simple-peer)

### Backend (server/)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Socket.io (시그널링 서버)
- **Authentication**: Supabase Auth
- **Environment**: dotenv

## 📂 프로젝트 구조

```
verseUp/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── App.tsx        # 랜딩페이지
│   │   ├── index.css      # Tailwind CSS 설정
│   │   └── main.tsx       # 앱 진입점
│   ├── package.json
│   └── vite.config.ts
│
├── server/                 # Express 백엔드
│   ├── src/
│   │   └── index.js       # 서버 메인 파일
│   ├── .env.example       # 환경 변수 예시
│   └── package.json
│
└── README.md              # 프로젝트 문서
```

## 🚀 시작하기

### 사전 요구사항

- Node.js 18.x 이상
- npm 또는 yarn
- Supabase 계정 (데이터베이스용)

### 설치 방법

1. **저장소 클론**
```bash
git clone <repository-url>
cd verseUp
```

2. **클라이언트 설정**
```bash
cd client
npm install
```

3. **서버 설정**
```bash
cd ../server
npm install
cp .env.example .env
# .env 파일을 편집하여 환경 변수 설정
```

### 환경 변수 설정

`server/.env` 파일에 다음 정보를 입력하세요:

```env
PORT=3000
CLIENT_URL=http://localhost:5173
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### 개발 서버 실행

**터미널 1 - 클라이언트 실행:**
```bash
cd client
npm run dev
```
→ http://localhost:5173 에서 접속

**터미널 2 - 서버 실행:**
```bash
cd server
npm run dev
```
→ http://localhost:3000 에서 API 실행

## 📚 개발 로드맵

### ✅ Phase 1: 기본 인프라 (완료)
- [x] 프로젝트 구조 생성
- [x] React + Vite 클라이언트 설정
- [x] Express.js 서버 설정
- [x] Tailwind CSS 스타일링
- [x] 랜딩페이지 제작
- [x] Socket.io 통신 기본 구조

### 🔄 Phase 2: 메타버스 교실 (진행 예정)
- [ ] Three.js 3D 교실 환경 구축
- [ ] 아바타 시스템 구현
- [ ] 카메라 컨트롤 및 시점 전환
- [ ] 캐릭터 이동 시스템

### 📋 Phase 3: 실시간 통신 (계획)
- [ ] WebRTC 시그널링 서버 구축
- [ ] Peer-to-Peer 비디오/오디오 연결
- [ ] 화면 공유 기능 구현
- [ ] 3D 공간에 화면 렌더링

### 🎓 Phase 4: 수업 기능 (계획)
- [ ] Supabase 인증 시스템
- [ ] 교수자/학생 역할 관리
- [ ] 수업 생성 및 참여
- [ ] 채팅 시스템 고도화
- [ ] 손들기 및 발표 기능

### 🌟 Phase 5: 추가 기능 (계획)
- [ ] 수업 녹화 및 다시보기
- [ ] 화이트보드 기능
- [ ] 파일 공유
- [ ] 출석 체크 시스템

## 🎨 랜딩페이지

프로젝트의 첫 인상을 책임지는 현대적이고 인터랙티브한 랜딩페이지가 완성되었습니다:

- **보라색 그라디언트 배경**: 인디고 → 퍼플 → 인디고의 부드러운 그라디언트
- **3D 유사 일러스트레이션**: CSS로 구현된 깊이감 있는 UI 요소들
- **애니메이션 효과**: Float, Pulse 등의 부드러운 애니메이션
- **반응형 디자인**: 모든 디바이스에서 완벽한 표시
- **인터랙티브 요소**: 호버 효과와 트랜지션

## 🤝 기여하기

기여를 환영합니다! 다음 절차를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📧 연락처

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

---

**verseUp!** - 메타버스에서 시작하는 새로운 교육의 미래 🚀