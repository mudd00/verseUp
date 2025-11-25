const fs = require('fs');
const path = require('path');

function convertTsToJs(content, isTsx = false) {
  // 1. import type 구문 제거
  content = content.replace(/import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"]/g, '');

  // 2. interface 정의 제거
  content = content.replace(/export\s+interface\s+\w+\s*(\s+extends\s+[^{]+)?\s*\{[^}]*\}/gs, '');
  content = content.replace(/interface\s+\w+\s*(\s+extends\s+[^{]+)?\s*\{[^}]*\}/gs, '');

  // 3. type 정의 제거
  content = content.replace(/export\s+type\s+\w+\s*=\s*[^;\n]+;?/g, '');
  content = content.replace(/^type\s+\w+\s*=\s*[^;\n]+;?/gm, '');

  // 4. 함수 파라미터의 타입 제거
  // (param: Type) -> (param)
  // (param: Type, param2: Type2) -> (param, param2)
  content = content.replace(/(\w+)\s*:\s*[^,\)=]+/g, (match, paramName) => {
    return paramName;
  });

  // 5. 함수 반환 타입 제거
  content = content.replace(/\)\s*:\s*Promise<[^>]+>/g, ')');
  content = content.replace(/\)\s*:\s*[A-Z]\w*(\[\])?\s*\{/g, ') {');
  content = content.replace(/\)\s*:\s*[A-Z]\w*(\[\])?\s*=>/g, ') =>');
  content = content.replace(/\)\s*:\s*void\s*\{/g, ') {');
  content = content.replace(/\)\s*:\s*void\s*=>/g, ') =>');

  // 6. 변수 선언의 타입 제거
  content = content.replace(/(const|let|var)\s+(\w+)\s*:\s*[^=]+=/g, '$1 $2 =');

  // 7. 제네릭 제거
  content = content.replace(/<[A-Z][\w<>, \[\]|]*>/g, '');

  // 8. as 타입 단언 제거
  content = content.replace(/\s+as\s+const/g, '');
  content = content.replace(/\s+as\s+\w+(\[\])?/g, '');

  // 9. ! non-null assertion 제거
  content = content.replace(/(\w+)!\./g, '$1?.');

  // 10. private/public/protected 제거
  content = content.replace(/(private|public|protected)\s+/g, '');

  // 11. import 경로 수정
  content = content.replace(/from\s+['"]([^'"]+)\.ts['"]/g, "from '$1.js'");
  content = content.replace(/from\s+['"]([^'"]+)\.tsx['"]/g, "from '$1.jsx'");

  // 12. 타입만 import하는 라인 제거 (대문자로 시작하는 타입들)
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]@\/types['"]/g, '');

  // 13. 빈 줄 정리
  content = content.replace(/\n\n\n+/g, '\n\n');
  content = content.trim();

  return content;
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (!file.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function main() {
  const basePath = 'C:\\Users\\Jaewon\\Desktop\\변환\\verseUp';
  const tsFiles = walkDir(basePath);

  let convertedCount = 0;
  const failedFiles = [];

  tsFiles.forEach(tsFile => {
    try {
      const content = fs.readFileSync(tsFile, 'utf-8');
      const isTsx = tsFile.endsWith('.tsx');
      const jsContent = convertTsToJs(content, isTsx);

      const outputFile = isTsx
        ? tsFile.replace(/\.tsx$/, '.jsx')
        : tsFile.replace(/\.ts$/, '.js');

      fs.writeFileSync(outputFile, jsContent, 'utf-8');

      console.log(`✓ ${path.basename(tsFile)} -> ${path.basename(outputFile)}`);
      convertedCount++;
    } catch (error) {
      console.error(`✗ ${tsFile}: ${error.message}`);
      failedFiles.push(tsFile);
    }
  });

  console.log(`\n변환 완료: ${convertedCount}/${tsFiles.length}개 파일`);

  if (failedFiles.length > 0) {
    console.log(`실패: ${failedFiles.length}개`);
    failedFiles.forEach(f => console.log(`  - ${f}`));
  }
}

main();
