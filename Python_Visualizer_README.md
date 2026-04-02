# 🐍 파이썬 코드 시각화 교육 도구 - 프로젝트 문서

> 작성 목적: 바이브코딩(Codex 등 AI 코딩 도구) 사용 시 참고할 기획/기술 문서  
> 작성일: 2025년

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 파이썬 코드 시각화 교육 도구 |
| 제작 목적 | 정보 교사가 학생들의 파이썬 코드 실행 결과를 변수 단위로 시각화 |
| 참고 사이트 | https://pythontutor.com |
| 배포 형태 | 정적 웹페이지 (HTML 단일 파일) |
| 백엔드 | 없음 (Pyodide로 브라우저에서 Python 직접 실행) |

---

## 2. 핵심 기능 요구사항

### 2-1. 화면 레이아웃
```
┌─────────────────────┬─────────────────────┐
│   왼쪽: 코드 에디터  │  오른쪽: 변수 시각화  │
│   (48%)             │  (52%)              │
├─────────────────────┴─────────────────────┤
│   왼쪽 하단: 콘솔 출력창                   │
└───────────────────────────────────────────┘
```

### 2-2. 코드 에디터 (왼쪽)
- 파이썬 코드 직접 입력 가능한 textarea
- 왼쪽에 줄 번호 표시 (스크롤 동기화)
- Tab 키 → 4칸 공백 삽입
- Ctrl+Enter → 코드 실행
- ▶ 실행 버튼 / 🗑 초기화 버튼
- 예제 코드 버튼 6종 (변수기초 / input사용 / 리스트 / 딕셔너리 / 반복문 / 함수)

### 2-3. 변수 시각화 패널 (오른쪽)
- 코드 실행 후 전역 변수를 박스(카드) 형태로 표시
- 예: a = 'hi' 실행 → [a] 라벨 + ["hi"] 박스 표시
- 변수 카드 순차 등장 애니메이션 (70ms 간격)
- 상단에 "Global Frame" 태그 + 변수 개수 표시

**타입별 색상 규칙**
| 타입 | 배경색 | 테두리색 | 글자색 |
|------|--------|---------|--------|
| str | #fff5f5 | #fc8181 | #c53030 |
| int | #ebf8ff | #4299e1 | #2b6cb0 |
| float | #fffff0 | #ecc94b | #975a16 |
| bool | #f0fff4 | #48bb78 | #276749 |
| None | #f7fafc | #a0aec0 | #718096 |
| list | #faf5ff | #9f7aea | #553c9a |
| tuple | #e6fffa | #4fd1c5 | #234e52 (점선 테두리) |
| dict | #fff8f1 | #f6ad55 | #744210 |
| set | list과 동일 | | |
| function | #1a202c | #9f7aea | #d6bcfa |

**타입별 렌더링 방식**
- str / int / float / bool / None → 단순 박스
- list / tuple / set → 인덱스 번호가 붙은 셀을 가로로 나열
- dict → Key / Value 2열 테이블
- function → def 함수명(파라미터) 형태 박스

### 2-4. 콘솔 출력 (왼쪽 하단)
- print() 결과 표시 (초록색 글자)
- 에러 메시지 표시 (빨간색 글자)
- Python traceback은 마지막 4줄만 표시

### 2-5. input() 지원 (중요!)
- input()을 만나면 화면 중앙에 모달 팝업 등장
- 모달 구성: 프롬프트 텍스트 + 입력창 + 확인 버튼
- Enter 키로도 제출 가능
- 입력값을 콘솔에 echo 출력 후 Python에 전달

---

## 3. 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 언어 | HTML + CSS + Vanilla JS | 단일 파일, 설치 불필요 |
| Python 실행 | Pyodide v0.26.2 | 브라우저에서 Python 직접 실행 |
| 에디터 라이브러리 | 없음 (textarea 직접 구현) | 의존성 최소화 |
| 백엔드 | 없음 | 완전 정적 페이지 |
| 배포 | Netlify 또는 GitHub Pages | 무료, 간편 |

### Pyodide CDN 주소
```
https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js
```

### Pyodide 주의사항
- 첫 로드 시 약 10~30초 소요 (약 30MB 다운로드)
- 로딩 중 진행 바(progress bar) UI 필수
- 로드 실패 시 재시도 버튼 제공
- 외부 패키지는 pyodide.loadPackage()로 별도 로드

---

## 4. 핵심 구현 패턴

### 4-1. Pyodide 초기화
```javascript
let pyodide = null;

async function startLoad() {
  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/"
  });
  // input() 오버라이드 등록
  // 실행 버튼 활성화
}
```

### 4-2. input() 처리 원리
브라우저는 "멈추고 기다리는" 동작이 기본적으로 불가능하다.
따라서 아래 방식으로 해결한다:

1. Python의 기본 input()을 async 함수로 교체
2. input() 호출 시 JS의 Promise를 await
3. JS는 모달 팝업을 열고 resolve 함수를 저장
4. 사용자가 확인 클릭 시 resolve(입력값) 호출
5. Python이 값을 받아 계속 실행

```javascript
// JS측: Python에서 호출할 함수 등록
pyodide.globals.set('_js_input', (prompt) => {
  return new Promise((resolve) => {
    showInputModal(prompt, resolve);
    // resolve는 사용자가 확인 클릭할 때까지 저장
  });
});

// 확인 버튼 클릭 시
function submitInput() {
  const value = document.getElementById('inputField').value;
  modalClose();
  inputResolve(value); // Python에 값 전달
}
```

```python
# Python측: input() 오버라이드
async def _custom_input(prompt=''):
    js.appendConsole(str(prompt))       # 프롬프트 콘솔 출력
    result = await js._js_input(prompt) # JS 모달 호출 및 대기
    js.appendConsole(result + '\n')    # 입력값 echo
    return result

import builtins
builtins.input = _custom_input
```

### 4-3. stdout 캡처 패턴
```python
import sys, io
_buf = io.StringIO()
sys.stdout = _buf
sys.stderr = _buf

# 사용자 코드 실행

sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
output = _buf.getvalue()
```

### 4-4. 변수 추출 패턴
```python
import json

_SKIP = {
  '__name__', '__doc__', '__package__', '__loader__',
  '__spec__', '__builtins__', '__builtin__',
  '_buf', 'sys', 'io', 'js', 'builtins',
  '_custom_input', '_js_input'
}

_out = {}
for _k, _v in list(globals().items()):
    if _k.startswith('_') or _k in _SKIP:
        continue
    try:
        _t = type(_v).__name__
        if _t in ('int', 'float', 'bool', 'NoneType'):
            _out[_k] = {'type': _t, 'value': _v}
        elif _t == 'str':
            _out[_k] = {'type': 'str', 'value': str(_v)}
        elif _t == 'list':
            _out[_k] = {'type': 'list', 'value': [repr(i) for i in _v[:30]]}
        elif _t == 'tuple':
            _out[_k] = {'type': 'tuple', 'value': [repr(i) for i in _v[:30]]}
        elif _t == 'dict':
            _out[_k] = {'type': 'dict',
                        'value': {repr(k): repr(v) for k, v in list(_v.items())[:20]}}
        elif _t in ('set', 'frozenset'):
            _out[_k] = {'type': _t, 'value': [repr(i) for i in list(_v)[:30]]}
        elif _t == 'function':
            import inspect
            sig = str(inspect.signature(_v))
            _out[_k] = {'type': 'function', 'value': _k + sig}
        else:
            _out[_k] = {'type': _t, 'value': repr(_v)[:80]}
    except:
        pass

json.dumps(_out, ensure_ascii=False, default=str)
```

---

## 5. 로딩 UI 요구사항

```
초기 접속 시 전체 화면을 덮는 오버레이 표시

구성요소:
- 스피너 (CSS 애니메이션)
- 제목: "Python 엔진 로딩 중..."
- 단계 메시지 (loadMsg 텍스트)
- 진행 바 (0% → 100%)
- "처음 로드 시 약 10~30초 소요" 안내문

진행 단계:
  5%  → Pyodide 엔진 초기화 중
  20% → Python 인터프리터 다운로드 중
  75% → 표준 라이브러리 로드 중
  100%→ 준비 완료!

실패 시:
- 오류 메시지 + 상세 에러 텍스트 표시
- 🔄 다시 시도 버튼 제공
```

---

## 6. 예제 코드 6종

### 변수 기초
```python
name = 'Alice'
age = 17
height = 163.5
is_student = True
nothing = None
print(name, age)
```

### input 사용
```python
name = input('이름을 입력하세요: ')
age  = int(input('나이를 입력하세요: '))
print(f'안녕하세요, {name}님! ({age}세)')
```

### 리스트
```python
fruits = ['사과', '바나나', '딸기', '포도']
numbers = [10, 20, 30, 40, 50]
fruits.append('오렌지')
print(fruits)
```

### 딕셔너리
```python
student = {'name': 'Bob', 'grade': 3, 'score': 95}
student['city'] = '서울'
print(student)
```

### 반복문
```python
total = 0
nums = []
for i in range(1, 6):
    total += i
    nums.append(i)
    print(f'{i} 더하는 중... 합계: {total}')
print('최종 합계:', total)
```

### 함수
```python
def greet(name, age):
    msg = f'안녕하세요, {name}님! 나이: {age}'
    return msg

def add(a, b):
    return a + b

result = greet('철수', 16)
sum_val = add(10, 20)
print(result)
print('합계:', sum_val)
```

---

## 7. 파일 구조

```
project/
└── index.html   ← 모든 코드를 담은 단일 파일 (HTML + CSS + JS 인라인)
```

추후 분리 시 권장 구조:
```
project/
├── index.html
├── style.css
└── visualizer.js
```

---

## 8. 배포 방법

### Netlify (권장)
```
1. https://netlify.com 접속 후 회원가입
2. index.html 파일을 드래그 앤 드롭
3. 자동 URL 발급 (예: your-site.netlify.app)
4. 학생들에게 URL 공유
```

### GitHub Pages
```
1. GitHub 레포지토리 생성
2. index.html 업로드
3. Settings → Pages → Branch: main 설정
4. https://username.github.io/repo-name 접속
```

---

## 9. 추후 개발 권장 기능

| 우선순위 | 기능 | 설명 |
|---------|------|------|
| 🔴 높음 | 단계별 실행 | 줄마다 Next 버튼으로 변수 변화 추적 |
| 🔴 높음 | 함수 호출 스택 | 함수 호출 시 스택 프레임 시각화 |
| 🟡 중간 | 코드 공유 | URL에 코드를 인코딩하여 학생과 공유 |
| 🟡 중간 | 화살표 참조 | 리스트·객체 참조 관계를 화살표로 표시 |
| 🟡 중간 | 실행 히스토리 | 각 줄 실행 후 변수 스냅샷 저장 |
| 🟢 낮음 | 다크/라이트 모드 | 테마 전환 버튼 |
| 🟢 낮음 | 코드 자동 저장 | localStorage에 마지막 코드 저장 |
| 🟢 낮음 | 학생 이름 입력 | 수업용 화면 상단에 이름 표시 |

---

## 10. AI 코딩 도구에 전달할 프롬프트 예시

```
다음 조건으로 파이썬 코드 시각화 웹앱을 단일 HTML 파일로 만들어줘.

[기술 조건]
- Pyodide v0.26.2 CDN 사용 (브라우저에서 Python 실행)
- HTML + CSS + Vanilla JS 단일 파일
- 백엔드 없음

[레이아웃]
- 좌우 분할: 왼쪽 코드 에디터(48%) / 오른쪽 변수 시각화(52%)
- 왼쪽 하단: 콘솔 출력창

[에디터 기능]
- 줄 번호 표시 (스크롤 동기화)
- Tab키 4칸 공백
- Ctrl+Enter 실행

[변수 시각화]
- 실행 후 전역 변수를 타입별 색상 박스로 표시
- str(빨강) / int(파랑) / float(노랑) / bool(초록) / None(회색)
- list·tuple → 인덱스 셀 가로 나열
- dict → Key/Value 테이블

[input() 처리]
- builtins.input을 async 함수로 오버라이드
- JS Promise + 모달 팝업으로 사용자 입력 수신
- pyodide.globals.set('_js_input', ...) 패턴 사용

[로딩 UI]
- 전체 화면 오버레이 + 진행 바
- 실패 시 재시도 버튼
```
