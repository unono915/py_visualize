# 🐍 Python Playground Visualizer — 프로젝트 컨텍스트 문서

> **문서 목적**: 이 문서는 AI 어시스턴트가 컨텍스트 윈도우가 초기화되더라도 프로젝트의 전체 맥락을 파악하고 작업을 이어갈 수 있도록 하기 위한 **영구 참조 문서**입니다.  
> **최초 작성일**: 2026-04-06  
> **최종 수정일**: 2026-04-06

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | Python Playground Visualizer (파이썬 코드 시각화 교육 도구) |
| **목적** | 정보 교사가 학생들에게 파이썬 코드 실행 결과를 변수 단위로 시각화하여 보여주는 교육용 웹 도구 |
| **참고 사이트** | [Python Tutor](https://pythontutor.com) |
| **배포 형태** | 정적 웹페이지 (빌드 과정 없음, HTML + CSS + JS 파일만으로 동작) |
| **백엔드** | 없음 — Pyodide(v0.26.2)를 사용하여 브라우저에서 Python을 직접 실행 |
| **배포 플랫폼** | Vercel / GitHub Pages / Netlify (무료 정적 호스팅) |
| **언어** | 한국어 UI |
| **레포지토리** | https://github.com/unono915/py_visualize.git |
| **로컬 경로** | `c:\Users\yhji915\Desktop\py_visualize` |

---

## 2. 기술 스택

| 항목 | 기술 | 비고 |
|------|------|------|
| 구조 | HTML5 | `index.html` 단일 진입점 |
| 스타일 | Vanilla CSS | `style.css` (917줄) |
| 로직 | Vanilla JavaScript | `visualizer.js` (1091줄) |
| Python 실행 | Pyodide v0.26.2 (CDN) | 브라우저 내 WASM 기반 Python 인터프리터 |
| 폰트 | Google Fonts (Gaegu, Gowun Dodum, JetBrains Mono) | 귀엽고 친근한 한글 폰트 + 코드 모노스페이스 |
| 에디터 | textarea 직접 구현 | 외부 라이브러리 미사용, 의존성 최소화 |
| 상태 관리 | 전역 `state` 객체 | 간단한 상태 패턴 |

---

## 3. 파일 구조 및 역할

```
py_visualize/
├── index.html                    # 메인 HTML (255줄) - 전체 레이아웃 및 UI 구조
├── style.css                     # 스타일시트 (917줄) - 디자인 시스템, 반응형 포함
├── visualizer.js                 # 핵심 JS 로직 (1091줄) - Pyodide 연동, 실행, 시각화
├── Python_Visualizer_README.md   # 기획/기술 설계 문서 (387줄)
├── DEPLOY.md                     # 배포 가이드
├── README.md                     # 간단한 레포 소개 (1줄)
├── chrome_dom.txt                # Chrome DOM 스냅샷 (테스트/참고용)
└── .gitignore                    # Git 제외 설정
```

---

## 4. 핵심 기능 상세 분석

### 4-1. 화면 레이아웃
```
┌──────────────────────────┬──────────────────────────┐
│   왼쪽 (48%): 코드 에디터  │  오른쪽 (52%): 변수 시각화  │
│   ┌────────────────────┐ │  ┌────────────────────┐  │
│   │ 예제 버튼 스트립     │ │  │ Global Frame 헤더   │  │
│   ├────────────────────┤ │  ├────────────────────┤  │
│   │ ▶ 실행 / 🗑 초기화   │ │  │ 단계별 실행 탐색기   │  │
│   ├────────────────────┤ │  │ (Step Explorer)     │  │
│   │ 코드 에디터         │ │  ├────────────────────┤  │
│   │ (줄번호 + textarea) │ │  │ 변수 카드 그리드     │  │
│   ├────────────────────┤ │  │ (Visualization Grid)│  │
│   │ 콘솔 출력           │ │  └────────────────────┘  │
│   └────────────────────┘ │                          │
└──────────────────────────┴──────────────────────────┘
```

### 4-2. 코드 에디터 기능
- **줄 번호 표시**: 좌측에 동적 줄 번호, textarea와 스크롤 동기화
- **Tab 키**: 4칸 공백 삽입
- **Ctrl+Enter**: 코드 실행 단축키
- **▶ 실행 버튼** / **🗑 초기화 버튼**
- **예제 코드 6종 버튼**: 변수기초, input사용, 리스트, 딕셔너리, 반복문, 함수
- **자동 저장**: `localStorage`에 작성 중인 코드 저장 (`py-visualize-draft` 키)

### 4-3. 변수 시각화 (타입별 카드 시스템)
| 타입 | 배경색 | 테두리색 | 렌더링 방식 |
|------|--------|---------|------------|
| `str` | #fff5f5 | #fc8181 | 단순 값 박스 |
| `int` | #ebf8ff | #4299e1 | 단순 값 박스 |
| `float` | #fffff0 | #ecc94b | 단순 값 박스 |
| `bool` | #f0fff4 | #48bb78 | 단순 값 박스 |
| `None` | #f7fafc | #a0aec0 | 단순 값 박스 |
| `list` / `set` | #faf5ff | #9f7aea | 인덱스 번호가 붙은 셀을 가로로 나열 |
| `tuple` | #e6fffa | #4fd1c5 | 인덱스 셀 (점선 테두리) |
| `dict` | #fff8f1 | #f6ad55 | Key/Value 2열 테이블 |
| `function` | #1a202c | #9f7aea | `def 함수명(파라미터)` 형태 |

- 카드 등장 애니메이션: 70ms 간격으로 순차 등장 (scale + translateY)
- 상단에 변수 개수 표시

### 4-4. 단계별 실행 (Step Explorer)
- Python `sys.settrace()`를 활용하여 각 줄 실행 후 변수 스냅샷을 수집
- 최대 400 스텝까지 기록 (`__STEP_LIMIT = 400`)
- UI 구성: 처음/이전/다음/마지막 버튼 + range 슬라이더
- 각 스텝에서 표시: 실행된 줄 번호, 프레임 스택, 지역 변수, 전역 변수
- 현재 실행 중인 줄을 에디터의 줄 번호에서 하이라이트

### 4-5. input() 처리
- Python의 `builtins.input`을 async 함수로 오버라이드
- `input()` 호출 시 JS Promise를 await → 모달 팝업 표시
- 사용자가 확인 클릭 → `resolve(입력값)` → Python 실행 재개
- URL 파라미터 `autofill`로 자동 입력값 제공 가능 (테스트용)

### 4-6. Pyodide 초기화 및 로딩 UI
- 전체 화면 오버레이 + 프로그레스 바
- 진행 단계: 5% → 20% → 75% → 100%
- 실패 시 에러 메시지 + 재시도 버튼
- 첫 로드 시 약 10~30초 소요 안내

### 4-7. Python 코드 실행 파이프라인 (`buildRunnerScript`)
```
1. AST 파싱: ast.parse(소스코드)
2. input() 변환: __CodexInputTransformer로 input()을 await 패턴으로 변환
3. 컴파일: compile(AST, flags=PyCF_ALLOW_TOP_LEVEL_AWAIT)
4. 트레이스 설정: sys.settrace(__tracer) — 줄별 실행 추적
5. 실행: eval(code, scope, scope) — stdout/stderr 리다이렉트 하에서
6. 결과 수집: JSON.dumps({ stdout, stderr, error, variables, steps })
```

### 4-8. URL 파라미터 지원
| 파라미터 | 용도 | 예시 |
|---------|------|------|
| `example` | 특정 예제 자동 로드 | `?example=list` |
| `autofill` | input() 자동 응답 | `?autofill=Alice\|17` |
| `autotest` | 자동 테스트 모드 | `?autotest=1` |
| `step` | 특정 스텝으로 이동 | `?step=first`, `?step=3` |

---

## 5. 디자인 시스템

### 색상 팔레트 (CSS 변수)
```css
--bg-panel: rgba(255, 255, 255, 0.92)  /* 패널 배경 */
--bg-code: #fffdf7                      /* 코드 에디터 배경 */
--text-main: #213547                    /* 기본 텍스트 */
--text-soft: #5d7388                    /* 보조 텍스트 */
--mint-deep: #41aa9d                    /* 주요 악센트 (민트) */
--success: #2e7d53                      /* 성공 상태 */
--error: #c75c67                        /* 에러 상태 */
```

### 디자인 특징
- **귀엽고 친근한 톤**: Gaegu(손글씨) 폰트를 제목에 사용, 파스텔 색상
- **글래스모피즘**: `backdrop-filter: blur(14px)`, 반투명 배경
- **부드러운 그라데이션 배경**: radial-gradient, linear-gradient 조합
- **둥근 모서리**: border-radius 16~30px 사용
- **SVG 마스코트**: 뱀 캐릭터 일러스트 (Hero 섹션)
- **반응형**: 1180px, 760px 브레이크포인트 2단계
- **마이크로 애니메이션**: 버튼 hover(translateY), 카드 등장(scale+opacity)

---

## 6. 상태 관리 구조 (`state` 객체)

```javascript
const state = {
  pyodide: null,           // Pyodide 인스턴스
  isRunning: false,        // 코드 실행 중 여부
  inputResolve: null,      // input() 모달의 Promise resolve 함수
  activeExampleId: "variables",  // 현재 선택된 예제 ID
  autoInputs: [],          // URL autofill 파라미터로 받은 자동 입력값
  executionSteps: [],      // 단계별 실행 스냅샷 배열
  currentStepIndex: -1,    // 현재 보고 있는 스텝 인덱스
  currentSourceLines: [],  // 현재 소스 코드의 각 줄
  stepsTruncated: false,   // 스텝 수 초과로 잘림 여부
  lastResult: null,        // 마지막 실행 결과
  lastExecutedSource: "",  // 마지막 실행된 소스 코드
};
```

---

## 7. DOM 캐싱 구조

`cacheDom()` 함수에서 모든 주요 DOM 요소를 `dom` 객체에 캐싱:
- 에디터: `codeInput`, `lineNumbers`, `exampleStrip`
- 실행 제어: `runButton`, `resetButton`, `engineStatus`
- 콘솔: `consoleOutput`
- 시각화: `visualizationGrid`, `variableCount`
- 스텝 탐색: `stepExplorer`, `stepRange`, `stepCounter` 등
- 로딩: `loadingOverlay`, `progressBar`, `loadMessage` 등
- 모달: `inputModal`, `inputField`, `submitInputButton`

---

## 8. 기존 README의 "추후 개발 권장 기능" 현황

| 우선순위 | 기능 | 상태 | 비고 |
|---------|------|------|------|
| 🔴 높음 | 단계별 실행 | ✅ **구현 완료** | Step Explorer로 구현됨 |
| 🔴 높음 | 함수 호출 스택 | ✅ **구현 완료** | frame-stack으로 시각화 |
| 🟡 중간 | 코드 공유 | ❌ 미구현 | URL 인코딩 방식 가능 |
| 🟡 중간 | 화살표 참조 | ❌ 미구현 | 리스트·객체 참조 관계 |
| 🟡 중간 | 실행 히스토리 | ✅ **구현 완료** | steps 배열로 저장 |
| 🟢 낮음 | 다크/라이트 모드 | ❌ 미구현 | |
| 🟢 낮음 | 코드 자동 저장 | ✅ **구현 완료** | localStorage 사용 |
| 🟢 낮음 | 학생 이름 입력 | ❌ 미구현 | |

---

## 9. 알려진 제한사항 및 주의점

1. **Pyodide 로딩 시간**: 첫 로드 시 ~30MB 다운로드, 10~30초 소요
2. **스텝 제한**: 최대 400 스텝까지만 기록 (무한루프 방지)
3. **컬렉션 크기 제한**: list/tuple/set은 30개, dict는 20개까지만 표시
4. **repr 길이 제한**: 변수 값 표현은 80자(기본) 또는 40~60자(dict)까지
5. **외부 패키지**: 기본 표준 라이브러리만 사용 가능 (추가 시 `pyodide.loadPackage()` 필요)
6. **`_` 접두사 변수**: 시각화에서 제외됨 (내부 변수와 구분)
7. **모듈 타입**: 시각화에서 자동 제외

---

## 10. 사용자 요구사항 로그

### [2026-04-06] 초기 세팅
- **요청**: GitHub 레포지토리 클론 및 작업 환경 구축
- **결과**: ✅ `c:\Users\yhji915\Desktop\py_visualize`에 클론 완료
- **요청**: 프로젝트 분석 및 컨텍스트 문서 작성
- **결과**: ✅ 본 문서 (`PROJECT_CONTEXT.md`) 작성 완료

### [2026-04-06] 제품 방향성 및 작업 방식 확정
- **요청**: 프로젝트 방향을 "수업용 변수 변화 시각화 도구"로 명확히 확정
- **결과**: ✅ 범용 디버거보다 초급 문법 학습과 모션 그래픽 중심 UX를 우선하는 방향으로 기준 고정
- **요청**: 스크린샷성 결과 화면보다 실행 과정이 보이는 모션 그래픽을 우선
- **결과**: ✅ 향후 개발 우선순위를 Step 기반 장면 전환, 변수 생성/변경 애니메이션, 입력/출력 흐름 시각화로 재정렬
- **요청**: 작업 하나가 끝날 때마다 현재 작업 상황을 문서에 기록
- **결과**: ✅ `WORK_PROGRESS.md`를 추가하고, `PROJECT_CONTEXT.md`와 병행하여 작업 로그를 누적 기록하도록 결정
- **요청**: 수업용 도구답게 코드 실행 시 진행 과정을 스크린샷보다 모션으로 직관적으로 보여주기
- **결과**: ✅ 변수 생성/변경 diff를 기반으로 카드 애니메이션을 실제 Step Explorer와 연결하는 작업을 시작
- **요청**: 학생과 교사가 코드 흐름을 따라가기 쉽게 자동 재생 가능한 학습 플레이어를 제공
- **결과**: ✅ Step Explorer에 재생/일시정지/속도 제어 UI와 상태 관리를 추가하는 구현을 진행
- **요청**: 변수 영역이 큰 카드로 채워지는 방식보다, 넓은 시각화 공간 안에 더 작은 변수 노드가 흩어지고 사용 지점으로 선이 이어지는 구조로 변경
- **결과**: ✅ 시각화 영역을 장면형 캔버스로 재설계하고, 현재 실행 줄과 변수 노드를 잇는 SVG 연결선을 추가
- **요청**: 선은 왼쪽 코드 에디터 줄에서 시작하지 말고, 우측 시각화창에 뜬 현재 실행 줄 안의 변수 이름 위치에서 시작하게 변경
- **결과**: ✅ 우측 장면 내부 실행 줄 토큰 레이어를 추가하고, 변수 이름 토큰 기준으로 연결선을 재구성
- **요청**: 변수 박스가 겹치지 않게 개선
- **결과**: ✅ 렌더 후 실제 노드 크기를 기준으로 충돌 해소 단계를 추가하여 겹침을 완화
- **요청**: 코드 에디터에 `한 줄 실행` 버튼을 추가하고, 첫 줄부터 단계적으로 시작할 수 있게 변경
- **결과**: ✅ `한 줄 실행` 버튼을 추가하고, 해당 버튼 실행 시 Step Explorer가 첫 스텝부터 열리도록 구현

---

## 11. 작업 이력

| 날짜 | 작업 내용 | 변경 파일 | 상태 |
|------|----------|----------|------|
| 2026-04-06 | GitHub 레포 클론 | - | ✅ 완료 |
| 2026-04-06 | 프로젝트 전체 분석 | - | ✅ 완료 |
| 2026-04-06 | 컨텍스트 문서 작성 | `PROJECT_CONTEXT.md` | ✅ 완료 |
| 2026-04-06 | 수업용 모션 중심 제품 방향 재정의 | `PROJECT_CONTEXT.md` | ✅ 완료 |
| 2026-04-06 | 작업 진행 로그 문서 추가 | `WORK_PROGRESS.md`, `PROJECT_CONTEXT.md` | ✅ 완료 |
| 2026-04-06 | `input()` AST 변환 안정성 개선 | `visualizer.js`, `WORK_PROGRESS.md`, `PROJECT_CONTEXT.md` | ✅ 완료 |
| 2026-04-06 | Step 기반 변수 diff 및 카드 모션 연결 | `visualizer.js`, `WORK_PROGRESS.md`, `PROJECT_CONTEXT.md` | ✅ 완료 |
| 2026-04-06 | Step Explorer 재생 플레이어 확장 | `index.html`, `style.css`, `visualizer.js`, `WORK_PROGRESS.md`, `PROJECT_CONTEXT.md` | ✅ 완료 |
| 2026-04-06 | 장면형 변수 캔버스 및 연결선 기반 레이아웃 전환 | `index.html`, `style.css`, `visualizer.js`, `WORK_PROGRESS.md`, `PROJECT_CONTEXT.md` | ✅ 완료 |
| 2026-04-07 | 우측 실행 줄 토큰 기준 연결선 및 노드 겹침 완화 | `index.html`, `style.css`, `visualizer.js`, `WORK_PROGRESS.md`, `PROJECT_CONTEXT.md` | ✅ 완료 |
| 2026-04-07 | `한 줄 실행` 단계 진입 버튼 추가 | `index.html`, `visualizer.js`, `WORK_PROGRESS.md`, `PROJECT_CONTEXT.md` | ✅ 완료 |

---

## 12. AI 어시스턴트 참고 지침

> **이 문서를 읽는 AI 어시스턴트에게:**
> 
> 1. 이 프로젝트는 **빌드 도구 없는 순수 정적 웹앱**입니다. `index.html`을 브라우저에서 직접 열거나 `python -m http.server`로 서빙합니다.
> 2. 코드 수정 시 `index.html`, `style.css`, `visualizer.js` 3개 파일만 수정하면 됩니다.
> 3. Python 실행은 Pyodide WASM 엔진을 사용하며, `buildRunnerScript()` 함수가 핵심 실행 파이프라인입니다.
> 4. UI는 한국어이며, 교육용 도구이므로 **학생 친화적이고 직관적인 UX**가 최우선입니다.
> 5. **새로운 요구사항이 들어오면 반드시 섹션 10(요구사항 로그)과 섹션 11(작업 이력)을 업데이트하세요.**
> 6. 디자인 변경 시 기존 디자인 시스템(섹션 5)과 일관성을 유지하세요.
> 7. 로컬 테스트는 `python -m http.server 8000` 후 `http://127.0.0.1:8000/` 접속으로 확인합니다.
