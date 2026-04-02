const EXAMPLES = [
  {
    id: "variables",
    label: "변수 기초",
    code: `name = 'Alice'
age = 17
height = 163.5
is_student = True
nothing = None
print(name, age)`,
  },
  {
    id: "input",
    label: "input 사용",
    code: `name = input('이름을 입력하세요: ')
age = int(input('나이를 입력하세요: '))
print(f'안녕하세요, {name}님! ({age}세)')`,
  },
  {
    id: "list",
    label: "리스트",
    code: `fruits = ['사과', '바나나', '딸기', '포도']
numbers = [10, 20, 30, 40, 50]
fruits.append('오렌지')
print(fruits)`,
  },
  {
    id: "dict",
    label: "딕셔너리",
    code: `student = {'name': 'Bob', 'grade': 3, 'score': 95}
student['city'] = '서울'
print(student)`,
  },
  {
    id: "loop",
    label: "반복문",
    code: `total = 0
nums = []
for i in range(1, 6):
    total += i
    nums.append(i)
    print(f'{i} 더하는 중... 합계: {total}')
print('최종 합계:', total)`,
  },
  {
    id: "function",
    label: "함수",
    code: `def greet(name, age):
    msg = f'안녕하세요, {name}님! 나이: {age}'
    return msg

def add(a, b):
    return a + b

result = greet('철수', 16)
sum_val = add(10, 20)
print(result)
print('합계:', sum_val)`,
  },
];

const TYPE_LABELS = {
  str: "str",
  int: "int",
  float: "float",
  bool: "bool",
  none: "None",
  list: "list",
  tuple: "tuple",
  dict: "dict",
  set: "set",
  function: "function",
  other: "other",
};

const STORAGE_KEY = "py-visualize-draft";
const DEFAULT_EXAMPLE_ID = "variables";
const PYODIDE_INDEX = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/";

const state = {
  pyodide: null,
  isRunning: false,
  inputResolve: null,
  activeExampleId: DEFAULT_EXAMPLE_ID,
  autoInputs: [],
  executionSteps: [],
  currentStepIndex: -1,
  currentSourceLines: [],
  stepsTruncated: false,
  lastResult: null,
  lastExecutedSource: "",
};

const dom = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  renderExampleButtons();
  loadInitialCode();
  bindEvents();
  updateLineNumbers();
  syncLineNumbers();
  startLoad();
});

function cacheDom() {
  dom.codeInput = document.getElementById("codeInput");
  dom.lineNumbers = document.getElementById("lineNumbers");
  dom.consoleOutput = document.getElementById("consoleOutput");
  dom.visualizationGrid = document.getElementById("visualizationGrid");
  dom.variableCount = document.getElementById("variableCount");
  dom.engineStatus = document.getElementById("engineStatus");
  dom.exampleStrip = document.getElementById("exampleStrip");
  dom.runButton = document.getElementById("runButton");
  dom.resetButton = document.getElementById("resetButton");
  dom.loadingOverlay = document.getElementById("loadingOverlay");
  dom.loadMessage = document.getElementById("loadMessage");
  dom.progressBar = document.getElementById("progressBar");
  dom.progressText = document.getElementById("progressText");
  dom.loadError = document.getElementById("loadError");
  dom.retryLoadButton = document.getElementById("retryLoadButton");
  dom.inputModal = document.getElementById("inputModal");
  dom.inputPrompt = document.getElementById("inputPrompt");
  dom.inputField = document.getElementById("inputField");
  dom.submitInputButton = document.getElementById("submitInputButton");
  dom.stepExplorer = document.getElementById("stepExplorer");
  dom.stepCounter = document.getElementById("stepCounter");
  dom.firstStepButton = document.getElementById("firstStepButton");
  dom.prevStepButton = document.getElementById("prevStepButton");
  dom.nextStepButton = document.getElementById("nextStepButton");
  dom.lastStepButton = document.getElementById("lastStepButton");
  dom.stepRange = document.getElementById("stepRange");
  dom.stepLineBadge = document.getElementById("stepLineBadge");
  dom.stepPhaseText = document.getElementById("stepPhaseText");
  dom.stepLineText = document.getElementById("stepLineText");
  dom.frameStack = document.getElementById("frameStack");
  dom.activeLocals = document.getElementById("activeLocals");
  dom.stepTruncatedNote = document.getElementById("stepTruncatedNote");
  dom.autotestHook = document.getElementById("autotestHook");
}

function bindEvents() {
  dom.codeInput.addEventListener("input", handleCodeInput);
  dom.codeInput.addEventListener("scroll", syncLineNumbers);
  dom.codeInput.addEventListener("keydown", handleEditorKeydown);
  dom.runButton.addEventListener("click", () => executeCode());
  dom.resetButton.addEventListener("click", resetWorkspace);
  dom.retryLoadButton.addEventListener("click", startLoad);
  dom.submitInputButton.addEventListener("click", submitInput);
  dom.firstStepButton.addEventListener("click", () => selectStep(0));
  dom.prevStepButton.addEventListener("click", () => selectStep(state.currentStepIndex - 1));
  dom.nextStepButton.addEventListener("click", () => selectStep(state.currentStepIndex + 1));
  dom.lastStepButton.addEventListener("click", () => selectStep(state.executionSteps.length - 1));
  dom.stepRange.addEventListener("input", (event) => {
    selectStep(Number(event.target.value));
  });
  dom.inputField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitInput();
    }
  });
}

function renderExampleButtons() {
  dom.exampleStrip.innerHTML = "";

  EXAMPLES.forEach((example) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example-button";
    button.dataset.exampleId = example.id;
    button.textContent = example.label;
    button.addEventListener("click", () => {
      state.activeExampleId = example.id;
      dom.codeInput.value = example.code;
      persistDraft(example.code);
      clearStepExplorer();
      updateLineNumbers();
      syncLineNumbers();
      updateExampleButtons();
      dom.codeInput.focus();
    });
    dom.exampleStrip.appendChild(button);
  });

  updateExampleButtons();
}

function updateExampleButtons() {
  for (const button of dom.exampleStrip.querySelectorAll(".example-button")) {
    button.classList.toggle("active", button.dataset.exampleId === state.activeExampleId);
  }
}

function loadInitialCode() {
  const requestedExample = getRequestedExample();
  const savedCode = localStorage.getItem(STORAGE_KEY);
  const defaultExample = requestedExample || getExampleById(DEFAULT_EXAMPLE_ID) || EXAMPLES[0];

  state.autoInputs = getAutoInputs();
  state.activeExampleId = defaultExample.id;
  dom.codeInput.value = requestedExample ? defaultExample.code : savedCode || defaultExample.code;
  updateExampleButtons();
}

function handleCodeInput() {
  updateLineNumbers();
  persistDraft(dom.codeInput.value);

  if (state.executionSteps.length && dom.codeInput.value !== state.lastExecutedSource) {
    clearStepExplorer();
  }
}

function persistDraft(code) {
  localStorage.setItem(STORAGE_KEY, code);
}

function updateLineNumbers() {
  const lines = dom.codeInput.value.split("\n").length || 1;
  const activeLine = getHighlightedLine();
  const html = Array.from({ length: lines }, (_, index) => {
    const lineNumber = index + 1;
    const activeClass = activeLine === lineNumber ? " active" : "";
    return `<div class="line-number-item${activeClass}">${lineNumber}</div>`;
  }).join("");
  dom.lineNumbers.innerHTML = html;
}

function getHighlightedLine() {
  if (state.currentStepIndex < 0 || !state.executionSteps.length) {
    return null;
  }

  const snapshot = state.executionSteps[state.currentStepIndex];
  return snapshot?.line ?? null;
}

function syncLineNumbers() {
  dom.lineNumbers.scrollTop = dom.codeInput.scrollTop;
}

function handleEditorKeydown(event) {
  if (event.key === "Tab") {
    event.preventDefault();
    insertAtCursor("    ");
    return;
  }

  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    executeCode();
  }
}

function insertAtCursor(text) {
  const { selectionStart, selectionEnd, value } = dom.codeInput;
  dom.codeInput.value = `${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`;
  dom.codeInput.selectionStart = dom.codeInput.selectionEnd = selectionStart + text.length;
  updateLineNumbers();
  persistDraft(dom.codeInput.value);
}

function resetWorkspace() {
  dom.codeInput.value = "";
  dom.codeInput.focus();
  localStorage.removeItem(STORAGE_KEY);
  state.lastResult = null;
  state.lastExecutedSource = "";
  clearStepExplorer();
  updateLineNumbers();
  syncLineNumbers();
  renderConsole("", "");
  renderEmptyState();
  dom.variableCount.textContent = "0개 변수";
}

async function startLoad() {
  setEngineStatus("엔진 로딩 중", "loading");
  setLoadProgress(5, "Pyodide 엔진 초기화 중");
  dom.loadError.hidden = true;
  dom.retryLoadButton.hidden = true;
  dom.loadingOverlay.hidden = false;

  try {
    if (typeof loadPyodide !== "function") {
      throw new Error("Pyodide 스크립트를 불러오지 못했습니다.");
    }

    await wait(120);
    setLoadProgress(20, "Python 인터프리터 다운로드 중");

    state.pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX });

    setLoadProgress(75, "표준 라이브러리 로드 중");
    await state.pyodide.runPythonAsync(`
import ast
import builtins
import contextlib
import inspect
import io
import json
import sys
import traceback
import types
`);

    setLoadProgress(100, "준비 완료!");
    setEngineStatus("엔진 준비 완료", "ready");
    dom.runButton.disabled = false;
    await wait(260);
    dom.loadingOverlay.hidden = true;
    await maybeRunAutotest();
  } catch (error) {
    dom.runButton.disabled = true;
    setEngineStatus("엔진 로드 실패", "error");
    dom.loadError.hidden = false;
    dom.loadError.textContent = formatJavascriptError(error);
    dom.retryLoadButton.hidden = false;
  }
}

function setLoadProgress(percent, message) {
  dom.loadMessage.textContent = message;
  dom.progressBar.style.width = `${percent}%`;
  dom.progressText.textContent = `${percent}%`;
}

function setEngineStatus(label, tone) {
  dom.engineStatus.textContent = label;
  dom.engineStatus.className = `status-pill status-${tone}`;
}

async function executeCode() {
  if (!state.pyodide || state.isRunning) {
    return null;
  }

  const source = dom.codeInput.value;
  state.currentSourceLines = source.split("\n");
  state.lastExecutedSource = source;
  persistDraft(source);
  clearStepExplorer();
  state.isRunning = true;
  dom.runButton.disabled = true;
  setEngineStatus("코드 실행 중", "running");

  try {
    const rawResult = await state.pyodide.runPythonAsync(buildRunnerScript(source));
    const result = JSON.parse(rawResult);
    state.lastResult = result;
    renderConsole(result.stdout, result.error || result.stderr);

    if (Array.isArray(result.steps) && result.steps.length) {
      setupStepExplorer(result, source);
    } else {
      renderVariables(result.variables);
    }

    setEngineStatus(result.error ? "에러 확인 필요" : "실행 완료", result.error ? "warning" : "ready");
    return result;
  } catch (error) {
    renderConsole("", formatJavascriptError(error));
    renderEmptyState("실행 중 자바스크립트 오류가 발생했습니다.");
    dom.variableCount.textContent = "0개 변수";
    setEngineStatus("실행 실패", "error");
    return null;
  } finally {
    state.isRunning = false;
    dom.runButton.disabled = false;
  }
}

function setupStepExplorer(result, source) {
  state.executionSteps = result.steps;
  state.stepsTruncated = Boolean(result.steps_truncated);
  state.currentSourceLines = source.split("\n");

  dom.stepExplorer.hidden = false;
  dom.stepRange.min = "0";
  dom.stepRange.max = String(Math.max(0, state.executionSteps.length - 1));
  dom.stepTruncatedNote.hidden = !state.stepsTruncated;

  const requestedStep = getRequestedStepIndex(state.executionSteps.length);
  const initialIndex = requestedStep ?? state.executionSteps.length - 1;
  selectStep(initialIndex);
}

function clearStepExplorer() {
  state.executionSteps = [];
  state.currentStepIndex = -1;
  state.stepsTruncated = false;

  dom.stepExplorer.hidden = true;
  dom.stepCounter.textContent = "0 / 0";
  dom.stepRange.min = "0";
  dom.stepRange.max = "0";
  dom.stepRange.value = "0";
  dom.stepLineBadge.textContent = "0행";
  dom.stepPhaseText.textContent = "실행 기록 없음";
  dom.stepLineText.textContent = "코드를 실행하면 각 줄이 끝날 때마다 변수 변화가 기록됩니다.";
  dom.frameStack.innerHTML = "";
  dom.activeLocals.innerHTML = "";
  dom.stepTruncatedNote.hidden = true;
  updateLineNumbers();
}

function selectStep(index) {
  if (!state.executionSteps.length) {
    return;
  }

  const safeIndex = Math.min(Math.max(index, 0), state.executionSteps.length - 1);
  const snapshot = state.executionSteps[safeIndex];

  state.currentStepIndex = safeIndex;
  dom.stepRange.value = String(safeIndex);
  dom.stepCounter.textContent = `${safeIndex + 1} / ${state.executionSteps.length}`;
  dom.stepLineBadge.textContent = `${snapshot.line}행`;
  dom.stepPhaseText.textContent = `${snapshot.frame_label} 실행 후`;
  dom.stepLineText.textContent = getSourceLine(snapshot.line);
  renderFrameStack(snapshot.frames || []);
  renderActiveLocals(snapshot.active_locals || [], snapshot.frame_label);
  renderVariables(snapshot.globals || []);
  updateStepControls();
  updateLineNumbers();
}

function updateStepControls() {
  const hasSteps = state.executionSteps.length > 0;
  const isFirst = state.currentStepIndex <= 0;
  const isLast = state.currentStepIndex >= state.executionSteps.length - 1;

  dom.firstStepButton.disabled = !hasSteps || isFirst;
  dom.prevStepButton.disabled = !hasSteps || isFirst;
  dom.nextStepButton.disabled = !hasSteps || isLast;
  dom.lastStepButton.disabled = !hasSteps || isLast;
  dom.stepRange.disabled = !hasSteps;
}

function renderFrameStack(frames) {
  dom.frameStack.innerHTML = "";

  if (!frames.length) {
    const pill = document.createElement("div");
    pill.className = "frame-pill active";
    pill.textContent = "Global Frame";
    dom.frameStack.appendChild(pill);
    return;
  }

  frames.forEach((frame, index) => {
    const pill = document.createElement("div");
    pill.className = `frame-pill${index === frames.length - 1 ? " active" : ""}`;
    pill.textContent = `${frame.label} · ${frame.line}행`;
    dom.frameStack.appendChild(pill);
  });
}

function renderActiveLocals(localVariables, frameLabel) {
  dom.activeLocals.innerHTML = "";

  if (!localVariables.length) {
    const empty = document.createElement("div");
    empty.className = "local-chip local-empty";
    empty.textContent =
      frameLabel === "Global Frame"
        ? "현재 단계는 Global Frame 기준으로 보여주고 있습니다."
        : "현재 함수 프레임에는 보여줄 지역 변수가 없습니다.";
    dom.activeLocals.appendChild(empty);
    return;
  }

  localVariables.forEach((variable) => {
    const chip = document.createElement("div");
    chip.className = "local-chip";
    chip.textContent = buildLocalSummary(variable);
    dom.activeLocals.appendChild(chip);
  });
}

function buildLocalSummary(variable) {
  const normalizedType = normalizeType(variable.type);

  if (["str", "int", "float", "bool", "none"].includes(normalizedType)) {
    return `${variable.name} = ${variable.repr}`;
  }

  if (["list", "tuple", "set"].includes(normalizedType)) {
    const count = variable.items?.length ?? 0;
    const suffix = variable.truncated ? "+" : "";
    return `${variable.name} · ${TYPE_LABELS[normalizedType]} ${count}${suffix}개`;
  }

  if (normalizedType === "dict") {
    const count = variable.entries?.length ?? 0;
    const suffix = variable.truncated ? "+" : "";
    return `${variable.name} · dict ${count}${suffix}쌍`;
  }

  if (normalizedType === "function") {
    return `def ${variable.signature}`;
  }

  return `${variable.name} = ${variable.repr || "표시할 수 없는 값"}`;
}

function getSourceLine(lineNumber) {
  const line = state.currentSourceLines[lineNumber - 1] ?? "";
  const trimmed = line.trim();

  if (!trimmed) {
    return `${lineNumber}행: (빈 줄 또는 블록 경계)`;
  }

  return `${lineNumber}행: ${trimmed}`;
}

function renderConsole(stdout, errorText) {
  dom.consoleOutput.innerHTML = "";

  if (!stdout && !errorText) {
    const placeholder = document.createElement("p");
    placeholder.className = "console-placeholder";
    placeholder.textContent = "아직 실행한 코드가 없습니다.";
    dom.consoleOutput.appendChild(placeholder);
    return;
  }

  if (stdout) {
    const block = document.createElement("pre");
    block.className = "console-stream stdout";
    block.textContent = stdout;
    dom.consoleOutput.appendChild(block);
  }

  if (errorText) {
    const block = document.createElement("pre");
    block.className = "console-stream stderr";
    block.textContent = errorText;
    dom.consoleOutput.appendChild(block);
  }

  dom.consoleOutput.scrollTop = dom.consoleOutput.scrollHeight;
}

function renderVariables(variables) {
  dom.variableCount.textContent = `${variables.length}개 변수`;
  dom.visualizationGrid.innerHTML = "";

  if (!variables.length) {
    renderEmptyState();
    return;
  }

  variables.forEach((variable, index) => {
    const card = document.createElement("article");
    const normalizedType = normalizeType(variable.type);
    card.className = "var-card";
    card.dataset.type = normalizedType;
    card.style.transitionDelay = `${index * 70}ms`;
    card.appendChild(createCardHeader(variable, normalizedType));
    card.appendChild(createCardBody(variable, normalizedType));
    dom.visualizationGrid.appendChild(card);
    requestAnimationFrame(() => card.classList.add("visible"));
  });
}

function createCardHeader(variable, normalizedType) {
  const header = document.createElement("div");
  header.className = "var-card-header";

  const name = document.createElement("div");
  name.className = "var-name";
  name.textContent = variable.name;

  const typeTag = document.createElement("div");
  typeTag.className = "type-tag";
  typeTag.textContent = TYPE_LABELS[normalizedType] ?? variable.type;

  header.append(name, typeTag);
  return header;
}

function createCardBody(variable, normalizedType) {
  if (["str", "int", "float", "bool", "none"].includes(normalizedType)) {
    return createSimpleValue(variable.repr);
  }

  if (["list", "tuple", "set"].includes(normalizedType)) {
    return createCollectionView(variable);
  }

  if (normalizedType === "dict") {
    return createDictView(variable);
  }

  if (normalizedType === "function") {
    const code = document.createElement("div");
    code.className = "function-pill";
    code.textContent = `def ${variable.signature}`;
    return code;
  }

  return createUnknownValue(variable.repr || "표시할 수 없는 값");
}

function createSimpleValue(text) {
  const value = document.createElement("div");
  value.className = "simple-value";
  value.textContent = text;
  return value;
}

function createUnknownValue(text) {
  const value = document.createElement("div");
  value.className = "unknown-value";
  value.textContent = text;
  return value;
}

function createCollectionView(variable) {
  const wrapper = document.createElement("div");
  const strip = document.createElement("div");
  strip.className = "cell-strip";

  (variable.items || []).forEach((item, index) => {
    const cell = document.createElement("div");
    cell.className = "value-cell";

    const indexChip = document.createElement("div");
    indexChip.className = "cell-index";
    indexChip.textContent = variable.type === "set" ? "item" : index;

    const valueChip = document.createElement("div");
    valueChip.className = "value-chip";
    valueChip.textContent = item;

    cell.append(indexChip, valueChip);
    strip.appendChild(cell);
  });

  wrapper.appendChild(strip);

  if (variable.truncated) {
    const note = document.createElement("p");
    note.className = "truncate-note";
    note.textContent = "일부 항목만 보여주고 있습니다.";
    wrapper.appendChild(note);
  }

  return wrapper;
}

function createDictView(variable) {
  const wrapper = document.createElement("div");
  const table = document.createElement("table");
  table.className = "dict-table";

  const headRow = document.createElement("tr");
  ["Key", "Value"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  });

  const thead = document.createElement("thead");
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  (variable.entries || []).forEach((entry) => {
    const row = document.createElement("tr");
    const key = document.createElement("td");
    const value = document.createElement("td");
    key.textContent = entry.key;
    value.textContent = entry.value;
    row.append(key, value);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);

  if (variable.truncated) {
    const note = document.createElement("p");
    note.className = "truncate-note";
    note.textContent = "일부 키만 보여주고 있습니다.";
    wrapper.appendChild(note);
  }

  return wrapper;
}

function renderEmptyState(message) {
  dom.visualizationGrid.innerHTML = "";

  const card = document.createElement("article");
  card.className = "empty-state";
  card.innerHTML = `
    <svg viewBox="0 0 180 140" aria-hidden="true">
      <path
        d="M24 88c0-18 15-33 33-33 4 0 9 1 13 3 6-14 20-23 36-23 18 0 33 11 39 27 3-1 6-2 10-2 12 0 21 9 21 21s-9 21-21 21H47c-13 0-23-10-23-23z"
        fill="#fff7d6"
      ></path>
      <circle cx="84" cy="70" r="18" fill="#ffffff"></circle>
      <circle cx="77" cy="67" r="3.8" fill="#213547"></circle>
      <circle cx="91" cy="67" r="3.8" fill="#213547"></circle>
      <path
        d="M77 79c3 4 12 4 15 0"
        fill="none"
        stroke="#213547"
        stroke-linecap="round"
        stroke-width="3"
      ></path>
      <circle cx="65" cy="77" r="5" fill="#ffcad4" opacity="0.8"></circle>
      <circle cx="103" cy="77" r="5" fill="#ffcad4" opacity="0.8"></circle>
    </svg>
    <h3>코드를 실행하면 변수 카드가 나타나요</h3>
    <p>${message || "오른쪽 패널에서 변수의 타입과 값을 한눈에 읽을 수 있게 정리해 드립니다."}</p>
  `;
  dom.visualizationGrid.appendChild(card);
}

function normalizeType(type) {
  if (type === "None") {
    return "none";
  }

  if (type === "frozenset") {
    return "set";
  }

  if (TYPE_LABELS[type]) {
    return type;
  }

  return "other";
}

function getExampleById(id) {
  return EXAMPLES.find((example) => example.id === id) ?? null;
}

function getRequestedExample() {
  const searchParams = new URLSearchParams(window.location.search);
  const exampleId = searchParams.get("example");
  return exampleId ? getExampleById(exampleId) : null;
}

function getAutoInputs() {
  const searchParams = new URLSearchParams(window.location.search);
  const encoded = searchParams.get("autofill");

  if (!encoded) {
    return [];
  }

  return encoded
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getRequestedStepIndex(totalSteps) {
  const searchParams = new URLSearchParams(window.location.search);
  const raw = searchParams.get("step");

  if (!raw || totalSteps <= 0) {
    return null;
  }

  if (raw === "first") {
    return 0;
  }

  if (raw === "last") {
    return totalSteps - 1;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const humanIndex = Math.max(1, Math.floor(parsed));
  return Math.min(humanIndex - 1, totalSteps - 1);
}

function buildRunnerScript(source) {
  return `
import ast
import builtins
import contextlib
import inspect
import io
import json
import sys
import traceback
import types

import js

__source = ${JSON.stringify(source)}
__STEP_LIMIT = 400
__steps = []
__steps_truncated = False
__trace_state = {}

async def __codex_input(prompt=''):
    sys.stdout.write(str(prompt))
    result = await js._js_input(str(prompt))
    sys.stdout.write(str(result) + "\\n")
    return result

async def __codex_maybe_await(value):
    if inspect.isawaitable(value):
        return await value
    return value

class __CodexInputTransformer(ast.NodeTransformer):
    def visit_Call(self, node):
        self.generic_visit(node)
        is_input_name = isinstance(node.func, ast.Name) and node.func.id == 'input'
        is_builtins_input = (
            isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == 'builtins'
            and node.func.attr == 'input'
        )
        if is_input_name or is_builtins_input:
            wrapped = ast.Call(
                func=ast.Name(id='__codex_maybe_await', ctx=ast.Load()),
                args=[node],
                keywords=[]
            )
            return ast.copy_location(ast.Await(value=wrapped), node)
        return node

def __short_repr(value, limit=80):
    text = repr(value)
    if len(text) <= limit:
        return text
    return text[: limit - 1] + '…'

def __serialize_value(value):
    value_type = type(value).__name__

    if value_type == 'NoneType':
        return {'type': 'None', 'repr': 'None'}

    if value_type in ('int', 'float', 'bool'):
        return {'type': value_type, 'repr': repr(value)}

    if value_type == 'str':
        return {'type': 'str', 'repr': repr(value)}

    if value_type == 'list':
        return {
            'type': 'list',
            'items': [__short_repr(item, 50) for item in value[:30]],
            'truncated': len(value) > 30,
        }

    if value_type == 'tuple':
        return {
            'type': 'tuple',
            'items': [__short_repr(item, 50) for item in value[:30]],
            'truncated': len(value) > 30,
        }

    if value_type in ('set', 'frozenset'):
        items = sorted((__short_repr(item, 50) for item in value), key=str)[:30]
        return {
            'type': value_type,
            'items': items,
            'truncated': len(value) > 30,
        }

    if value_type == 'dict':
        entries = []
        for key, item in list(value.items())[:20]:
            entries.append({'key': __short_repr(key, 40), 'value': __short_repr(item, 60)})
        return {
            'type': 'dict',
            'entries': entries,
            'truncated': len(value) > 20,
        }

    if inspect.isfunction(value) or inspect.isbuiltin(value):
        try:
            signature = str(inspect.signature(value))
        except Exception:
            signature = '()'
        return {
            'type': 'function',
            'signature': f"{getattr(value, '__name__', 'function')}{signature}",
        }

    return {'type': value_type, 'repr': __short_repr(value)}

def __serialize_scope(scope):
    variables = []
    for name, value in scope.items():
        if name.startswith('_'):
            continue
        if name in {'ast', 'builtins', 'contextlib', 'inspect', 'io', 'json', 'sys', 'traceback', 'types', 'js'}:
            continue
        if isinstance(value, types.ModuleType):
            continue
        try:
            payload = __serialize_value(value)
        except Exception:
            continue
        payload['name'] = name
        variables.append(payload)
    variables.sort(key=lambda item: item['name'])
    return variables

def __collect_variables(scope):
    return __serialize_scope(scope)

def __frame_label(frame):
    return 'Global Frame' if frame.f_code.co_name == '<module>' else frame.f_code.co_name

def __build_stack(frame):
    stack = []
    current = frame
    while current is not None:
        if current.f_code.co_filename == '<student_code>':
            locals_payload = []
            if current.f_code.co_name != '<module>':
                locals_payload = __serialize_scope(current.f_locals)
            stack.append({
                'label': __frame_label(current),
                'line': current.f_lineno,
                'locals': locals_payload,
            })
        current = current.f_back
    stack.reverse()
    return stack

def __append_step(executed_line, frame):
    global __steps_truncated
    if __steps_truncated:
        return
    if len(__steps) >= __STEP_LIMIT:
        __steps_truncated = True
        return

    frames = __build_stack(frame)
    active_locals = frames[-1]['locals'] if frames else []
    active_label = frames[-1]['label'] if frames else 'Global Frame'
    __steps.append({
        'line': executed_line,
        'globals': __collect_variables(__scope),
        'frames': frames,
        'active_locals': active_locals,
        'frame_label': active_label,
    })

def __tracer(frame, event, arg):
    if frame.f_code.co_filename != '<student_code>':
        return __tracer

    frame_id = id(frame)

    if event == 'line':
        previous_line = __trace_state.get(frame_id)
        if previous_line is not None:
            __append_step(previous_line, frame)
        __trace_state[frame_id] = frame.f_lineno
        return __tracer

    if event == 'return':
        previous_line = __trace_state.pop(frame_id, None)
        if previous_line is not None:
            __append_step(previous_line, frame)
        return __tracer

    return __tracer

__scope = {
    '__name__': '__main__',
    '__codex_maybe_await': __codex_maybe_await,
}
__stdout = io.StringIO()
__stderr = io.StringIO()
__error = ''
__original_input = builtins.input
builtins.input = __codex_input

try:
    __tree = ast.parse(__source, filename='<student_code>', mode='exec')
    __tree = __CodexInputTransformer().visit(__tree)
    ast.fix_missing_locations(__tree)
    __code = compile(__tree, filename='<student_code>', mode='exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    sys.settrace(__tracer)
    with contextlib.redirect_stdout(__stdout), contextlib.redirect_stderr(__stderr):
        __result = eval(__code, __scope, __scope)
        if inspect.isawaitable(__result):
            await __result
except Exception:
    __tb = traceback.format_exc().strip().splitlines()
    __error = '\\n'.join(__tb[-4:])
finally:
    sys.settrace(None)
    builtins.input = __original_input

json.dumps({
    'stdout': __stdout.getvalue(),
    'stderr': __stderr.getvalue(),
    'error': __error,
    'variables': __collect_variables(__scope),
    'steps': __steps,
    'steps_truncated': __steps_truncated,
}, ensure_ascii=False)
`;
}

function formatJavascriptError(error) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  return String(error);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function submitInput() {
  if (!state.inputResolve) {
    return;
  }

  const value = dom.inputField.value;
  const resolve = state.inputResolve;
  state.inputResolve = null;
  dom.inputField.value = "";
  dom.inputModal.hidden = true;
  resolve(value);
}

window._js_input = function _jsInput(promptText) {
  if (state.autoInputs.length) {
    return Promise.resolve(state.autoInputs.shift());
  }

  return new Promise((resolve) => {
    state.inputResolve = resolve;
    dom.inputPrompt.textContent = promptText || "입력값을 적어주세요";
    dom.inputModal.hidden = false;
    window.setTimeout(() => dom.inputField.focus(), 30);
  });
};

async function maybeRunAutotest() {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get("autotest") !== "1") {
    return;
  }

  const example = getRequestedExample() || getExampleById(DEFAULT_EXAMPLE_ID) || EXAMPLES[0];
  state.activeExampleId = example.id;
  dom.codeInput.value = example.code;
  updateExampleButtons();
  updateLineNumbers();

  try {
    const result = await executeCode();
    const selectedStep =
      state.currentStepIndex >= 0 ? state.executionSteps[state.currentStepIndex] : null;
    const passed = Boolean(result && !result.error && result.variables.length >= 1);

    dom.autotestHook.hidden = false;
    dom.autotestHook.dataset.status = passed ? "pass" : "fail";
    dom.autotestHook.dataset.steps = String(result?.steps?.length ?? 0);
    dom.autotestHook.dataset.line = String(selectedStep?.line ?? 0);
    dom.autotestHook.textContent = passed
      ? `PASS:${result.variables.map((variable) => variable.name).join(",")}|steps:${result.steps.length}|line:${selectedStep?.line ?? 0}`
      : `FAIL:${result?.error || "unknown"}`;
  } catch (error) {
    dom.autotestHook.hidden = false;
    dom.autotestHook.dataset.status = "fail";
    dom.autotestHook.textContent = `FAIL:${formatJavascriptError(error)}`;
  }
}
