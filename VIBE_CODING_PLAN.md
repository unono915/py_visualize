# 파이썬 시각화 애니메이션 기능 기획 문서

> **문서 목적**: Codex(바이브코딩) 등 다른 AI 코딩 도구에 프롬프트 컨텍스트로 제공하기 위한 기획/설계 문서.
> **개발 대상**: Python Playground Visualizer (`index.html`, `style.css`, `visualizer.js`)

---

## 1. 개요 및 요구사항

파이썬 코드가 실행될 때, 한 줄 한 줄의 실행 과정을 아래와 같이 **역동적**으로 시각화합니다.

1. **순차적 구현 및 자동/수동 재생 지원**:
   - 재생(Play) 버튼을 통해 코드가 한 줄씩 애니메이션과 함께 자동 실행.
   - 기존의 "처음/이전/다음/마지막" 수동 탐색 모드에서도 동일한 애니메이션 효과 동작.
2. **변수 선언 시 역동적 모션**:
   - 코드가 실행되어 변수가 생성/수정/삭제 시 화면 우측 Visualizer 패널에 팝업(Pop) 효과 등 애니메이션 적용.
3. **코드 줄 ↔ 변수 카드 간 시각적 연결 (선/화살표)**:
   - 현재 실행 중인 코드(좌측)와 연관된 변수 카드(우측)를 곡선(SVG 등)으로 이어 참조 관계를 시각적으로 확인.
4. **`input()` 흐름 시각화**:
   - `input()` 실행 → 모달에서 값 입력 → 승인 시 해당 값이 변수 카드로 날아가 저장되는 애니메이션 처리.

---

## 2. 세부 구현 스펙 설계

### Phase 1: 자동/수동 재생 플레이어 & 변수 생명주기 이벤트

**1) 플레이어 UI (`index.html`)**
- Step Explorer 섹션에 재생 컨트롤(▶ 재생, ⏸ 일시정지, 재생 속도 조절) 버튼 추가.

**2) 스텝별 Diff 비교 (`visualizer.js`)**
- Pyodide Tracer가 수집한 `steps` 배열을 순차 탐색할 때, **이전 스텝과 현재 스텝의 전역 변수(`globals`)를 비교(Diff)**합니다.
- `생성된 변수(Created)`, `수정된 변수(Modified)`, `삭제된 변수(Deleted)`, `참조된 변수(Read)`를 도출합니다.

**3) 변수 카드 애니메이션 (`style.css` & `visualizer.js`)**
- Diff 결과에 따라 `.var-card` 컨테이너에 애니메이션 CSS 클래스를 동적으로 붙입니다.
- **Created**: 크기가 0에서 커지고 살짝 회전하며 등장(Pop). `NEW` 배지 추가.
- **Modified**: 해당 카드가 반짝(Pulse)이며 박스 섀도우 연출. 값 텍스트 깜빡임. `CHANGED` 배지 추가.
- **Deleted**: 축소되며 페이드 아웃(Fade-out).

### Phase 2: 연결선 (SVG Overlay)

**1) 연결선 레이어 도입 (`index.html` & `style.css`)**
- 좌측 코드 에디터와 우측 변수 패널 사이를 덮는 투명한 `<svg id="connectionSvg" style="position:absolute; inset:0; pointer-events:none;">` 구축.

**2) 렌더링 로직 (`visualizer.js`)**
- 특정 스텝 이동 시 기존 그려진 SVG 경로를 지우고 새로 그립니다.
- **시작점**: 좌측 에디터 줄 번호(`div.code-line-pointer` 등) 좌표.
- **도착점**: 우측의 관련 `.var-card` 요소 좌측 경계선.
- 창 크기 변경(`resize`) 시 좌표를 재설정(Observer 패턴 활용 추천).

**3) 상태별 선 스타일링 (`style.css`)**
- **생성(Write)**: 민트색 화살표 곡선.
- **수정(Update)**: 주황색 화살표 곡선.
- **읽기(Read)**: 파란색 점선 곡선.
- `@keyframes`의 `stroke-dashoffset`을 이용해 선이 좌향에서 우향으로 그려지는 애니메이션 효과.

### Phase 3: `input()` 값 흐름 입자(Token) 애니메이션

**1) 목표**
- `visualizer.js` 내에서 `submitInput(값)`이 실행될 때, 사용자가 입력한 문자열을 담은 작은 배지(Token) 생성.
- 중앙의 위치(`inputModal`)에서 우측 변수 카드 예정 위치로 곡선을 그리며 이동(Fly). 도착하면 Variable Card의 Pop 애니메이션 트리거.

**2) 구현 방법**
- `position: fixed` 상태의 DOM 노드(`div.flow-token`) 생성.
- 좌표 A(모달 중심)에서 좌표 B(우측 패널)로 CSS `transition` 적용(left, top 변경 방식 또는 transform: translate 방식).
- 애니메이션 타이밍 종료(Promise/setTimeout) 시 Token 제거 및 다음 스텝으로 진행.

---

## 3. 작업 파일별 요약 지침 (프롬프트 참고용)

*이 내용을 AI 개발 프롬프트로 활용하세요.*

*   **`style.css` 추가 필수 내역**:
    1. 변수 카드 `.var-card`용 `anim-create`, `anim-update` 클래스 및 `@keyframes`.
    2. `.var-badge-new`, `.var-badge-changed` 스타일.
    3. `.connection-overlay` (SVG) 스타일과 선 그리기 애니메이션(`stroke-dashoffset`).
    4. `.flow-token` (입력값 날아가는 애니메이션 요소).
    5. 현재 실행 중인 코드 라인 번호를 강조하는 효과.
*   **`index.html` 추가 필수 내역**:
    1. Step Explorer 주변에 Play/Pause 버튼 생성.
    2. 메인 컨테이너 영역(`workspace` 레벨) 윗단에 `<svg id="connectionSvg">` 레이어 추가.
*   **`visualizer.js` 변경 요구사항**:
    1. 상태 객체에 `isPlaying` 및 `playSpeed` 추가.
    2. 변경점 식별 함수(`diffVariables(prevGlobals, curGlobals)`) 구축.
    3. 식별된 Diff 객체를 받아카드 DOM에 CSS 애니메이션 클래스를 켜고 꺼주는 `renderAnimatedVarCards` 함수 구현.
    4. `.line-number-item`의 절대/상대 위치와 `.var-card` 위치를 파악해 SVG 안의 `<path d="M... C...">` 노드를 생성하는 로직 추가.
    5. `showInput`의 `resolve` 실행 시 `token` DOM을 렌더링하고 `getBoundingClientRect_Modal` → `getBoundingClientRect_VarList`에 맞추어 `transform` 이동시키는 비동기 함수(`.animateInputFlow()`) 연결.
    6. 이전 버튼 클릭 등 역방향 수동 탐색 시에도 `diff`가 자연스럽게 동작하도록 상태 동기화 주의.
