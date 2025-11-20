# 캐릭터 모델 추가 가이드

현재 프로젝트에는 기본 캐릭터(박스로 만든 사람 형태)가 구현되어 있습니다.
실제 3D 캐릭터 모델을 사용하려면 아래 가이드를 따르세요.

## 무료 캐릭터 모델 다운로드

### 옵션 1: Mixamo (추천) ⭐
https://www.mixamo.com

1. **Adobe 계정으로 로그인** (무료)
2. **Characters 탭**에서 캐릭터 선택
3. **Download** 버튼 클릭
4. 설정:
   ```
   Format: FBX (.fbx) 또는 Collada (.dae)
   Pose: T-Pose
   ```
5. 다운로드 후 블렌더로 변환 필요

### 옵션 2: Ready Player Me
https://readyplayer.me/

1. **아바타 생성** (무료, 빠름)
2. **GLB 형식으로 다운로드**
3. 바로 사용 가능!

### 옵션 3: Quaternius
https://quaternius.com/packs/ultimatemodularcharacters.html

- 무료 로우폴리 캐릭터
- GLB 형식 지원
- 상업적 사용 가능

---

## 블렌더에서 FBX를 GLB로 변환

Mixamo에서 FBX 파일을 다운로드한 경우:

1. **블렌더 열기**
2. **File → Import → FBX (.fbx)**
3. 다운로드한 FBX 파일 선택
4. **File → Export → glTF 2.0 (.glb/.gltf)**
5. 설정:
   ```
   Format: glTF Binary (.glb)
   Include:
     ✅ Selected Objects
   Transform:
     ✅ +Y Up
   Geometry:
     ✅ Apply Modifiers
     ✅ UVs
     ✅ Normals
   Materials:
     ✅ Materials
   ```
6. **파일명을 `character.glb`로 저장**

---

## 캐릭터 파일 배치

변환/다운로드한 `character.glb` 파일을 다음 경로에 복사:
```
verseUp/public/models/character.glb
```

---

## 캐릭터 크기 조정

캐릭터가 너무 크거나 작으면 `CharacterModel.tsx` 파일 수정:

```typescript
// 모델 스케일 조정
scene.scale.set(0.5, 0.5, 0.5)  // 0.5 = 50% 크기
```

또는 블렌더에서:
1. 캐릭터 선택
2. `S` 키 → 스케일 조정
3. 다시 GLB로 내보내기

---

## 애니메이션 추가 (선택사항)

### Mixamo 애니메이션 다운로드

1. Mixamo에서 **Animations 탭**
2. 걷기, 달리기, 점프 등 선택
3. **Download**:
   ```
   Format: FBX
   Skin: With Skin (캐릭터와 함께)
   ```
4. 블렌더에서 GLB로 변환

### React Three Fiber에서 애니메이션 사용

```typescript
import { useAnimations, useGLTF } from '@react-three/drei'

const { scene, animations } = useGLTF('/models/character.glb')
const { actions } = useAnimations(animations, scene)

// 걷기 애니메이션 재생
actions['Walk']?.play()
```

---

## 현재 구현된 기능

✅ **이동**: WASD / 방향키
✅ **점프**: Space
✅ **3인칭 카메라**: 캐릭터를 따라다님
✅ **캐릭터 회전**: 이동 방향으로 자동 회전
✅ **물리**: 중력, 충돌 처리
✅ **그림자**: 캐릭터 그림자 표시

---

## 테스트

1. 프론트엔드 서버 실행:
   ```bash
   cd verseUp
   npm run dev
   ```

2. 메타버스 페이지 접속:
   ```
   http://localhost:5173/metaverse
   ```

3. WASD로 이동, Space로 점프!

---

## 문제 해결

### 캐릭터가 안 보이는 경우
1. `character.glb` 파일이 `public/models/` 폴더에 있는지 확인
2. 브라우저 콘솔(F12) 확인
3. 파일 크기가 너무 크면(>10MB) 압축 필요

### 캐릭터가 너무 크거나 작은 경우
- `CharacterModel.tsx`에서 `scene.scale.set()` 조정

### 캐릭터가 바닥을 뚫고 떨어지는 경우
- `Player.tsx`에서 `position` 값 높이기: `position={[0, 5, 0]}`

### 애니메이션이 안 되는 경우
- GLB 파일에 애니메이션이 포함되어 있는지 확인
- 블렌더에서 Animation 옵션 활성화 후 다시 내보내기

---

## 고급: 멀티 애니메이션

걷기, 달리기, 점프 등 여러 애니메이션을 사용하려면:

1. Mixamo에서 각 애니메이션 다운로드
2. 블렌더에서 하나의 파일로 합치기
3. React Three Fiber에서 상태에 따라 애니메이션 전환

```typescript
// 이동 중이면 걷기, 멈춰있으면 Idle
if (isMoving) {
  actions['Walk']?.play()
  actions['Idle']?.stop()
} else {
  actions['Idle']?.play()
  actions['Walk']?.stop()
}
```

---

## 추천 캐릭터 팩

### 무료
- Mixamo Characters (다양한 캐릭터)
- Ready Player Me (커스터마이즈 가능)
- Quaternius Ultimate Characters (로우폴리)

### 유료 (고품질)
- Sketchfab (다양한 스타일)
- Unity Asset Store (리깅 완료)
- CGTrader (전문 모델)

---

기본 캐릭터로도 충분히 테스트할 수 있지만,
실제 3D 모델을 사용하면 훨씬 멋진 메타버스를 만들 수 있습니다! 🎮
