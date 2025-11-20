# 블렌더 맵을 웹용으로 내보내기 가이드

## 1. 블렌더에서 GLB 파일로 내보내기

### 단계 1: 블렌더에서 map.blend 열기
1. 블렌더를 실행합니다
2. `블렌더 파일/map.blend` 파일을 엽니다

### 단계 2: 모델 최적화 (선택사항)
1. **불필요한 오브젝트 삭제**: 보이지 않거나 필요 없는 오브젝트 제거
2. **폴리곤 수 줄이기**: 너무 복잡한 모델은 Decimate 모디파이어 사용
3. **텍스처 최적화**: 텍스처 크기를 적절히 조정 (보통 2048x2048 이하)

### 단계 3: GLB로 내보내기
1. **File → Export → glTF 2.0 (.glb/.gltf)** 선택
2. 내보내기 설정:
   ```
   Format: glTF Binary (.glb)  ← 중요!
   Include:
     ✅ Selected Objects (선택한 오브젝트만) 또는
     ✅ Visible Objects (보이는 오브젝트만)

   Transform:
     ✅ +Y Up (Y축을 위로)

   Geometry:
     ✅ Apply Modifiers (모디파이어 적용)
     ✅ UVs (UV 맵핑)
     ✅ Normals (노말)
     ✅ Vertex Colors (버텍스 컬러, 있는 경우)

   Materials:
     ✅ Materials (재질)
     ✅ Images (텍스처 이미지)

   Compression:
     ✅ Compress (압축 - 파일 크기 줄이기)
   ```

3. **파일명을 `map.glb`로 저장**

### 단계 4: 파일 배치
내보낸 `map.glb` 파일을 다음 경로에 복사:
```
verseUp/public/models/map.glb
```

폴더가 없다면 생성:
```bash
mkdir verseUp/public/models
```

## 2. 모델 테스트

### 온라인 뷰어로 미리보기
내보낸 GLB 파일을 다음 사이트에서 확인:
- https://gltf-viewer.donmccurdy.com/
- https://sandbox.babylonjs.com/

파일을 드래그 앤 드롭하여 웹에서 제대로 보이는지 확인합니다.

## 3. 프로젝트에서 확인

### 메타버스 페이지 접속
1. 프론트엔드 서버 실행 확인:
   ```bash
   cd verseUp
   npm run dev
   ```

2. 브라우저에서 메타버스 페이지 접속:
   ```
   http://localhost:5173/metaverse
   ```

3. 맵이 로드되는지 확인
   - 맵이 없으면 기본 바닥(녹색 평면)이 표시됩니다
   - `map.glb`가 있으면 블렌더에서 만든 맵이 로드됩니다

## 4. 문제 해결

### 맵이 보이지 않는 경우
1. **파일 경로 확인**:
   - `verseUp/public/models/map.glb` 경로가 맞는지 확인
   - 파일명이 정확히 `map.glb`인지 확인 (대소문자 구분)

2. **브라우저 콘솔 확인**:
   - F12를 눌러 개발자 도구 열기
   - Console 탭에서 에러 메시지 확인

3. **모델 크기 확인**:
   - 블렌더에서 모델 크기가 너무 크거나 작으면 안 보일 수 있음
   - 적절한 스케일로 조정 (보통 10~100 유닛 정도)

4. **파일 크기 확인**:
   - GLB 파일이 너무 크면 (>50MB) 로딩이 느려질 수 있음
   - 압축 옵션을 켜고 다시 내보내기

### 텍스처가 안 보이는 경우
1. 블렌더에서 **재질을 Principled BSDF**로 설정
2. 텍스처 이미지가 **임베드(Embedded)**되었는지 확인
3. **내보내기 시 Materials와 Images 옵션 활성화**

## 5. 고급 설정

### 물리 충돌 설정
맵의 일부분만 충돌 처리하려면:
1. 블렌더에서 충돌용 오브젝트에 **`_collision`** 접미사 추가
2. MapModel.tsx에서 커스텀 충돌 로직 구현

### 애니메이션 추가
맵에 애니메이션이 있는 경우:
1. 블렌더에서 **Animation 옵션 활성화**
2. React Three Fiber의 `useAnimations` 훅 사용

### 라이트맵 베이킹
성능 향상을 위해 라이트맵 베이킹:
1. 블렌더에서 라이트 베이킹
2. GLB 내보내기 시 베이크된 텍스처 포함

## 참고 자료

- glTF 공식 문서: https://www.khronos.org/gltf/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- Drei (3D 헬퍼): https://github.com/pmndrs/drei
