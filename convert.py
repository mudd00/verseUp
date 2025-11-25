#!/usr/bin/env python3
import os
import re
from pathlib import Path

def convert_ts_to_js(content, is_tsx=False):
    """TypeScript 코드를 JavaScript로 변환"""

    # 1. import type 구문 제거
    content = re.sub(r'import\s+type\s+\{[^}]+\}\s+from\s+[\'"][^\'"]+[\'"]', '', content)

    # 2. import에서 타입만 import하는 경우 제거
    def remove_type_imports(match):
        imports = match.group(1)
        # Course, User 같은 대문자로 시작하는 것들은 타입일 가능성이 높음
        # 하지만 CourseService 같은 것도 있으니 조심해야 함
        # 일단 모든 import를 유지
        return match.group(0)

    # 3. interface 정의 제거
    content = re.sub(r'export\s+interface\s+\w+\s*\{[^}]*\}', '', content, flags=re.MULTILINE | re.DOTALL)
    content = re.sub(r'interface\s+\w+\s*\{[^}]*\}', '', content, flags=re.MULTILINE | re.DOTALL)

    # 4. type 정의 제거
    content = re.sub(r'export\s+type\s+\w+\s*=\s*[^;\n]+', '', content)
    content = re.sub(r'type\s+\w+\s*=\s*[^;\n]+', '', content)

    # 5. 함수 파라미터의 타입 제거 - (param: Type) -> (param)
    content = re.sub(r'(\w+)\s*:\s*[^,\)=]+(\s*[,\)])', r'\1\2', content)

    # 6. 함수 반환 타입 제거 - ): Type => -> ) =>
    content = re.sub(r'\)\s*:\s*Promise<[^>]+>', ')', content)
    content = re.sub(r'\)\s*:\s*[A-Z]\w*(\[\])?\s*\{', ') {', content)
    content = re.sub(r'\)\s*:\s*[A-Z]\w*(\[\])?\s*=>', ') =>', content)

    # 7. 변수 선언의 타입 제거 - const x: Type = -> const x =
    content = re.sub(r'(const|let|var)\s+(\w+)\s*:\s*[^=]+=', r'\1 \2 =', content)

    # 8. 제네릭 제거 - <Type> 제거
    content = re.sub(r'<[A-Z]\w*(\[\])?>', '', content)
    content = re.sub(r'Promise<([^>]+)>', 'Promise', content)
    content = re.sub(r'Record<[^>]+>', 'Record', content)
    content = re.sub(r'Array<([^>]+)>', 'Array', content)

    # 9. as 타입 단언 제거
    content = re.sub(r'\s+as\s+const', '', content)
    content = re.sub(r'\s+as\s+\w+', '', content)

    # 10. ! non-null assertion 제거
    content = re.sub(r'(\w+)!\.', r'\1?.', content)

    # 11. private/public/protected 제거
    content = re.sub(r'(private|public|protected)\s+', '', content)

    # 12. extends 구문에서 타입 제거
    content = re.sub(r'extends\s+Partial<\w+>', '', content)
    content = re.sub(r'extends\s+\w+', '', content)

    # 13. import 경로에서 .ts -> .js, .tsx -> .jsx
    content = re.sub(r"from\s+['\"]([^'\"]+)\.ts['\"]", r"from '\1.js'", content)
    content = re.sub(r"from\s+['\"]([^'\"]+)\.tsx['\"]", r"from '\1.jsx'", content)

    # 14. 빈 줄 여러개를 하나로
    content = re.sub(r'\n\n\n+', '\n\n', content)

    return content

def process_file(ts_file, output_file):
    """TypeScript 파일을 읽어서 JavaScript로 변환하여 저장"""
    try:
        with open(ts_file, 'r', encoding='utf-8') as f:
            content = f.read()

        is_tsx = ts_file.endswith('.tsx')
        js_content = convert_ts_to_js(content, is_tsx)

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(js_content)

        return True
    except Exception as e:
        print(f"Error processing {ts_file}: {e}")
        return False

def main():
    base_path = Path(r"C:\Users\Jaewon\Desktop\변환\verseUp")

    # .ts 및 .tsx 파일 찾기
    ts_files = []
    ts_files.extend(base_path.rglob("*.ts"))
    ts_files.extend(base_path.rglob("*.tsx"))

    # node_modules 제외
    ts_files = [f for f in ts_files if 'node_modules' not in str(f)]

    converted_count = 0
    failed_files = []

    for ts_file in ts_files:
        # 출력 파일 경로 결정
        if ts_file.suffix == '.tsx':
            output_file = ts_file.with_suffix('.jsx')
        elif ts_file.suffix == '.ts':
            # .d.ts 파일은 제외
            if ts_file.name.endswith('.d.ts'):
                continue
            output_file = ts_file.with_suffix('.js')
        else:
            continue

        print(f"Converting: {ts_file.name} -> {output_file.name}")

        if process_file(ts_file, output_file):
            converted_count += 1
        else:
            failed_files.append(str(ts_file))

    print(f"\n변환 완료: {converted_count}개 파일")

    if failed_files:
        print(f"실패한 파일: {len(failed_files)}개")
        for f in failed_files:
            print(f"  - {f}")

if __name__ == "__main__":
    main()
