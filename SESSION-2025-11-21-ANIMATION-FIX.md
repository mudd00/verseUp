# 캐릭터 애니메이션 T-pose 문제 해결 세션 (2025-11-21)

## 문제 상황

### 초기 증상
- **가만히 있을 때**: 걷는 애니메이션 재생 (잘못됨)
- **WASD 이동 시**: T-pose 표시 (잘못됨)
- 기존 `character_anim.glb` (492KB): Blender로 병합한 통합 파일 사용 중

### 원인 분석
1. Blender 병합 시 애니메이션 이름이 `Armature`와 `Armature.001`로 분리됨
2. 서로 다른 본 이름을 타겟하여 블렌딩 실패
3. 애니메이션 순서/매핑 문제
4. 이전 T-pose가 포함된 Standing Idle.fbx 사용

---

## 시도한 해결 방법들

### 1단계: 애니메이션 매핑 조정
**시도:**
- 초기화 시간 조정: 0.05초 → 0.2초 → 1.0초
- 애니메이션 인덱스 반대로 매핑
- crossFade 시간 증가: 0.12초 → 0.3초

**결과:** ❌ 문제 지속

### 2단계: 애니메이션 트랙 리타게팅
**시도:**
```typescript
// "Armature.001" → "Armature"로 트랙 이름 통일
track.name.replace(/Armature\.001/g, 'Armature')
```

**결과:** ❌ 문제 지속 (근본 원인 아님)

### 3단계: 명시적 가중치 제어
**시도:**
- `setEffectiveWeight(1)` 명시적 설정
- 초기화 시 `mixer.update(0.016)` 추가
- 가중치 로그 추가

**결과:** ❌ 이동 시는 정상, 정지 시 T-pose

### 4단계: 새로운 Standing Idle.fbx 교체
**작업:**
1. 사용자가 T-pose 없는 새 Standing Idle.fbx 제공 (17:31)
2. Blender 스크립트 재실행:
   ```bash
   blender --background --python scripts/convert_fbx_to_glb.py
   ```
3. gltf-transform 최적화:
   ```bash
   npx @gltf-transform/cli optimize character_anim.glb character_anim_opt.glb \
     --compress meshopt --texture-compress webp
   ```
4. 결과: 30.81MB → 503KB

**결과:** ❌ 여전히 T-pose (통합 GLB 파일 자체에 문제)

---

## 최종 해결 방법

### 결정: GLB 통합 파일 버리기
**문제 인식:**
- Blender 병합 과정에서 발생한 문제를 코드로 해결할 수 없음
- 원본 FBX 파일에는 T-pose가 없음
- 병합 파일(`character_anim.glb`) 자체가 문제

**최종 구조:**
```typescript
// Walking.fbx: 메시/스킨 + 걷기 애니메이션
const walkFbx = useLoader(FBXLoader, '/models/Walking.fbx')

// Standing Idle.fbx: 정지 애니메이션만
const idleFbx = useLoader(FBXLoader, '/models/Standing Idle.fbx')

// Walking에서 메시 복제
const model = useMemo(() =>
  SkeletonUtils.clone(walkFbx) as THREE.Group,
  [walkFbx]
)

// 두 애니메이션 병합
const clips = useMemo(() =>
  [...idleFbx.animations, ...walkFbx.animations].filter(Boolean),
  [idleFbx, walkFbx]
)
```

### 핵심 개선 사항

#### 1. 메시 소스 변경
- **이전**: `SkeletonUtils.clone(idleFbx)` (Idle에서 복제)
- **최종**: `SkeletonUtils.clone(walkFbx)` (Walking에서 복제)
- **이유**: Walking.fbx가 with skin, Standing Idle.fbx는 애니메이션만

#### 2. pickAction 헬퍼 함수
```typescript
const pickAction = (preferred: string[], keyword: string) => {
  if (!actions) return undefined
  // 1. 명시된 이름 우선 탐색
  for (const name of preferred) {
    if (name && actions[name]) return actions[name]
  }
  // 2. 키워드 포함 검색
  const entry = Object.entries(actions).find(([key]) =>
    key.toLowerCase().includes(keyword.toLowerCase())
  )
  return entry ? entry[1] : undefined
}
```

#### 3. 스케일 조정
- **GLB 버전**: 0.5
- **FBX 버전**: 0.5 (기존 0.01에서 변경)
- **이유**: FBX도 GLB와 동일한 스케일 사용

#### 4. 애니메이션 전환
- **방식**: `crossFadeTo` 사용
- **시간**: 0.15초
- **가중치**: 명시적으로 1로 설정

---

## 최종 파일 구조

### 삭제된 파일
```
❌ public/models/character_anim.glb (492KB, 병합 파일)
❌ public/models/character_anim_backup.glb (30MB, 백업)
```

### 사용 중인 파일
```
✅ public/models/Standing Idle.fbx (29MB, 새 파일 - T-pose 없음)
✅ public/models/Walking.fbx (29MB, 원본)
```

### CharacterModel.tsx 최종 구조 (128줄)
```typescript
// 주요 기능
1. FBXLoader로 두 파일 개별 로드
2. SkeletonUtils.clone()로 메시 복제 (Walking 기준)
3. 두 애니메이션 클립 병합
4. pickAction 헬퍼로 유연한 액션 검색
5. crossFadeTo로 부드러운 전환 (0.15초)
6. 초기화 시 T-pose 최소화 (time = 1/60)
```

---

## 작업 타임라인

| 시간 | 작업 내용 |
|------|-----------|
| 초기 | GLB 통합 파일 사용, T-pose 문제 발견 |
| 14:00-15:00 | 애니메이션 매핑/트랙 리타게팅 시도 |
| 15:00-16:00 | 가중치 제어 및 초기화 로직 개선 |
| 16:00-17:00 | 스켈레톤 구조 분석, 디버그 강화 |
| 17:31 | 새로운 Standing Idle.fbx 파일 교체 |
| 17:35 | Blender 재병합 (29.38MB → 503KB 최적화) |
| 17:40 | GLB 방식 포기, FBX 직접 로드 방식으로 전환 |
| 최종 | CharacterModel.tsx 완전 재작성 완료 |

---

## 학습한 내용

### 1. Blender 병합의 한계
- FBX → GLB 병합 시 Armature 이름 충돌 발생 가능
- 서로 다른 본 이름(`Armature` vs `Armature.001`)으로 블렌딩 실패
- 코드 레벨에서 리타게팅으로 해결하려 했으나 근본적 해결 안 됨

### 2. Three.js 애니메이션 패턴
- `SkeletonUtils.clone()` 필수 (원본 보호)
- FBX는 애니메이션만 있어도 로드 가능 (without skin)
- `useAnimations`에 여러 클립 동시 전달 가능
- `crossFadeTo`가 `fadeIn/fadeOut`보다 부드러운 전환

### 3. FBX vs GLB
**FBX 장점:**
- 원본 애니메이션 보존
- 개별 파일로 유연한 관리
- Mixamo 원본 그대로 사용

**FBX 단점:**
- 파일 크기 큼 (각 29MB)
- 로딩 시간 증가
- 두 번의 HTTP 요청 필요

**GLB 장점:**
- 압축 효율 높음 (503KB)
- 단일 파일로 빠른 로딩
- 웹 최적화

**GLB 단점:**
- 병합 과정에서 문제 발생 가능
- 디버깅 어려움
- 재생성 필요 시 Blender 재실행

---

## 다음 작업 제안

### 1. 성능 최적화
- [ ] FBX → GLB 변환 시 Blender 스크립트 개선
  - Armature 이름 통일 로직 추가
  - 중복 메시 자동 제거 강화
- [ ] GLB 사용으로 재전환 (파일 크기 개선)

### 2. 애니메이션 확장
- [ ] 점프 애니메이션 추가
- [ ] 달리기 애니메이션 추가
- [ ] 공격/상호작용 애니메이션

### 3. 코드 개선
- [ ] 애니메이션 프리로딩 추가
- [ ] 로딩 폴백 UI 개선
- [ ] 애니메이션 전환 커스터마이징 (페이드 시간 조정)

---

## 참고 파일

### 프로젝트 파일
- `src/components/metaverse/CharacterModel.tsx` - 최종 애니메이션 컴포넌트
- `src/components/metaverse/Player.tsx` - isMoving prop 전달
- `public/models/Standing Idle.fbx` - 정지 애니메이션 (새 파일)
- `public/models/Walking.fbx` - 걷기 애니메이션 + 메시

### 스크립트
- `scripts/convert_fbx_to_glb.py` - Blender 병합 스크립트
- `scripts/OPTIMIZATION_README.md` - 최적화 가이드

### 문서
- `CLAUDE.md` - 프로젝트 가이드라인
- `CHARACTER_GUIDE.md` - 캐릭터 모델 가이드
- `SESSION-2025-11-21-CONTINUED-P2.md` - 이전 세션 기록

---

## 결론

T-pose 문제는 **Blender 병합 과정의 구조적 문제**였으며, 코드 레벨에서 완전히 해결할 수 없었습니다. 최종적으로 **원본 FBX 파일을 직접 사용**하는 방식으로 전환하여 문제를 근본적으로 해결했습니다.

**트레이드오프:**
- ✅ 애니메이션 정상 작동 (T-pose 완전 제거)
- ✅ 원본 품질 유지
- ✅ 코드 단순화
- ❌ 파일 크기 증가 (492KB → 58MB)
- ❌ 로딩 시간 증가

향후 성능 최적화가 필요할 경우, Blender 스크립트를 개선하여 올바른 GLB 병합을 다시 시도할 수 있습니다.
