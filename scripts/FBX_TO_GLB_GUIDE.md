# FBX → GLB 변환 가이드

## 🎯 목표
- Walking.fbx (29MB, with skin) + Standing Idle.fbx (0.6MB, animation only)
- → character_anim.glb (예상 3-5MB, 모든 애니메이션 포함)

---

## 방법 1: Blender 사용 (권장 ⭐)

### 단계 1: Blender 열기 및 준비
1. Blender 실행
2. 기본 큐브 선택 → `X` → Delete

### 단계 2: Walking.fbx 가져오기
1. **File** → **Import** → **FBX** (`.fbx`)
2. `public/models/Walking.fbx` 선택
3. Import 설정:
   - ✅ **Import Normals**: Auto
   - ✅ **Automatic Bone Orientation**: ✅
   - ✅ **Animation**: ✅
4. **Import FBX** 클릭

### 단계 3: Standing Idle.fbx 가져오기
1. **File** → **Import** → **FBX**
2. `public/models/Standing Idle.fbx` 선택
3. Import 설정:
   - ⚠️ **중요**: 메시가 이미 있으므로 애니메이션만 가져옴
   - Scene 탭에서 중복 메시 삭제 (Idle에서 온 메시)
4. **Import FBX** 클릭

### 단계 4: 애니메이션 확인
1. **Dope Sheet** → **Action Editor**로 전환
2. 두 개의 애니메이션이 있는지 확인:
   - `Walking` (또는 `mixamorig|Walking`)
   - `Standing Idle` (또는 `mixamorig|Idle`)

### 단계 5: GLB로 내보내기
1. **File** → **Export** → **glTF 2.0** (`.glb`)
2. Export 설정:
   - **Format**: `GLB (binary)`
   - **Include**:
     - ✅ **Selected Objects** (전체 선택)
     - ✅ **Cameras**: ❌
     - ✅ **Punctual Lights**: ❌
   - **Transform**:
     - Apply Modifiers: ✅
     - Y Up: ✅
   - **Geometry**:
     - ✅ **Apply Modifiers**
     - ✅ **UVs**
     - ✅ **Normals**
     - ✅ **Tangents**
     - ✅ **Vertex Colors**
   - **Animation**:
     - ✅ **Animation**: ✅
     - ✅ **Limit to Playback Range**: ❌
     - ✅ **Sampling Rate**: 30
     - ✅ **Always Sample Animations**: ✅
     - ✅ **Group by NLA Track**: ❌
     - ✅ **Skinning**: ✅
     - ✅ **Bake Skinning Constraints**: ✅
     - ✅ **Shape Keys**: ✅
     - ✅ **Shape Key Normals**: ✅
     - ✅ **Shape Key Tangents**: ✅
   - **Compression**:
     - ✅ **Draco Mesh Compression**: ✅
     - Compression level: `6` (균형)
     - Quantization:
       - Position: `14`
       - Normal: `10`
       - Texcoord: `12`
       - Color: `10`
       - Generic: `12`
3. **파일명**: `character_anim.glb`
4. **위치**: `public/models/`
5. **Export glTF 2.0** 클릭

---

## 방법 2: Blender Python 스크립트 (자동화)

```python
# scripts/convert_fbx_to_glb.py
import bpy
import sys

# 기존 객체 삭제
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Walking.fbx 가져오기
bpy.ops.import_scene.fbx(filepath="public/models/Walking.fbx")

# Standing Idle.fbx 가져오기
bpy.ops.import_scene.fbx(filepath="public/models/Standing Idle.fbx")

# 중복 메시 제거 (Idle에서 온 메시)
for obj in bpy.data.objects:
    if "Idle" in obj.name and obj.type == 'MESH':
        bpy.data.objects.remove(obj, do_unlink=True)

# GLB로 내보내기
bpy.ops.export_scene.gltf(
    filepath="public/models/character_anim.glb",
    export_format='GLB',
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
    export_animations=True,
    export_force_sampling=True
)

print("✅ character_anim.glb 생성 완료!")
sys.exit(0)
```

**실행 방법**:
```bash
blender --background --python scripts/convert_fbx_to_glb.py
```

---

## 단계 6: 추가 최적화 (선택사항)

Blender에서 내보낸 GLB를 추가로 최적화:

```bash
cd public/models

npx -y @gltf-transform/cli optimize character_anim.glb character_final.glb \
  --compress meshopt \
  --texture-compress webp

# 결과 확인
ls -lh character_final.glb
```

---

## 🎯 예상 결과

| 단계 | 파일 | 크기 |
|------|------|------|
| 원본 | Walking.fbx + Idle.fbx | 29.1 MB |
| Blender 내보내기 | character_anim.glb | ~8-12 MB |
| 추가 최적화 | character_final.glb | **3-5 MB** ✅ |

---

## ✅ 체크리스트

- [ ] Blender 설치 확인
- [ ] Walking.fbx 가져오기
- [ ] Standing Idle.fbx 가져오기
- [ ] 애니메이션 확인 (2개 있어야 함)
- [ ] GLB로 내보내기 (Draco 압축 활성화)
- [ ] `public/models/character_anim.glb` 생성 확인
- [ ] 추가 최적화 실행 (선택)
- [ ] 파일 크기 확인 (3-5MB 목표)

---

## 🔧 문제 해결

### 애니메이션이 하나만 보임
→ NLA Editor에서 확인하거나, Action Editor에서 수동으로 전환

### 메시가 중복됨
→ Outliner에서 중복 메시 삭제 (Idle.fbx에서 온 메시)

### 스켈레톤이 다름 오류
→ 동일한 Mixamo 캐릭터로 다운로드했는지 확인

### GLB 파일이 너무 큼
→ Draco 압축 레벨을 높이거나 (6 → 10), 텍스처 해상도 감소
