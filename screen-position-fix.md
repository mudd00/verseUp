# 스크린 위치 수정 작업 기록

## 작업 일시
2025-12-04

## 문제점

### 1. 스크린 회전 문제
- 스크린이 뒤쪽을 향하고 있어서 화면이 보이지 않음
- 회전값: `[0, Math.PI, 0]` (180도 회전)

### 2. 스크린 위치 문제
- 스크린이 교탁에 너무 가까워서 (Z: -30) 공중에 떠있는 것처럼 보임
- 실제 칠판 요소(VERDE_GRANDE_StingrayPBS7_0)의 위치를 사용하지 않음

## 해결 방법

### 1단계: 스크린 회전 수정
**파일**: `src/components/metaverse/Screen.jsx`

```jsx
// 변경 전
<mesh ref={meshRef} position={position} rotation={[0, Math.PI, 0]}>

// 변경 후
<mesh ref={meshRef} position={position} rotation={[0, 0, 0]}>
```

**결과**: 스크린이 이제 정면을 향함

---

### 2단계: 3D 모델에서 칠판 요소 자동 감지

#### 2-1. MapModel.jsx 수정

**파일**: `src/components/metaverse/MapModel.jsx`

1. **상태 추가** (line 57):
```jsx
const [screenPosition, setScreenPosition] = useState(null)
```

2. **Props에 콜백 추가** (line 52):
```jsx
function MapModelContent({
  currentMap,
  onMapChange,
  onPortalNearChange,
  onDoorNearChange,
  onObjectNearChange,
  onScreenPositionChange  // 추가
})
```

3. **칠판 요소 감지 로직 추가** (line 111-124):
```jsx
// 스크린 요소 찾기 (칠판)
else if (child.name === 'VERDE_GRANDE_StingrayPBS7_0') {
  const worldPos = new THREE.Vector3()
  child.getWorldPosition(worldPos)
  // 스크린 위치를 저장 (나중에 스케일 적용)
  foundObjects.push({
    name: child.name,
    position: [worldPos.x, worldPos.y, worldPos.z],
    objectId: 'screen',
    type: 'screen',
    isScreen: true, // 스크린임을 표시
  })
  console.log(`📺 스크린 요소 발견:`, child.name, worldPos)
}
```

4. **스크린 위치 추출 및 스케일 적용** (line 184-192):
```jsx
// 스크린 위치 추출 및 전달
const screenObj = foundObjects.find(obj => obj.isScreen)
if (screenObj) {
  setScreenPosition(screenObj.position)
  console.log(`📺 스크린 최종 위치:`, screenObj.position)
}

// 스크린 제외하고 상호작용 객체만 저장
setInteractiveObjects(foundObjects.filter(obj => !obj.isScreen))
```

5. **스크린 위치 콜백 호출** (line 198-203):
```jsx
// 스크린 위치가 변경되면 콜백 호출
useEffect(() => {
  if (screenPosition && onScreenPositionChange) {
    onScreenPositionChange(screenPosition)
  }
}, [screenPosition, onScreenPositionChange])
```

6. **export 함수에 props 추가** (line 296):
```jsx
export default function MapModel({
  currentMap,
  onMapChange,
  onPortalNearChange,
  onDoorNearChange,
  onObjectNearChange,
  onScreenPositionChange  // 추가
})
```

---

#### 2-2. MetaverseScene.jsx 수정

**파일**: `src/components/metaverse/MetaverseScene.jsx`

1. **스크린 위치 상태 추가** (line 24):
```jsx
const [screenPosition, setScreenPosition] = useState(null) // 스크린 위치
```

2. **스크린 위치 콜백 핸들러 추가** (line 81-84):
```jsx
const handleScreenPositionChange = useCallback((position) => {
  setScreenPosition(position)
  console.log('📺 스크린 위치 업데이트:', position)
}, [])
```

3. **MapModel에 콜백 전달** (line 202):
```jsx
<MapModel
  currentMap={currentMap}
  onMapChange={handleMapChange}
  onPortalNearChange={handlePortalNearChange}
  onDoorNearChange={handleDoorNearChange}
  onObjectNearChange={handleObjectNearChange}
  onScreenPositionChange={handleScreenPositionChange}  // 추가
/>
```

4. **Screen 컴포넌트에 동적 위치 전달** (line 216-222):
```jsx
{currentMap === 'school' && screenPosition && (
  <Screen
    position={screenPosition}
    size={[8, 4.5]}
    videoStream={screenStream}
  />
)}
```

---

#### 2-3. Screen.jsx 수정

**파일**: `src/components/metaverse/Screen.jsx`

1. **기본 위치 제거** (line 4):
```jsx
// 변경 전
export default function Screen({ position = [-52, 3.5, -31.5], size = [8, 4.5], videoStream })

// 변경 후
export default function Screen({ position, size = [8, 4.5], videoStream })
```

**이유**: 이제 position은 항상 MapModel에서 동적으로 전달되므로 기본값 불필요

---

## 작업 흐름

```
1. classroom.glb 모델 로드
   ↓
2. MapModel이 모델을 순회하며 VERDE_GRANDE_StingrayPBS7_0 요소 찾기
   ↓
3. 요소의 월드 좌표(world position) 추출
   ↓
4. 모델 스케일 및 Y축 오프셋 적용
   ↓
5. 최종 위치를 MetaverseScene으로 콜백 전달
   ↓
6. Screen 컴포넌트에 실제 칠판 위치 전달
   ↓
7. 화면 공유 시 비디오가 정확한 위치의 3D 메쉬에 표시됨
```

---

## 기술적 세부사항

### 좌표 변환 과정
1. **로컬 좌표 → 월드 좌표**
   ```jsx
   const worldPos = new THREE.Vector3()
   child.getWorldPosition(worldPos)
   ```

2. **스케일 적용**
   ```jsx
   obj.position[0] *= appliedScale
   obj.position[1] = obj.position[1] * appliedScale + yOffset
   obj.position[2] *= appliedScale
   ```

### 콜백 패턴
- MapModel → MetaverseScene 방향으로 데이터 전달
- `useCallback`을 사용하여 불필요한 리렌더링 방지
- `useEffect`로 상태 변경 감지 및 콜백 호출

---

## 결과

### 변경 전
- ❌ 스크린이 뒤를 향함 (rotation: `[0, Math.PI, 0]`)
- ❌ 하드코딩된 위치 `[-52, 3, -30]` 사용
- ❌ 실제 칠판 요소와 위치 불일치
- ❌ 화면이 이상한 곳에 떠있음

### 변경 후
- ✅ 스크린이 정면을 향함 (rotation: `[0, 0, 0]`)
- ✅ 3D 모델의 실제 칠판 요소(VERDE_GRANDE_StingrayPBS7_0) 위치 자동 감지
- ✅ 스케일 및 오프셋 자동 적용
- ✅ 칠판이 있는 정확한 위치에 스크린 배치
- ✅ 화면 공유 시 학생들이 보기 좋은 위치에 표시

---

## 화면 공유 기능 상태

### 정상 작동 중
- ✅ 교탁에 서면 "화면 공유 시작" 버튼 표시
- ✅ `navigator.mediaDevices.getDisplayMedia()` 정상 작동
- ✅ VideoTexture로 3D 메쉬에 스트림 표시
- ✅ 스트림 종료 시 자동으로 상태 업데이트

### 사용 방법
1. 메타버스 진입
2. 학교 맵의 교실로 이동
3. 교탁 위치에서 F키로 "교탁에 서기" 상호작용
4. 우측 상단의 "화면 공유 시작" 버튼 클릭
5. 브라우저의 화면 공유 선택 창에서 공유할 화면/창 선택
6. 교실 앞 칠판에 선택한 화면이 실시간으로 표시됨

---

## 디버깅 로그

### 콘솔에서 확인 가능한 로그
```
📺 스크린 요소 발견: VERDE_GRANDE_StingrayPBS7_0 Vector3 {x: ..., y: ..., z: ...}
📺 스크린 최종 위치: [x, y, z] (스케일 적용 후)
📺 스크린 위치 업데이트: [x, y, z]
📺 화면 공유 시작
📺 화면 공유 종료
```

---

## 추가 개선 가능 사항

1. **스크린 크기 자동 조정**
   - 칠판 요소의 실제 크기(bounding box)를 측정하여 스크린 크기 자동 설정

2. **다중 교실 지원**
   - 교실 2에도 별도의 스크린 배치
   - 각 교실마다 독립적인 화면 공유 세션

3. **스크린 테두리 효과**
   - 칠판 프레임처럼 보이도록 테두리 추가
   - 화면 공유 중일 때 빛나는 효과

4. **네트워크 동기화**
   - Socket.IO로 다른 사용자들에게 화면 공유 전송
   - WebRTC를 통한 실시간 스트리밍

---

## 관련 파일

- `src/components/metaverse/Screen.jsx` - 스크린 메쉬 컴포넌트
- `src/components/metaverse/MapModel.jsx` - 3D 모델 로드 및 요소 감지
- `src/components/metaverse/MetaverseScene.jsx` - 씬 구성 및 상태 관리
- `public/models/classroom.glb` - 교실 3D 모델 (VERDE_GRANDE 요소 포함)

---

## 참고사항

### VERDE_GRANDE_StingrayPBS7_0 요소
- 교실 3D 모델의 칠판/스크린 영역을 나타내는 메쉬
- 색상: 녹색 (Verde = 스페인어로 녹색)
- 크기: 대형 (Grande = 스페인어로 큰)
- Stingray PBS 재질 사용

### 좌표계
- X축: 좌(-) / 우(+)
- Y축: 아래(-) / 위(+)
- Z축: 뒤(-) / 앞(+)
