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
  isPlaying: false,
  inputResolve: null,
  activeExampleId: DEFAULT_EXAMPLE_ID,
  autoInputs: [],
  executionSteps: [],
  stepDiffs: [],
  playSpeed: 900,
  playTimerId: null,
  currentStepIndex: -1,
  currentSourceLines: [],
  stepsTruncated: false,
  lastResult: null,
  lastExecutedSource: "",
  sceneNodeOverrides: {},
  activeDrag: null,
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
  dom.workspace = document.getElementById("workspace");
  dom.connectionSvg = document.getElementById("connectionSvg");
  dom.codeInput = document.getElementById("codeInput");
  dom.lineNumbers = document.getElementById("lineNumbers");
  dom.consoleOutput = document.getElementById("consoleOutput");
  dom.visualizationStage = document.getElementById("visualizationStage");
  dom.visualizationGrid = document.getElementById("visualizationGrid");
  dom.variableCount = document.getElementById("variableCount");
  dom.engineStatus = document.getElementById("engineStatus");
  dom.exampleStrip = document.getElementById("exampleStrip");
  dom.runButton = document.getElementById("runButton");
  dom.stepRunButton = document.getElementById("stepRunButton");
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
  dom.playPauseButton = document.getElementById("playPauseButton");
  dom.playbackSpeed = document.getElementById("playbackSpeed");
  dom.stepRange = document.getElementById("stepRange");
  dom.stepLineBadge = document.getElementById("stepLineBadge");
  dom.stepPhaseText = document.getElementById("stepPhaseText");
  dom.stepLineText = document.getElementById("stepLineText");
  dom.sceneCodeLine = document.getElementById("sceneCodeLine");
  dom.frameStack = document.getElementById("frameStack");
  dom.activeLocals = document.getElementById("activeLocals");
  dom.stepTruncatedNote = document.getElementById("stepTruncatedNote");
  dom.autotestHook = document.getElementById("autotestHook");
}

function bindEvents() {
  dom.codeInput.addEventListener("input", handleCodeInput);
  dom.codeInput.addEventListener("scroll", syncLineNumbers);
  dom.codeInput.addEventListener("keydown", handleEditorKeydown);
  window.addEventListener("resize", handleSceneResize);
  window.addEventListener("pointermove", handleNodeDragMove);
  window.addEventListener("pointerup", handleNodeDragEnd);
  window.addEventListener("pointercancel", handleNodeDragEnd);
  dom.runButton.addEventListener("click", () => executeCode());
  dom.stepRunButton.addEventListener("click", () => executeCode({ initialStepIndex: 0 }));
  dom.resetButton.addEventListener("click", resetWorkspace);
  dom.retryLoadButton.addEventListener("click", startLoad);
  dom.submitInputButton.addEventListener("click", submitInput);
  dom.playPauseButton.addEventListener("click", togglePlayback);
  dom.playbackSpeed.addEventListener("change", handlePlaybackSpeedChange);
  dom.firstStepButton.addEventListener("click", () => navigateToStep(0));
  dom.prevStepButton.addEventListener("click", () => navigateToStep(state.currentStepIndex - 1));
  dom.nextStepButton.addEventListener("click", () => navigateToStep(state.currentStepIndex + 1));
  dom.lastStepButton.addEventListener("click", () => navigateToStep(state.executionSteps.length - 1));
  dom.stepRange.addEventListener("input", (event) => {
    navigateToStep(Number(event.target.value));
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
      stopPlayback();
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
  redrawSceneConnections();
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
  stopPlayback();
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
import time
import traceback
import types
`);

    setLoadProgress(100, "준비 완료!");
    setEngineStatus("엔진 준비 완료", "ready");
    dom.runButton.disabled = false;
    dom.stepRunButton.disabled = false;
    await wait(260);
    dom.loadingOverlay.hidden = true;
    await maybeRunAutotest();
  } catch (error) {
    dom.runButton.disabled = true;
    dom.stepRunButton.disabled = true;
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

async function executeCode(options = {}) {
  if (!state.pyodide || state.isRunning) {
    return null;
  }

  stopPlayback();
  const source = dom.codeInput.value;
  state.currentSourceLines = source.split("\n");
  state.lastExecutedSource = source;
  persistDraft(source);
  clearStepExplorer();
  state.isRunning = true;
  dom.runButton.disabled = true;
  dom.stepRunButton.disabled = true;
  setEngineStatus("코드 실행 중", "running");

  try {
    const rawResult = await state.pyodide.runPythonAsync(buildRunnerScript(source));
    const result = JSON.parse(rawResult);
    state.lastResult = result;
    renderConsole(result.stdout, result.error || result.stderr);

    if (Array.isArray(result.steps) && result.steps.length) {
      setupStepExplorer(result, source, options);
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
    dom.stepRunButton.disabled = false;
  }
}

function setupStepExplorer(result, source, options = {}) {
  state.executionSteps = result.steps;
  state.stepDiffs = buildStepDiffs(result.steps);
  state.stepsTruncated = Boolean(result.steps_truncated);
  state.currentSourceLines = source.split("\n");

  dom.stepExplorer.hidden = false;
  dom.stepRange.min = "0";
  dom.stepRange.max = String(Math.max(0, state.executionSteps.length - 1));
  dom.stepTruncatedNote.hidden = !state.stepsTruncated;

  const explicitInitialStep = Number.isInteger(options.initialStepIndex) ? options.initialStepIndex : null;
  const requestedStep = explicitInitialStep === null ? getRequestedStepIndex(state.executionSteps.length) : null;
  const initialIndex =
    explicitInitialStep ?? requestedStep ?? state.executionSteps.length - 1;
  selectStep(initialIndex);
}

function clearStepExplorer() {
  stopPlayback();
  resetSceneNodeOverrides();
  state.executionSteps = [];
  state.stepDiffs = [];
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
  resetSceneCodeLine();
  dom.frameStack.innerHTML = "";
  dom.activeLocals.innerHTML = "";
  dom.stepTruncatedNote.hidden = true;
  updatePlayControls();
  updateLineNumbers();
}

function navigateToStep(index) {
  stopPlayback();
  selectStep(index);
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
  updateLineNumbers();
  renderSceneCodeLine(snapshot, state.stepDiffs[safeIndex] || null);
  renderFrameStack(snapshot.frames || []);
  renderActiveLocals(snapshot.active_locals || [], snapshot.frame_label);
  renderVariables(snapshot.globals || [], state.stepDiffs[safeIndex] || null);
  updateStepControls();
  redrawSceneConnections();
}

function updateStepControls() {
  const hasSteps = state.executionSteps.length > 0;
  const isFirst = state.currentStepIndex <= 0;
  const isLast = state.currentStepIndex >= state.executionSteps.length - 1;

  dom.playPauseButton.disabled = !hasSteps;
  dom.firstStepButton.disabled = !hasSteps || isFirst;
  dom.prevStepButton.disabled = !hasSteps || isFirst;
  dom.nextStepButton.disabled = !hasSteps || isLast;
  dom.lastStepButton.disabled = !hasSteps || isLast;
  dom.stepRange.disabled = !hasSteps;
  dom.playbackSpeed.disabled = !hasSteps;
  updatePlayControls();
}

function updatePlayControls() {
  const canPlay = state.executionSteps.length > 0;
  dom.playPauseButton.textContent = state.isPlaying ? "⏸ 일시정지" : "▶ 재생";
  dom.playPauseButton.classList.toggle("is-playing", state.isPlaying);
  dom.playPauseButton.disabled = !canPlay;
}

function handlePlaybackSpeedChange(event) {
  const parsed = Number(event.target.value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return;
  }
  state.playSpeed = parsed;
}

function togglePlayback() {
  if (!state.executionSteps.length) {
    return;
  }

  if (state.isPlaying) {
    stopPlayback();
    return;
  }

  if (state.currentStepIndex >= state.executionSteps.length - 1 || state.currentStepIndex < 0) {
    selectStep(0);
  }

  state.isPlaying = true;
  updatePlayControls();
  scheduleNextPlaybackStep();
}

function scheduleNextPlaybackStep() {
  if (!state.isPlaying) {
    return;
  }

  if (state.currentStepIndex >= state.executionSteps.length - 1) {
    stopPlayback();
    return;
  }

  state.playTimerId = window.setTimeout(() => {
    selectStep(state.currentStepIndex + 1);
    scheduleNextPlaybackStep();
  }, state.playSpeed);
}

function stopPlayback() {
  if (state.playTimerId !== null) {
    window.clearTimeout(state.playTimerId);
    state.playTimerId = null;
  }

  state.isPlaying = false;
  updatePlayControls();
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

function getRawSourceLine(lineNumber) {
  return state.currentSourceLines[lineNumber - 1] ?? "";
}

function getSourceLine(lineNumber) {
  const line = getRawSourceLine(lineNumber);
  const trimmed = line.trim();

  if (!trimmed) {
    return `${lineNumber}행: (빈 줄 또는 블록 경계)`;
  }

  return `${lineNumber}행: ${trimmed}`;
}

function resetSceneCodeLine() {
  if (!dom.sceneCodeLine) {
    return;
  }

  dom.sceneCodeLine.innerHTML = "";

  const badge = document.createElement("span");
  badge.className = "scene-code-badge";
  badge.textContent = "0행";

  const text = document.createElement("div");
  text.className = "scene-code-text";
  text.textContent = "실행 중인 코드 줄이 여기에 나타납니다.";

  dom.sceneCodeLine.append(badge, text);
}

function renderSceneCodeLine(snapshot, diff) {
  if (!dom.sceneCodeLine) {
    return;
  }

  const badge = document.createElement("span");
  badge.className = "scene-code-badge";
  badge.textContent = `${snapshot?.line ?? 0}행`;

  const text = document.createElement("div");
  text.className = "scene-code-text";

  const parts = buildSceneLineParts(snapshot, diff);

  if (!parts.length) {
    text.textContent = "(빈 줄 또는 블록 경계)";
  } else {
    parts.forEach((part) => {
      if (part.type === "ref") {
        const span = document.createElement("span");
        span.className = `scene-var-ref tone-${part.tone}`;
        span.dataset.variableName = part.name;
        span.dataset.tone = part.tone;
        span.textContent = part.value;
        text.appendChild(span);
        return;
      }

      text.appendChild(document.createTextNode(part.value));
    });
  }

  dom.sceneCodeLine.innerHTML = "";
  dom.sceneCodeLine.append(badge, text);
}

function buildSceneLineParts(snapshot, diff) {
  const lineText = getRawSourceLine(snapshot?.line);
  if (!lineText) {
    return [];
  }

  return buildSceneTokenParts(lineText, {
    variableNames: new Set((snapshot?.globals || []).map((variable) => variable.name)),
    diff,
    seenCounts: new Map(),
  });
}

function buildSceneTokenParts(lineText, parserState) {
  const parts = [];
  let cursor = 0;

  while (cursor < lineText.length) {
    const stringToken = consumeSceneStringToken(lineText, cursor, parserState);
    if (stringToken) {
      parts.push(...stringToken.parts);
      cursor = stringToken.nextIndex;
      continue;
    }

    const char = lineText[cursor];
    if (/[A-Za-z_]/.test(char)) {
      let end = cursor + 1;
      while (end < lineText.length && /[A-Za-z0-9_]/.test(lineText[end])) {
        end += 1;
      }

      const token = lineText.slice(cursor, end);
      if (parserState.variableNames.has(token)) {
        const occurrence = (parserState.seenCounts.get(token) || 0) + 1;
        parserState.seenCounts.set(token, occurrence);
        parts.push({
          type: "ref",
          name: token,
          tone: getSceneTokenTone(token, parserState.diff, occurrence),
          value: token,
        });
      } else {
        parts.push({ type: "text", value: token });
      }
      cursor = end;
      continue;
    }

    let end = cursor + 1;
    while (end < lineText.length && !/[A-Za-z_'"]/.test(lineText[end])) {
      end += 1;
    }
    parts.push({ type: "text", value: lineText.slice(cursor, end) });
    cursor = end;
  }

  return mergeAdjacentTextParts(parts);
}

function consumeSceneStringToken(lineText, startIndex, parserState) {
  const stringStart = matchSceneStringStart(lineText, startIndex);
  if (!stringStart) {
    return null;
  }

  if (!stringStart.isFormatted) {
    const stringToken = consumeQuotedText(lineText, stringStart.quoteIndex, stringStart.quote);
    return {
      parts: [{ type: "text", value: lineText.slice(startIndex, stringToken.nextIndex) }],
      nextIndex: stringToken.nextIndex,
    };
  }

  return consumeFormattedString(lineText, startIndex, stringStart, parserState);
}

function matchSceneStringStart(lineText, startIndex) {
  const directQuote = lineText[startIndex];
  if (directQuote === "'" || directQuote === '"') {
    return {
      prefix: "",
      quote: directQuote,
      quoteIndex: startIndex,
      isFormatted: false,
    };
  }

  if (!/[A-Za-z]/.test(lineText[startIndex])) {
    return null;
  }

  let cursor = startIndex;
  while (cursor < lineText.length && /[A-Za-z]/.test(lineText[cursor])) {
    cursor += 1;
  }

  const prefix = lineText.slice(startIndex, cursor);
  const quote = lineText[cursor];
  if ((quote !== "'" && quote !== '"') || !isSupportedSceneStringPrefix(prefix)) {
    return null;
  }

  return {
    prefix,
    quote,
    quoteIndex: cursor,
    isFormatted: /f/i.test(prefix),
  };
}

function isSupportedSceneStringPrefix(prefix) {
  const normalized = prefix.toLowerCase();
  return ["r", "u", "b", "f", "br", "rb", "fr", "rf"].includes(normalized);
}

function consumeFormattedString(lineText, startIndex, stringStart, parserState) {
  const parts = [];
  const quote = stringStart.quote;
  let cursor = stringStart.quoteIndex + 1;
  let chunkStart = startIndex;

  while (cursor < lineText.length) {
    if (lineText[cursor] === "\\" && cursor + 1 < lineText.length) {
      cursor += 2;
      continue;
    }

    if (lineText[cursor] === "{") {
      if (lineText[cursor + 1] === "{") {
        cursor += 2;
        continue;
      }

      if (chunkStart < cursor) {
        parts.push({ type: "text", value: lineText.slice(chunkStart, cursor) });
      }

      parts.push({ type: "text", value: "{" });

      const expression = consumeFormattedExpression(lineText, cursor + 1);
      parts.push(...buildSceneTokenParts(expression.value, parserState));
      if (expression.closed) {
        parts.push({ type: "text", value: "}" });
      }

      cursor = expression.nextIndex;
      chunkStart = cursor;
      continue;
    }

    if (lineText[cursor] === "}" && lineText[cursor + 1] === "}") {
      cursor += 2;
      continue;
    }

    if (lineText[cursor] === quote) {
      cursor += 1;
      break;
    }

    cursor += 1;
  }

  if (chunkStart < cursor) {
    parts.push({ type: "text", value: lineText.slice(chunkStart, cursor) });
  }

  return {
    parts: mergeAdjacentTextParts(parts),
    nextIndex: cursor,
  };
}

function consumeFormattedExpression(lineText, startIndex) {
  let cursor = startIndex;
  let depth = 1;

  while (cursor < lineText.length) {
    const stringStart = matchSceneStringStart(lineText, cursor);
    if (stringStart) {
      const stringToken = consumeQuotedText(lineText, stringStart.quoteIndex, stringStart.quote);
      cursor = stringToken.nextIndex;
      continue;
    }

    if (lineText[cursor] === "{") {
      depth += 1;
      cursor += 1;
      continue;
    }

    if (lineText[cursor] === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          value: lineText.slice(startIndex, cursor),
          nextIndex: cursor + 1,
          closed: true,
        };
      }

      cursor += 1;
      continue;
    }

    if (lineText[cursor] === "\\" && cursor + 1 < lineText.length) {
      cursor += 2;
      continue;
    }

    cursor += 1;
  }

  return {
    value: lineText.slice(startIndex),
    nextIndex: lineText.length,
    closed: false,
  };
}

function consumeQuotedText(lineText, startIndex, quote = lineText[startIndex]) {
  let cursor = startIndex + 1;

  while (cursor < lineText.length) {
    if (lineText[cursor] === "\\" && cursor + 1 < lineText.length) {
      cursor += 2;
      continue;
    }

    if (lineText[cursor] === quote) {
      cursor += 1;
      break;
    }

    cursor += 1;
  }

  return {
    value: lineText.slice(startIndex, cursor),
    nextIndex: cursor,
  };
}

function mergeAdjacentTextParts(parts) {
  return parts.reduce((merged, part) => {
    const last = merged[merged.length - 1];
    if (part.type === "text" && last?.type === "text") {
      last.value += part.value;
      return merged;
    }

    merged.push(part);
    return merged;
  }, []);
}

function getSceneTokenTone(variableName, diff, occurrence) {
  if (occurrence === 1 && diff?.created.includes(variableName)) {
    return "create";
  }

  if (occurrence === 1 && diff?.updated.includes(variableName)) {
    return "update";
  }

  return "read";
}

function handleSceneResize() {
  if (!dom.visualizationGrid) {
    return;
  }

  const cards = Array.from(dom.visualizationGrid.querySelectorAll(".var-card"));
  if (cards.length) {
    resolveSceneNodeCollisions(cards);
  }
  redrawSceneConnections();
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

function buildStepDiffs(steps) {
  return steps.map((step, index) =>
    diffStepVariables(index > 0 ? steps[index - 1]?.globals || [] : [], step?.globals || [])
  );
}

function diffStepVariables(previousVariables, currentVariables) {
  const previousMap = buildVariableLookup(previousVariables);
  const currentMap = buildVariableLookup(currentVariables);
  const created = [];
  const updated = [];
  const deleted = [];

  currentMap.forEach((signature, name) => {
    if (!previousMap.has(name)) {
      created.push(name);
      return;
    }

    if (previousMap.get(name) !== signature) {
      updated.push(name);
    }
  });

  previousMap.forEach((_, name) => {
    if (!currentMap.has(name)) {
      deleted.push(name);
    }
  });

  return { created, updated, deleted };
}

function buildVariableLookup(variables) {
  const lookup = new Map();

  variables.forEach((variable) => {
    lookup.set(variable.name, getVariableSignature(variable));
  });

  return lookup;
}

function getVariableSignature(variable) {
  return JSON.stringify({
    type: variable.type,
    repr: variable.repr ?? null,
    items: variable.items ?? null,
    entries: variable.entries ?? null,
    signature: variable.signature ?? null,
    truncated: Boolean(variable.truncated),
  });
}

function getVariableChangeTone(variableName, diff) {
  if (!diff) {
    return null;
  }

  if (diff.created.includes(variableName)) {
    return "create";
  }

  if (diff.updated.includes(variableName)) {
    return "update";
  }

  return null;
}

function renderVariables(variables, diff = null) {
  dom.variableCount.textContent = `${variables.length}개 변수`;
  dom.visualizationGrid.innerHTML = "";
  clearConnections();

  if (!variables.length) {
    renderEmptyState();
    return;
  }

  const layout = buildSceneLayout(variables);
  const renderedCards = [];

  variables.forEach((variable, index) => {
    const card = document.createElement("article");
    const normalizedType = normalizeType(variable.type);
    const changeTone = getVariableChangeTone(variable.name, diff);
    const position = getSceneNodePosition(variable.name, layout.get(variable.name) || { x: 50, y: 50 });
    card.id = `var-node-${variable.name}`;
    card.className = "var-card";
    card.dataset.type = normalizedType;
    card.dataset.variableName = variable.name;
    card.style.transitionDelay = `${index * 55}ms`;
    card.style.setProperty("--node-x", `${position.x}%`);
    card.style.setProperty("--node-y", `${position.y}%`);

    if (changeTone === "create") {
      card.classList.add("anim-create");
      card.appendChild(createChangeBadge("NEW", "var-badge-new"));
    } else if (changeTone === "update") {
      card.classList.add("anim-update");
      card.appendChild(createChangeBadge("CHANGED", "var-badge-changed"));
    }

    card.appendChild(createCardHeader(variable, normalizedType));
    card.appendChild(createCardBody(variable, normalizedType));
    attachSceneNodeDrag(card);
    dom.visualizationGrid.appendChild(card);
    renderedCards.push(card);
    requestAnimationFrame(() => card.classList.add("visible"));
  });

  requestAnimationFrame(() => {
    resolveSceneNodeCollisions(renderedCards);
    redrawSceneConnections();
  });
}

function buildSceneLayout(variables) {
  const groups = new Map([
    ["function", []],
    ["mapping", []],
    ["collection", []],
    ["scalar", []],
    ["other", []],
  ]);

  variables.forEach((variable) => {
    const normalizedType = normalizeType(variable.type);
    groups.get(getSceneGroupKey(normalizedType)).push({ variable, normalizedType });
  });

  const layout = new Map();
  layoutSceneGroup(groups.get("function"), { xMin: 64, xMax: 88, yMin: 16, yMax: 26, columns: 2 }, layout);
  layoutSceneGroup(groups.get("mapping"), { xMin: 24, xMax: 36, yMin: 28, yMax: 46, columns: 1 }, layout);
  layoutSceneGroup(
    groups.get("collection"),
    { xMin: 56, xMax: 84, yMin: 42, yMax: 62, columns: 2 },
    layout
  );
  layoutSceneGroup(groups.get("scalar"), { xMin: 18, xMax: 84, yMin: 70, yMax: 84, columns: 4 }, layout);
  layoutSceneGroup(groups.get("other"), { xMin: 16, xMax: 40, yMin: 16, yMax: 30, columns: 1 }, layout);

  return layout;
}

function getSceneNodePosition(variableName, fallbackPosition) {
  return state.sceneNodeOverrides[variableName] || fallbackPosition;
}

function saveSceneNodeOverride(variableName, x, y) {
  state.sceneNodeOverrides[variableName] = {
    x: clamp(x, 8, 92),
    y: clamp(y, 10, 90),
  };
}

function resetSceneNodeOverrides() {
  if (state.activeDrag?.card) {
    state.activeDrag.card.classList.remove("is-dragging");
  }

  state.activeDrag = null;
  state.sceneNodeOverrides = {};
}

function getSceneGroupKey(normalizedType) {
  if (normalizedType === "function") {
    return "function";
  }

  if (normalizedType === "dict") {
    return "mapping";
  }

  if (["list", "tuple", "set"].includes(normalizedType)) {
    return "collection";
  }

  if (["str", "int", "float", "bool", "none"].includes(normalizedType)) {
    return "scalar";
  }

  return "other";
}

function layoutSceneGroup(entries, area, layout) {
  if (!entries.length) {
    return;
  }

  const columns = Math.max(1, Math.min(area.columns, entries.length));
  const rows = Math.ceil(entries.length / columns);
  const spreadColumns = rows === 1 ? entries.length : columns;
  const stepX = spreadColumns <= 1 ? 0 : (area.xMax - area.xMin) / (spreadColumns - 1);
  const stepY = rows <= 1 ? 0 : (area.yMax - area.yMin) / (rows - 1);

  entries.forEach((entry, index) => {
    const column = rows === 1 ? index : index % columns;
    const row = rows === 1 ? 0 : Math.floor(index / columns);
    const seed = getNameSeed(entry.variable.name);
    const x = (spreadColumns <= 1 ? (area.xMin + area.xMax) / 2 : area.xMin + column * stepX) + (seed - 0.5) * 3.5;
    const y =
      (rows <= 1 ? (area.yMin + area.yMax) / 2 : area.yMin + row * stepY) +
      ((seed * 1.7) % 1 - 0.5) * 3;

    layout.set(entry.variable.name, {
      x: clamp(x, 10, 90),
      y: clamp(y, 12, 88),
    });
  });
}

function resolveSceneNodeCollisions(cards) {
  if (!cards.length || !dom.visualizationGrid) {
    return;
  }

  const stageWidth = dom.visualizationGrid.clientWidth;
  const stageHeight = dom.visualizationGrid.clientHeight;

  if (!stageWidth || !stageHeight) {
    return;
  }

  const padding = 18;
  const nodes = cards.map((card, index) => {
    const xPercent = parseFloat(card.style.getPropertyValue("--node-x")) || 50;
    const yPercent = parseFloat(card.style.getPropertyValue("--node-y")) || 50;
    return {
      card,
      index,
      width: Math.max(card.offsetWidth, 120),
      height: Math.max(card.offsetHeight, 56),
      x: (stageWidth * xPercent) / 100,
      y: (stageHeight * yPercent) / 100,
      homeX: (stageWidth * xPercent) / 100,
      homeY: (stageHeight * yPercent) / 100,
    };
  });

  for (let pass = 0; pass < 42; pass += 1) {
    let moved = false;

    for (let index = 0; index < nodes.length; index += 1) {
      const current = nodes[index];

      for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
        const other = nodes[otherIndex];
        let dx = other.x - current.x;
        let dy = other.y - current.y;
        const minDx = (current.width + other.width) / 2 + padding;
        const minDy = (current.height + other.height) / 2 + padding;

        if (Math.abs(dx) >= minDx || Math.abs(dy) >= minDy) {
          continue;
        }

        if (dx === 0 && dy === 0) {
          dx = current.index <= other.index ? -0.5 : 0.5;
          dy = current.index % 2 === 0 ? -0.5 : 0.5;
        }

        const overlapX = minDx - Math.abs(dx);
        const overlapY = minDy - Math.abs(dy);

        if (overlapX < overlapY) {
          const push = overlapX / 2 + 1;
          const direction = dx >= 0 ? 1 : -1;
          current.x -= push * direction;
          other.x += push * direction;
        } else {
          const push = overlapY / 2 + 1;
          const direction = dy >= 0 ? 1 : -1;
          current.y -= push * direction;
          other.y += push * direction;
        }

        moved = true;
      }
    }

    nodes.forEach((node) => {
      node.x += (node.homeX - node.x) * 0.035;
      node.y += (node.homeY - node.y) * 0.035;
      node.x = clamp(node.x, node.width / 2 + 12, stageWidth - node.width / 2 - 12);
      node.y = clamp(node.y, node.height / 2 + 10, stageHeight - node.height / 2 - 10);
    });

    if (!moved) {
      break;
    }
  }

  nodes.forEach((node) => {
    const xPercent = (node.x / stageWidth) * 100;
    const yPercent = (node.y / stageHeight) * 100;
    node.card.style.setProperty("--node-x", `${xPercent}%`);
    node.card.style.setProperty("--node-y", `${yPercent}%`);
    saveSceneNodeOverride(node.card.dataset.variableName, xPercent, yPercent);
  });
}

function attachSceneNodeDrag(card) {
  card.addEventListener("pointerdown", (event) => startNodeDrag(event, card));
}

function startNodeDrag(event, card) {
  if (event.button !== 0 || !dom.visualizationGrid) {
    return;
  }

  event.preventDefault();
  const cardRect = card.getBoundingClientRect();
  state.activeDrag = {
    pointerId: event.pointerId,
    card,
    variableName: card.dataset.variableName,
    offsetX: event.clientX - cardRect.left,
    offsetY: event.clientY - cardRect.top,
  };
  card.classList.add("is-dragging");
}

function handleNodeDragMove(event) {
  const drag = state.activeDrag;
  if (!drag || drag.pointerId !== event.pointerId || !dom.visualizationGrid) {
    return;
  }

  event.preventDefault();
  const gridRect = dom.visualizationGrid.getBoundingClientRect();
  const width = Math.max(drag.card.offsetWidth, 120);
  const height = Math.max(drag.card.offsetHeight, 56);
  const position = getScenePercentFromPointer(
    event.clientX,
    event.clientY,
    gridRect,
    width,
    height,
    drag.offsetX,
    drag.offsetY
  );

  drag.card.style.setProperty("--node-x", `${position.x}%`);
  drag.card.style.setProperty("--node-y", `${position.y}%`);
  saveSceneNodeOverride(drag.variableName, position.x, position.y);
  redrawSceneConnections();
}

function handleNodeDragEnd(event) {
  const drag = state.activeDrag;
  if (!drag || (event.pointerId !== undefined && drag.pointerId !== event.pointerId)) {
    return;
  }

  drag.card.classList.remove("is-dragging");
  state.activeDrag = null;
  redrawSceneConnections();
}

function getScenePercentFromPointer(
  clientX,
  clientY,
  gridRect,
  cardWidth,
  cardHeight,
  offsetX,
  offsetY
) {
  const centerX = clientX - gridRect.left - offsetX + cardWidth / 2;
  const centerY = clientY - gridRect.top - offsetY + cardHeight / 2;
  const clampedX = clamp(centerX, cardWidth / 2 + 10, gridRect.width - cardWidth / 2 - 10);
  const clampedY = clamp(centerY, cardHeight / 2 + 10, gridRect.height - cardHeight / 2 - 10);

  return {
    x: (clampedX / gridRect.width) * 100,
    y: (clampedY / gridRect.height) * 100,
  };
}

function getNameSeed(name) {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 33 + char.charCodeAt(0)) % 997;
  }
  return hash / 997;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createChangeBadge(label, toneClass) {
  const badge = document.createElement("div");
  badge.className = `var-badge ${toneClass}`;
  badge.textContent = label;
  return badge;
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
  value.textContent = truncatePreview(text, 34);
  return value;
}

function createUnknownValue(text) {
  const value = document.createElement("div");
  value.className = "unknown-value";
  value.textContent = truncatePreview(text, 34);
  return value;
}

function createCollectionView(variable) {
  const wrapper = document.createElement("div");
  const strip = document.createElement("div");
  strip.className = "cell-strip";

  (variable.items || []).slice(0, 4).forEach((item, index) => {
    const cell = document.createElement("div");
    cell.className = "value-cell";

    const indexChip = document.createElement("div");
    indexChip.className = "cell-index";
    indexChip.textContent = variable.type === "set" ? "item" : index;

    const valueChip = document.createElement("div");
    valueChip.className = "value-chip";
    valueChip.textContent = truncatePreview(item, 12);

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
  const entries = document.createElement("div");
  entries.className = "dict-entries";

  (variable.entries || []).slice(0, 3).forEach((entry) => {
    const chip = document.createElement("div");
    chip.className = "dict-entry";

    const key = document.createElement("span");
    key.className = "dict-entry-key";
    key.textContent = truncatePreview(entry.key, 10);

    const value = document.createElement("span");
    value.textContent = truncatePreview(entry.value, 14);

    chip.append(key, value);
    entries.appendChild(chip);
  });

  wrapper.appendChild(entries);

  if (variable.truncated) {
    const note = document.createElement("p");
    note.className = "truncate-note";
    note.textContent = "일부 키만 보여주고 있습니다.";
    wrapper.appendChild(note);
  }

  return wrapper;
}

function truncatePreview(text, limit = 26) {
  if (!text) {
    return "";
  }

  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1))}…`;
}

function redrawSceneConnections() {
  clearConnections();

  if (!state.executionSteps.length || state.currentStepIndex < 0 || !dom.sceneCodeLine) {
    return;
  }

  const tokenAnchors = Array.from(dom.sceneCodeLine.querySelectorAll(".scene-var-ref"));

  if (!tokenAnchors.length || !dom.workspace || !dom.connectionSvg) {
    return;
  }

  const linkToneByName = new Map();
  tokenAnchors.forEach((anchor) => {
    const name = anchor.dataset.variableName;
    const tone = anchor.dataset.tone || "read";
    const previousTone = linkToneByName.get(name);
    if (!previousTone || getConnectionTonePriority(tone) > getConnectionTonePriority(previousTone)) {
      linkToneByName.set(name, tone);
    }
  });

  linkToneByName.forEach((tone, name) => {
    const card = getVariableCardByName(name);
    if (!card) {
      return;
    }

    card.classList.add("is-linked", `link-${tone}`);
  });

  tokenAnchors.forEach((anchor, index) => {
    const name = anchor.dataset.variableName;
    const tone = anchor.dataset.tone || "read";
    const card = getVariableCardByName(name);
    if (!card) {
      return;
    }

    drawConnectionPath(anchor, card, tone, index, tokenAnchors.length);
  });
}

function clearConnections() {
  if (dom.connectionSvg) {
    dom.connectionSvg.innerHTML = "";
  }

  if (!dom.visualizationGrid) {
    return;
  }

  for (const card of dom.visualizationGrid.querySelectorAll(".var-card")) {
    card.classList.remove("is-linked", "link-read", "link-create", "link-update");
  }
}

function buildSceneConnectionTargets(snapshot, diff) {
  return buildSceneLineParts(snapshot, diff)
    .filter((part) => part.type === "ref")
    .map((part) => ({
      name: part.name,
      tone: part.tone,
      value: part.value,
    }));
}

function getConnectionTonePriority(tone) {
  if (tone === "create") {
    return 3;
  }

  if (tone === "update") {
    return 2;
  }

  return 1;
}

function getVariableCardByName(name) {
  return Array.from(dom.visualizationGrid.querySelectorAll(".var-card")).find(
    (card) => card.dataset.variableName === name
  );
}

function drawConnectionPath(sourceAnchor, card, tone, index, total) {
  const workspaceRect = dom.workspace.getBoundingClientRect();
  const startRect = sourceAnchor.getBoundingClientRect();
  const endRect = card.getBoundingClientRect();
  const spread = total > 1 ? (index - (total - 1) / 2) * 18 : 0;
  const x1 = startRect.left + startRect.width / 2 - workspaceRect.left;
  const y1 = startRect.bottom - workspaceRect.top - 2;
  const x2 = endRect.left + endRect.width / 2 - workspaceRect.left;
  const y2 = endRect.top - workspaceRect.top + 6;
  const curveWidth = x2 - x1;
  const verticalGap = Math.max(26, (y2 - y1) * 0.44);
  const cx1 = x1 + curveWidth * 0.14 + spread * 0.25;
  const cy1 = y1 + verticalGap;
  const cx2 = x2 - curveWidth * 0.12 - spread * 0.2;
  const cy2 = y2 - Math.max(16, verticalGap * 0.55);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`);
  path.setAttribute("class", `variable-link tone-${tone}`);
  path.style.opacity = "0";
  dom.connectionSvg.appendChild(path);

  const fallbackLength = Math.max(220, Math.abs(curveWidth) + Math.abs(y2 - y1));
  const pathLength =
    typeof path.getTotalLength === "function" ? Math.max(path.getTotalLength(), fallbackLength) : fallbackLength;
  path.style.strokeDasharray = `${pathLength}`;
  path.style.strokeDashoffset = `${pathLength}`;
  path.style.transition = "stroke-dashoffset 420ms ease, opacity 220ms ease";

  requestAnimationFrame(() => {
    path.style.opacity = "0.84";
    path.style.strokeDashoffset = "0";
  });
}

function renderEmptyState(message) {
  dom.visualizationGrid.innerHTML = "";
  clearConnections();

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
    <h3>코드를 실행하면 변수 노드가 장면에 배치돼요</h3>
    <p>${message || "변수가 어디서 만들어지고 어떤 줄에서 사용되는지 선과 모션으로 보여드립니다."}</p>
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
import time
import traceback
import types

import js

__source = ${JSON.stringify(source)}
__STEP_LIMIT = 400
__TRACE_EVENT_LIMIT = 12000
__EXECUTION_TIME_LIMIT = 2.5
__steps = []
__steps_truncated = False
__trace_state = {}
__trace_event_count = 0
__trace_started_at = time.perf_counter()

class __ExecutionLimitError(Exception):
    pass

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
    def __init__(self):
        super().__init__()
        self._function_stack = []
        self.unsupported_sync_input_lines = []

    def visit_FunctionDef(self, node):
        self._function_stack.append(False)
        self.generic_visit(node)
        self._function_stack.pop()
        return node

    def visit_AsyncFunctionDef(self, node):
        self._function_stack.append(True)
        self.generic_visit(node)
        self._function_stack.pop()
        return node

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
            if self._function_stack and not self._function_stack[-1]:
                self.unsupported_sync_input_lines.append(getattr(node, 'lineno', 0) or 0)
                return node
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
        if name in {'ast', 'builtins', 'contextlib', 'inspect', 'io', 'json', 'sys', 'time', 'traceback', 'types', 'js'}:
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

def __guard_execution_limit():
    global __trace_event_count
    __trace_event_count += 1

    if __trace_event_count > __TRACE_EVENT_LIMIT:
        raise __ExecutionLimitError(
            '실행이 너무 오래 계속되고 있어 중단했습니다. 무한 반복문일 수 있으니 조건이나 반복 횟수를 확인해 주세요.'
        )

    if time.perf_counter() - __trace_started_at > __EXECUTION_TIME_LIMIT:
        raise __ExecutionLimitError(
            '실행 시간이 너무 길어 중단했습니다. while 문이나 반복 조건을 다시 확인해 주세요.'
        )

def __tracer(frame, event, arg):
    if frame.f_code.co_filename != '<student_code>':
        return __tracer

    if event in ('line', 'return'):
        __guard_execution_limit()

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
    __transformer = __CodexInputTransformer()
    __tree = __transformer.visit(__tree)
    if __transformer.unsupported_sync_input_lines:
        __line = __transformer.unsupported_sync_input_lines[0]
        raise SyntaxError(
            f"현재 학습 도구는 일반 함수 내부의 input()을 아직 지원하지 않습니다. input()을 함수 바깥 최상위 코드로 옮겨 주세요. (line {__line})"
        )
    ast.fix_missing_locations(__tree)
    __code = compile(__tree, filename='<student_code>', mode='exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    sys.settrace(__tracer)
    with contextlib.redirect_stdout(__stdout), contextlib.redirect_stderr(__stderr):
        __result = eval(__code, __scope, __scope)
        if inspect.isawaitable(__result):
            await __result
except __ExecutionLimitError as __limit_error:
    __error = str(__limit_error)
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
