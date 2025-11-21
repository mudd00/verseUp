#!/usr/bin/env python3
"""
FBX → GLB 자동 변환 스크립트
Blender에서 실행하여 Walking.fbx + Standing Idle.fbx를
하나의 GLB 파일로 병합합니다.

사용법:
    blender --background --python scripts/convert_fbx_to_glb.py
"""

import bpy
import sys
import os

print("=" * 60)
print("FBX → GLB 변환 시작...")
print("=" * 60)

# 기존 객체 모두 삭제
print("\n[1/5] 기존 객체 삭제 중...")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
print("✅ 기존 객체 삭제 완료")

# Walking.fbx 가져오기 (메시 + 애니메이션)
print("\n[2/5] Walking.fbx 가져오기 중...")
walking_path = os.path.join("public", "models", "Walking.fbx")
if not os.path.exists(walking_path):
    print(f"❌ 오류: {walking_path} 파일을 찾을 수 없습니다.")
    sys.exit(1)

bpy.ops.import_scene.fbx(
    filepath=walking_path,
    automatic_bone_orientation=True,
    use_anim=True
)
print(f"✅ Walking.fbx 가져오기 완료")

# Standing Idle.fbx 가져오기 (애니메이션만)
print("\n[3/5] Standing Idle.fbx 가져오기 중...")
idle_path = os.path.join("public", "models", "Standing Idle.fbx")
if not os.path.exists(idle_path):
    print(f"❌ 오류: {idle_path} 파일을 찾을 수 없습니다.")
    sys.exit(1)

# 현재 메시 개수 기록
meshes_before = len([obj for obj in bpy.data.objects if obj.type == 'MESH'])

bpy.ops.import_scene.fbx(
    filepath=idle_path,
    automatic_bone_orientation=True,
    use_anim=True
)
print(f"✅ Standing Idle.fbx 가져오기 완료")

# 중복 메시 제거 (Idle에서 가져온 메시)
print("\n[4/5] 중복 메시 정리 중...")
all_meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
meshes_after = len(all_meshes)

if meshes_after > meshes_before:
    # Idle에서 가져온 메시 삭제 (나중에 가져온 것)
    idle_meshes = all_meshes[meshes_before:]
    for mesh in idle_meshes:
        print(f"  - 삭제: {mesh.name}")
        bpy.data.objects.remove(mesh, do_unlink=True)
    print(f"✅ {len(idle_meshes)}개 중복 메시 삭제 완료")
else:
    print("✅ 중복 메시 없음")

# 애니메이션 확인
print("\n애니메이션 확인:")
if bpy.data.actions:
    for i, action in enumerate(bpy.data.actions):
        print(f"  {i+1}. {action.name} ({len(action.fcurves)} curves)")
else:
    print("  ⚠️ 경고: 애니메이션이 없습니다!")

# GLB로 내보내기
print("\n[5/5] GLB로 내보내기 중...")
output_path = os.path.join("public", "models", "character_anim.glb")

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    # 포함할 객체
    use_selection=False,  # 모든 객체
    export_cameras=False,
    export_lights=False,
    # 변환
    export_yup=True,
    export_apply=True,
    # 지오메트리
    export_texcoords=True,
    export_normals=True,
    export_tangents=True,
    # 애니메이션
    export_animations=True,
    export_frame_range=False,
    export_force_sampling=True,
    export_current_frame=False,
    export_skins=True,
    export_morph=True,
    export_morph_normal=True,
    export_morph_tangent=True,
    # 압축
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
    export_draco_generic_quantization=12,
)

# 파일 크기 확인
if os.path.exists(output_path):
    file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
    print(f"✅ GLB 내보내기 완료!")
    print(f"📁 파일: {output_path}")
    print(f"📊 크기: {file_size:.2f} MB")
else:
    print(f"❌ 오류: {output_path} 파일 생성 실패")
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ 변환 완료!")
print("=" * 60)
print("\n다음 단계:")
print("1. public/models/character_anim.glb 파일 확인")
print("2. (선택) 추가 최적화 실행:")
print("   npx @gltf-transform/cli optimize character_anim.glb character_final.glb --compress meshopt")
print("\n")

sys.exit(0)
