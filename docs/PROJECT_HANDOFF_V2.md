# VerseUp! 2차 프로젝트 핸드오프 가이드

> 1차 프로젝트에서 배운 것들과 2차 프로젝트를 위한 기술적 가이드

---

## 1. 프로젝트 개요

### 핵심 가치
**"편하게 놀고 소통하는 웹 메타버스 학습 플랫폼"**

### 기술 스택
| 영역 | 기술 |
|------|------|
| Frontend | React 19, Vite 6, Tailwind CSS, Zustand, TanStack Query |
| 3D | Three.js, React Three Fiber, Rapier (물리 엔진) |
| Backend | Express 5, Socket.IO 4, Supabase (PostgreSQL + Auth) |
| 실시간 | WebRTC (화면 공유), Socket.IO (시그널링/이벤트) |

---

## 2. 완성된 기능 목록

### ✅ 완전히 작동하는 기능
- 회원가입/로그인 (Supabase Auth, JWT)
- 역할 기반 접근 제어 (학생/강사/관리자)
- 강의 CRUD, 수강 신청/취소
- Toss Payments 결제 연동
- 알림 시스템 (8가지 타입)
- 과제 CRUD (생성/제출/채점)
- 3D 메타버스 (캐릭터 이동, 물리, 카메라)
- WebRTC 화면 공유 (강사 → 학생)
- 학생 책상 모니터 (화면 공유 수신)
- V키 1인칭/3인칭 시야 전환
- 판서 컨트롤러 → 칠판 동기화 (기본)

### 🚧 부분 구현 (개선 필요)
- 판서 기능 (위/아래 잘림, 비율 왜곡)
- 출석 체크 (DB만 존재)
- 실시간 채팅 (구조만)

### ❌ 미구현
- WebRTC 음성/영상 채팅
- 아바타 커스터마이즈
- 스터디룸/나만의 방
- 녹화/VOD
- AI 튜터

---

## 3. 알려진 이슈 및 해결 방향

### 3.1 판서 기능 UV 문제

**증상:**
- 컨트롤러에서 그린 내용이 칠판에서 위/아래 잘림
- 원이 타원으로 왜곡

**원인 (확정):**
```
칠판 메시 UV 범위:
  U: 0.502 ~ 0.759 (25.7% 사용)  ← 문제!
  V: 0.010 ~ 0.991 (98.1% 사용)

Texture 270도 회전 후:
  가로: 98.1% 표시 (정상)
  세로: 25.7%만 표시 (위/아래 74.3% 잘림)
```

**해결 방향:**
1. **단기**: `texture.repeat/offset` 보정 (복잡)
2. **장기 (권장)**: Blender에서 칠판 메시 UV 리매핑 (0~1 전체 사용)

**관련 파일:**
- `src/components/metaverse/Blackboard.jsx`
- `src/components/metaverse/MapModel.jsx` (UV 측정 코드 포함)

### 3.2 3D 모델 축 문제

**칠판 메시 크기 측정 결과:**
```
가로(X) = 0.23
세로(Y) = 10.23
깊이(Z) = 40.43

실제 칠판 표면 = Z축 x Y축 (비정상적 배치)
```

**2차 프로젝트 권장:**
- Blender에서 모델링 시 표준 축 사용 (X=가로, Y=세로)
- 또는 UV를 0~1 전체 범위로 매핑

---

## 4. 핵심 코드 패턴

### 4.1 3D 애니메이션 (필수)

```javascript
// ❌ 금지: 순서 보장 안 됨
const action = Object.values(actions)[0]

// ✅ 권장: 이름으로 찾기
const idleAction = actions['Idle']
const walkAction = actions['Walk'] || actions.Walking

// 애니메이션 전환
idleAction?.reset().fadeIn(0.2).play()
walkAction?.reset().fadeOut(0.2).stop()
```

### 4.2 물리 설정 (고정값)

```javascript
// Player.jsx
const PLAYER_SETTINGS = {
  startPosition: [0, 2, 0],
  capsule: {
    halfHeight: 0.8,
    radius: 0.52,
    yOffset: 1.28
  },
  speed: {
    walk: 8,
    run: 18,
    stepUp: 4
  }
}
```

### 4.3 Socket.IO 이벤트 구조

```javascript
// 판서
whiteboard:start, whiteboard:stop
whiteboard:draw, whiteboard:clear, whiteboard:cleared

// 화면 공유
screenshare:start, screenshare:stop
screenshare:offer, screenshare:answer, screenshare:ice-candidate

// 음성 채팅
voice:start, voice:stop
voice:offer, voice:answer, voice:ice-candidate

// 일반
user:join, room:join, room:leave
chat:message, player:position
```

### 4.4 API 에러 방지

```javascript
// 환경 변수 검증
if (!supabase) {
  return res.status(503).json({ error: 'Database unavailable' })
}

// Null 안전성
const role = user?.user_metadata?.role || 'student'

// 모든 async 라우트에 try-catch
app.get('/api/data', async (req, res) => {
  try {
    // ...
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

---

## 5. 디렉토리 구조

```
src/
├── components/
│   ├── layout/          # Header, Layout
│   ├── metaverse/       # 3D 컴포넌트 ⭐
│   │   ├── Player.jsx           # 플레이어 물리/이동
│   │   ├── CharacterModel.jsx   # 캐릭터 모델/애니메이션
│   │   ├── ThirdPersonCamera.jsx # 카메라 (1인칭/3인칭)
│   │   ├── MapModel.jsx         # 맵 로딩/콜라이더
│   │   ├── Blackboard.jsx       # 판서 칠판
│   │   ├── DeskMonitor.jsx      # 학생 모니터
│   │   └── MetaverseScene.jsx   # 메인 씬
│   ├── dashboard/       # 대시보드
│   └── course/          # 강의 관련
├── pages/               # 페이지 컴포넌트
├── stores/              # Zustand 스토어
├── services/            # API, Socket 클라이언트
├── hooks/               # 커스텀 훅 ⭐
│   ├── useScreenShare.js    # 화면 공유 (강사)
│   ├── useScreenReceive.js  # 화면 수신 (학생)
│   ├── useStudentScreen.js  # 학생 모니터
│   └── useVoiceChat.js      # 음성 채팅
├── lib/                 # 라이브러리 초기화
└── utils/               # 유틸리티

server/
├── routes/              # API 라우트
├── middleware/          # Express 미들웨어
├── sockets/             # Socket.IO 핸들러 ⭐
└── utils/               # 서버 유틸리티

public/
└── models/              # 3D 모델 (GLB, GLTF)
```

---

## 6. 개발 명령어

```bash
# 개발 서버 (권장)
npm run dev:both          # 프론트 + 백엔드 동시

# 개별 실행
npm run dev               # 프론트만 (5173)
npm run dev:server        # 백엔드만 (3000)

# 빌드 & 배포
npm run build
npm start

# 코드 품질
npm run lint
npm run format
```

---

## 7. 2차 프로젝트 권장 사항

### 7.1 처음부터 해야 할 것

1. **3D 모델 UV 매핑**
   - Blender에서 모든 인터랙티브 표면(칠판, 모니터 등)의 UV를 0~1 전체로 설정
   - 표준 축 사용 (X=가로, Y=세로, Z=깊이)

2. **TypeScript 도입**
   - 현재: JavaScript + JSDoc
   - 권장: TypeScript로 시작

3. **테스트 코드**
   - Vitest (유닛), Playwright (E2E)
   - 커버리지 80% 목표

### 7.2 재사용 가능한 코드

| 기능 | 파일 | 재사용성 |
|------|------|----------|
| 플레이어 물리 | Player.jsx | ⭐⭐⭐ 그대로 사용 |
| 캐릭터 애니메이션 | CharacterModel.jsx | ⭐⭐⭐ 그대로 사용 |
| 카메라 시스템 | ThirdPersonCamera.jsx | ⭐⭐⭐ 그대로 사용 |
| 화면 공유 훅 | useScreenShare.js | ⭐⭐ 참고 |
| Socket 이벤트 | server/sockets/index.js | ⭐⭐ 구조 참고 |
| 판서 컨트롤러 | WhiteboardController.jsx | ⭐ 개선 필요 |
| 칠판 | Blackboard.jsx | ⭐ UV 수정 후 사용 |

### 7.3 피해야 할 실수

1. **애니메이션 액션 인덱스 접근** → 이름으로 접근
2. **물리 설정 변경** → 검증된 값 유지
3. **Canvas 크기만 변경** → UV 문제는 해결 안 됨
4. **환경 변수 검증 누락** → 500 에러 발생
5. **FBX 직접 사용** → GLB로 변환 필요

---

## 8. 성능 최적화 팁

### 8.1 3D 최적화
- 모델 파일 50MB 이하 유지
- LOD (Level of Detail) 적용
- 인스턴싱 활용 (같은 오브젝트 다수)
- 물리 콜라이더 단순화

### 8.2 네트워크 최적화
- 위치 동기화: 100ms 간격
- 불필요한 이벤트 최소화
- WebRTC: 화질 적응형 조절

### 8.3 렌더링 최적화
- React.memo 활용
- useMemo/useCallback 적절히 사용
- 3D 씬 분리 (Canvas 외부는 일반 React)

---

## 9. 참고 문서

| 문서 | 내용 |
|------|------|
| CLAUDE.md | 프로젝트 규칙, 개발 컨벤션 |
| plan.md | 전체 프로젝트 계획 |
| docs/progress.md | 진행 상황 |
| docs/IMPROVEMENT_ROADMAP.md | 개선 로드맵 |
| CHARACTER_GUIDE.md | 캐릭터 모델 설정 |
| BLENDER_EXPORT_GUIDE.md | 3D 모델 내보내기 |
| WEBRTC_SCREEN_SHARE.md | 화면 공유 구현 |

---

## 10. 빠른 시작 체크리스트

### 2차 프로젝트 시작 시:

- [ ] 이 문서 전체 읽기
- [ ] CLAUDE.md 규칙 숙지
- [ ] 환경 변수 설정 (.env.example 참고)
- [ ] `npm install` 후 `npm run dev:both`
- [ ] /metaverse 접속하여 3D 테스트
- [ ] 기존 코드 구조 파악

### 판서 기능 개선 시:

- [ ] Blender에서 칠판 메시 열기
- [ ] UV Editor에서 UV를 0~1 전체로 리매핑
- [ ] GLB 재내보내기
- [ ] Blackboard.jsx에서 texture.rotation 제거 테스트
- [ ] 정상 작동 확인

---

**작성일:** 2024-12-22
**작성자:** Claude (1차 프로젝트 협업)
**상태:** 1차 프로젝트 완료, 2차 핸드오프 준비
