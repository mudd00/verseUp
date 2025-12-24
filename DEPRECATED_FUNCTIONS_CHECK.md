# Deprecated 함수 사용 여부 확인 보고서

## 🔍 검사 대상 함수

다음 3개의 함수가 deprecated로 표시되었으며, 사용 여부를 확인했습니다:

1. `courseService.uploadMaterial()` - src/services/courseService.js
2. `uploadCourseMaterial()` - src/services/uploadService.js
3. `deleteFile()` - src/services/uploadService.js

## ✅ 검사 결과: 모두 안전

### 1. courseService.uploadMaterial()
- **검색 패턴**: `courseService.uploadMaterial(`, `.uploadMaterial(`
- **결과**: ❌ 사용하는 코드 없음
- **상태**: 안전하게 deprecated 처리 가능

### 2. uploadCourseMaterial()
- **검색 패턴**: `uploadCourseMaterial(`, `import { uploadCourseMaterial`
- **결과**: ❌ 사용하는 코드 없음
- **상태**: 안전하게 deprecated 처리 가능

### 3. deleteFile()
- **검색 패턴**: `deleteFile(`, `import { deleteFile`
- **결과**: ❌ 사용하는 코드 없음
- **상태**: 안전하게 deprecated 처리 가능

## 📊 상세 분석

### 강의 자료 업로드 기능

**CourseMaterials.jsx** (src/components/course/CourseMaterials.jsx)
- ✅ 이미 백엔드 API를 직접 사용 중
- 74-80행: `apiService.request('/courses/${courseId}/materials/upload')`
- deprecated 함수를 사용하지 않음

**CourseMaterialsUpload.jsx** (src/components/course/CourseMaterialsUpload.jsx)
- ✅ 단순히 form 데이터를 부모 컴포넌트로 전달
- 실제 업로드는 부모 컴포넌트에서 백엔드 API로 처리
- deprecated 함수를 사용하지 않음

### 파일 삭제 기능

**CourseMaterials.jsx** (src/components/course/CourseMaterials.jsx)
- ✅ 이미 백엔드 API를 직접 사용 중
- 110행: `apiService.delete('/courses/${courseId}/materials/${materialId}')`
- deprecated 함수를 사용하지 않음

### 과제 파일 업로드 기능

**AssignmentDetail.jsx** (src/pages/AssignmentDetail.jsx)
- ✅ `uploadAssignmentFile()` 사용 (이 함수는 백엔드 API로 변경됨, deprecated 아님)
- 6행: `import { uploadAssignmentFile, formatFileSize } from '@/services/uploadService'`

## 🎯 결론

**모든 deprecated 함수는 어디에서도 사용되지 않습니다.**

현재 코드베이스는 이미 백엔드 API를 직접 호출하도록 완전히 마이그레이션되었으며, deprecated로 표시된 함수들은 안전하게 에러를 throw하도록 설정되어 있습니다.

### 안전성 확인

- ✅ 빌드 시 에러 없음 (사용하는 코드가 없으므로)
- ✅ 런타임 에러 없음 (호출되지 않으므로)
- ✅ 향후 실수로 사용 시 명확한 에러 메시지 제공

### Deprecated 함수의 역할

이 함수들은 현재 다음과 같은 역할을 합니다:
1. **문서화**: JSDoc 주석으로 대체 방법 안내
2. **가이드**: 에러 메시지로 올바른 사용 방법 안내
3. **방어**: 실수로 사용하는 것을 방지

## 📝 권장사항

### 현재 상태 유지 (권장)
deprecated 함수들을 그대로 유지하면서:
- 새로운 개발자가 실수로 사용하는 것을 방지
- 명확한 에러 메시지로 올바른 방법 안내
- 코드 히스토리 보존

### 대안: 완전 제거
원한다면 다음 함수들을 완전히 삭제할 수 있습니다:
- `courseService.uploadMaterial()`
- `uploadCourseMaterial()`
- `deleteFile()`

하지만 현재 상태(deprecated + 에러 throw)가 더 안전하고 개발자 친화적입니다.

## 🔧 검증 명령어

직접 확인하고 싶다면 다음 명령어를 실행하세요:

```bash
# courseService.uploadMaterial 사용 검색
grep -r "courseService\.uploadMaterial\|\.uploadMaterial(" src/

# uploadCourseMaterial 사용 검색
grep -r "uploadCourseMaterial(" src/

# deleteFile 사용 검색
grep -r "deleteFile(" src/

# import 문 검색
grep -r "import.*uploadCourseMaterial\|import.*deleteFile" src/
```

모두 결과 없음(No matches found)이 정상입니다.
