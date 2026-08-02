const STORAGE_KEY = "mandatory-checkin-v1";
const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const completeDayBtn = document.querySelector("#completeDayBtn");
const doneCount = document.querySelector("#doneCount");
const leftCount = document.querySelector("#leftCount");
const streakCount = document.querySelector("#streakCount");
const dateText = document.querySelector("#dateText");
const progressBar = document.querySelector("#progressBar");
const progressPercent = document.querySelector("#progressPercent");
const enforceNote = document.querySelector("#enforceNote");
const historyStrip = document.querySelector("#historyStrip");
const resetBtn = document.querySelector("#resetBtn");
const taskTemplate = document.querySelector("#taskTemplate");
const filterButtons = document.querySelectorAll("[data-filter]");
const calendarTitle = document.querySelector("#calendarTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const prevMonthBtn = document.querySelector("#prevMonthBtn");
const nextMonthBtn = document.querySelector("#nextMonthBtn");
const todayBtn = document.querySelector("#todayBtn");
const selectedDateLabel = document.querySelector("#selectedDateLabel");
const taskDateKicker = document.querySelector("#taskDateKicker");
const taskPanelTitle = document.querySelector("#taskPanelTitle");
const taskFormLabel = document.querySelector("#taskFormLabel");
const taskTotal = document.querySelector("#taskTotal");
const weekGrid = document.querySelector("#weekGrid");
const weekRange = document.querySelector("#weekRange");
const prevWeekBtn = document.querySelector("#prevWeekBtn");
const nextWeekBtn = document.querySelector("#nextWeekBtn");
const reportWeekRange = document.querySelector("#reportWeekRange");
const habitCloud = document.querySelector("#habitCloud");
const weekDoneCount = document.querySelector("#weekDoneCount");
const plannedDaysCount = document.querySelector("#plannedDaysCount");
const heatmap = document.querySelector("#heatmap");
const overallRate = document.querySelector("#overallRate");
const quickTaskButtons = document.querySelectorAll("[data-quick-task]");
const energyFace = document.querySelector("#energyFace");
const energyText = document.querySelector("#energyText");
const avatarFace = document.querySelector("#avatarFace");
const pepTalk = document.querySelector("#pepTalk");
const toast = document.querySelector("#toast");
const celebration = document.querySelector("#celebration");
const examDaysLeft = document.querySelector("#examDaysLeft");
const examDateLabel = document.querySelector("#examDateLabel");
const dailyFocus = document.querySelector("#dailyFocus");

const today = new Date();
today.setHours(0, 0, 0, 0);
const todayKey = toDateKey(today);
const examDate = new Date(2026, 7, 23);
const TOEIC_PLAN_VERSION = "toeic-600-2026-08-23-v5-two-line";
let activeFilter = "all";
let state = loadState();
let selectedDate = new Date(today);
let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let weekCursor = getStartOfWeek(today);
let toastTimer;

ensureToday();
seedToeicPlan();
render();

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  addTask(title);
  taskInput.value = "";
  showToast(`已加入：${getTaskIcon(title)} ${title}`);
});

taskList.addEventListener("change", (event) => {
  const checkbox = event.target.closest("input[type='checkbox']");
  if (!checkbox) return;

  const selectedKey = getSelectedKey();
  const task = getSelectedTasks().find((item) => item.id === checkbox.dataset.id);
  if (!task) return;
  task.done = checkbox.checked;
  state.days[selectedKey].completedAt = null;
  const message = checkbox.checked
    ? getEncouragement(getSelectedTasks().filter((item) => item.done).length)
    : "没关系，调整好再来。";
  saveAndRender();
  showToast(message);
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) return;

  const selectedKey = getSelectedKey();
  state.days[selectedKey].tasks = getSelectedTasks().filter(
    (item) => item.id !== button.dataset.id,
  );
  state.days[selectedKey].completedAt = null;
  saveAndRender();
});

completeDayBtn.addEventListener("click", () => {
  const selectedKey = getSelectedKey();
  const tasks = getSelectedTasks();
  if (!tasks.length || tasks.some((task) => !task.done)) return;
  if (selectedKey > todayKey) return;

  state.days[selectedKey].completedAt = new Date().toISOString();
  saveAndRender();
  celebrate();
  showToast("今日任务全部清空，漂亮收工！");
});

quickTaskButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const title = button.dataset.quickTask;
    if (getSelectedTasks().some((task) => task.title === title)) {
      showToast("这项已经在计划里啦。");
      return;
    }
    addTask(title);
    showToast(`已加入：${title}`);
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    renderTasks();
  });
});

resetBtn.addEventListener("click", () => {
  const shouldReset = window.confirm("确定要清空所有计划和打卡记录吗？");
  if (!shouldReset) return;

  state = { days: {} };
  ensureToday();
  saveAndRender();
});

prevMonthBtn.addEventListener("click", () => {
  calendarCursor = new Date(
    calendarCursor.getFullYear(),
    calendarCursor.getMonth() - 1,
    1,
  );
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  calendarCursor = new Date(
    calendarCursor.getFullYear(),
    calendarCursor.getMonth() + 1,
    1,
  );
  renderCalendar();
});

prevWeekBtn.addEventListener("click", () => {
  weekCursor.setDate(weekCursor.getDate() - 7);
  weekCursor = new Date(weekCursor);
  renderWeek();
});

nextWeekBtn.addEventListener("click", () => {
  weekCursor.setDate(weekCursor.getDate() + 7);
  weekCursor = new Date(weekCursor);
  renderWeek();
});

todayBtn.addEventListener("click", () => {
  selectDate(today);
});

calendarGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".calendar-day");
  if (!button) return;
  const [year, month, day] = button.dataset.date.split("-").map(Number);
  selectDate(new Date(year, month - 1, day));
});

weekGrid.addEventListener("click", (event) => {
  const target = event.target.closest("[data-date]");
  if (!target) return;
  const [year, month, day] = target.dataset.date.split("-").map(Number);
  selectDate(new Date(year, month - 1, day));
});

function ensureToday() {
  ensureDay(todayKey);
}

function ensureDay(key) {
  if (!state.days[key]) state.days[key] = { tasks: [], completedAt: null };
}

function seedToeicPlan() {
  const toeicPlan = getToeicPlan();
  const planKeys = new Set(Object.keys(toeicPlan));

  Object.entries(state.days).forEach(([key, day]) => {
    const originalLength = day.tasks.length;
    day.tasks = day.tasks.filter(
      (task) =>
        !task.plan?.startsWith("toeic-600-") &&
        !task.plan?.startsWith("n2-sprint-"),
    );
    if (!planKeys.has(key) && originalLength !== day.tasks.length && !day.tasks.length) {
      day.completedAt = null;
    }
  });

  Object.entries(toeicPlan).forEach(([key, dayPlan]) => {
    ensureDay(key);
    const existingCurrentPlan = state.days[key].tasks.some(
      (task) => task.plan === TOEIC_PLAN_VERSION,
    );
    if (existingCurrentPlan) return;

    dayPlan.tasks.forEach((title) => {
      state.days[key].tasks.push({
        id: createId(),
        title,
        done: false,
        createdAt: Date.now(),
        plan: TOEIC_PLAN_VERSION,
      });
    });
    state.days[key].completedAt = null;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object" && saved.days) return saved;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { days: {} };
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function render() {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const selectedKey = getSelectedKey();
  const isToday = selectedKey === todayKey;
  const isFuture = selectedKey > todayKey;

  dateText.textContent = formatter.format(selectedDate);
  selectedDateLabel.textContent = isToday ? "今天" : isFuture ? "未来计划" : "历史计划";
  taskDateKicker.textContent = isToday ? "今日任务" : formatShortDate(selectedDate);
  taskPanelTitle.textContent = isToday ? "今天有哪些任务" : "这一天有哪些任务";
  taskFormLabel.textContent = isToday ? "添加今天的计划" : "添加这一天的计划";
  taskInput.placeholder = isToday ? "例如：金フレ 30 个短语" : "为这一天安排一项任务";
  renderExamMission();

  renderWeek();
  renderCalendar();
  renderTasks();
  renderStatus();
  renderMood();
  renderReport();
  renderHeatmap();
  renderHistory();
}

function renderExamMission() {
  const remainingMs = examDate.getTime() - today.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / 86400000));
  const plan = getToeicPlan()[getSelectedKey()];
  examDaysLeft.textContent = String(remainingDays);
  examDateLabel.textContent = "2026年8月23日 · TOEIC L&R";
  dailyFocus.textContent = plan
    ? `今日重点：${plan.focus}`
    : getSelectedKey() > toDateKey(examDate)
      ? "考试已经结束，辛苦了"
      : "选择 TOEIC 备考日期查看当天重点";
}

function addTask(title) {
  const selectedKey = getSelectedKey();
  ensureDay(selectedKey);
  state.days[selectedKey].tasks.push({
    id: createId(),
    title,
    done: false,
    createdAt: Date.now(),
  });
  state.days[selectedKey].completedAt = null;
  saveAndRender();
}

function renderTasks() {
  const tasks = getFilteredTasks();
  taskList.replaceChildren();
  tasks.forEach((task) => {
    const node = taskTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector("input");
    const title = node.querySelector(".task-title");
    const icon = node.querySelector(".task-icon");
    const deleteButton = node.querySelector(".delete-button");

    node.classList.toggle("is-done", task.done);
    checkbox.checked = task.done;
    checkbox.dataset.id = task.id;
    title.textContent = task.title;
    icon.textContent = getTaskIcon(task.title);
    deleteButton.dataset.id = task.id;
    taskList.append(node);
  });

  const selectedTasks = getSelectedTasks();
  emptyState.hidden = selectedTasks.length > 0;
  emptyState.querySelector("p").textContent =
    getSelectedKey() === todayKey
      ? "还没有任务。先写下今天必须完成的第一件事。"
      : "这一天还没有任务，可以现在安排。";
  taskTotal.textContent = `${selectedTasks.length} 项`;
}

function renderStatus() {
  const selectedKey = getSelectedKey();
  const tasks = getSelectedTasks();
  const finished = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - finished;
  const percent = tasks.length ? Math.round((finished / tasks.length) * 100) : 0;
  const isComplete = Boolean(state.days[selectedKey]?.completedAt);
  const isFuture = selectedKey > todayKey;

  doneCount.textContent = String(finished);
  leftCount.textContent = `剩余 ${remaining}`;
  streakCount.textContent = String(getStreak());
  progressBar.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;

  completeDayBtn.disabled =
    !tasks.length || remaining > 0 || isComplete || isFuture;
  completeDayBtn.classList.toggle(
    "is-ready",
    tasks.length > 0 && remaining === 0 && !isComplete && !isFuture,
  );
  completeDayBtn.textContent = isComplete
    ? "这一天已完成"
    : isFuture
      ? "当天才能打卡"
      : selectedKey === todayKey
        ? "完成今日打卡"
        : "补记完成打卡";

  if (!tasks.length) {
    enforceNote.textContent = "这一天还没有计划。至少添加一项任务，才能开始打卡。";
  } else if (isFuture) {
    enforceNote.textContent = `已安排 ${tasks.length} 项任务，到当天完成后才能打卡。`;
  } else if (remaining > 0) {
    enforceNote.textContent = `还有 ${remaining} 项没完成，今天不能打卡结束。`;
  } else if (isComplete) {
    enforceNote.textContent = "今日任务已全部完成，记录已经锁定在最近 7 天里。";
  } else {
    enforceNote.textContent = "所有任务都已勾选，现在可以完成今日打卡。";
  }
}

function renderMood() {
  const tasks = getSelectedTasks();
  const done = tasks.filter((task) => task.done).length;
  const percent = tasks.length ? done / tasks.length : 0;
  const moods = !tasks.length
    ? { face: "•︵•", energy: "等待第一项计划", avatar: "•ᴗ•", talk: "先写一件小事，今天就启动了。" }
    : percent === 1
      ? { face: "★ᴗ★", energy: "能量满格", avatar: "◕▽◕", talk: "全都完成了，只差最后打卡！" }
      : percent >= 0.6
        ? { face: "◕▽◕", energy: "状态正热", avatar: "●▽●", talk: "已经过半，顺手把剩下的拿下。" }
        : percent > 0
          ? { face: "◕‿◕", energy: "渐入佳境", avatar: "●ᴗ●", talk: "每一个勾都算数，继续。" }
          : { face: "•̀ᴗ•́", energy: "准备开动", avatar: "•̀ᴗ•́", talk: "挑最简单的一项先打勾。" };

  energyFace.textContent = moods.face;
  energyText.textContent = moods.energy;
  avatarFace.textContent = moods.avatar;
  pepTalk.textContent = moods.talk;
}

function renderReport() {
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekCursor);
    date.setDate(weekCursor.getDate() + index);
    return date;
  });
  reportWeekRange.textContent = `${formatMonthDay(weekDates[0])} - ${formatMonthDay(weekDates[6])}`;

  const weekTasks = weekDates.flatMap((date) => {
    const key = toDateKey(date);
    return (state.days[key]?.tasks || []).map((task) => ({ ...task, key }));
  });
  const done = weekTasks.filter((task) => task.done).length;
  const plannedDays = weekDates.filter(
    (date) => (state.days[toDateKey(date)]?.tasks || []).length > 0,
  ).length;
  weekDoneCount.textContent = String(done);
  plannedDaysCount.textContent = String(plannedDays);

  habitCloud.replaceChildren();
  const visibleTasks = weekTasks.slice(0, 14);
  visibleTasks.forEach((task) => {
    const chip = document.createElement("div");
    chip.className = "habit-chip";
    chip.classList.toggle("is-done", task.done);
    chip.innerHTML = `<span aria-hidden="true">${getTaskIcon(task.title)}</span><span></span><i>${task.done ? "✓" : ""}</i>`;
    chip.children[1].textContent = task.title;
    habitCloud.append(chip);
  });

  if (!visibleTasks.length) {
    habitCloud.innerHTML = `
      <div class="habit-chip"><span>✨</span><span>添加本周的第一个计划</span><i></i></div>
      <div class="habit-chip"><span>💧</span><span>每日喝水</span><i></i></div>
      <div class="habit-chip"><span>📖</span><span>阅读学习</span><i></i></div>
    `;
  }
}

function renderHeatmap() {
  heatmap.replaceChildren();
  const days = getHeatmapDays();
  let completedTasks = 0;
  let totalTasks = 0;

  days.forEach((date) => {
    const tasks = state.days[toDateKey(date)]?.tasks || [];
    const done = tasks.filter((task) => task.done).length;
    const ratio = tasks.length ? done / tasks.length : 0;
    totalTasks += tasks.length;
    completedTasks += done;

    const cell = document.createElement("i");
    cell.className = `heat-cell level-${getHeatLevel(ratio, tasks.length)}`;
    cell.title = `${formatShortDate(date)}：${done}/${tasks.length}`;
    heatmap.append(cell);
  });

  overallRate.textContent = totalTasks
    ? `${Math.round((completedTasks / totalTasks) * 100)}%`
    : "0%";
}

function renderWeek() {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekCursor);
    date.setDate(weekCursor.getDate() + index);
    return date;
  });
  const end = dates[6];
  weekRange.textContent = `${formatMonthDay(dates[0])} - ${formatMonthDay(end)}`;

  const taskNames = [];
  const seen = new Set();
  dates.forEach((date) => {
    const tasks = state.days[toDateKey(date)]?.tasks || [];
    tasks.forEach((task) => {
      const normalized = task.title.trim().toLocaleLowerCase("zh-CN");
      if (!seen.has(normalized)) {
        seen.add(normalized);
        taskNames.push({ normalized, title: task.title });
      }
    });
  });

  if (!taskNames.length) {
    weekGrid.className = "week-empty";
    weekGrid.textContent = "这一周还没有计划，先从今天添加一项任务。";
    return;
  }

  weekGrid.className = "week-grid";
  weekGrid.replaceChildren();
  const corner = document.createElement("div");
  corner.className = "week-corner";
  corner.textContent = `${taskNames.length} 项本周习惯`;
  weekGrid.append(corner);

  dates.forEach((date) => {
    const key = toDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "week-day-head";
    button.dataset.date = key;
    button.classList.toggle("is-today", key === todayKey);
    button.classList.toggle("is-selected", key === getSelectedKey());
    button.innerHTML = `
      <span>${date.toLocaleDateString("zh-CN", { weekday: "short" })}</span>
      <strong>${date.getDate()}</strong>
    `;
    weekGrid.append(button);
  });

  taskNames.forEach(({ normalized, title }) => {
    const name = document.createElement("div");
    name.className = "week-task-name";
    name.innerHTML = `<span aria-hidden="true">${getTaskIcon(title)}</span><span></span>`;
    name.lastElementChild.textContent = title;
    weekGrid.append(name);

    dates.forEach((date) => {
      const key = toDateKey(date);
      const task = (state.days[key]?.tasks || []).find(
        (item) => item.title.trim().toLocaleLowerCase("zh-CN") === normalized,
      );
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "week-cell";
      cell.dataset.date = key;
      cell.classList.toggle("has-task", Boolean(task));
      cell.classList.toggle("is-done", Boolean(task?.done));
      cell.textContent = task?.done ? "✓" : "·";
      cell.setAttribute(
        "aria-label",
        `${formatShortDate(date)}，${title}，${task ? (task.done ? "已完成" : "未完成") : "未安排"}`,
      );
      weekGrid.append(cell);
    });
  });
}

function renderCalendar() {
  calendarTitle.textContent = calendarCursor.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
  });
  calendarGrid.replaceChildren();

  getCalendarDates(calendarCursor).forEach((date) => {
    const key = toDateKey(date);
    const day = state.days[key];
    const taskCount = day?.tasks?.length || 0;
    const isComplete = Boolean(day?.completedAt);
    const isMissed = key < todayKey && taskCount > 0 && !isComplete;
    const button = document.createElement("button");

    button.type = "button";
    button.className = "calendar-day";
    button.dataset.date = key;
    button.classList.toggle("is-outside", date.getMonth() !== calendarCursor.getMonth());
    button.classList.toggle("is-today", key === todayKey);
    button.classList.toggle("is-selected", key === getSelectedKey());
    button.classList.toggle("is-complete", isComplete);
    button.classList.toggle("is-missed", isMissed);
    button.setAttribute(
      "aria-label",
      `${formatShortDate(date)}，${taskCount ? `${taskCount} 项任务` : "无任务"}`,
    );
    button.innerHTML = `
      <span class="day-number">${date.getDate()}</span>
      <span class="day-meta">${taskCount ? `${taskCount} 项任务` : ""}</span>
      ${taskCount ? '<i class="day-status" aria-hidden="true"></i>' : ""}
    `;
    calendarGrid.append(button);
  });
}

function renderHistory() {
  historyStrip.replaceChildren();
  getLastSevenDays().forEach((date) => {
    const key = toDateKey(date);
    const day = state.days[key];
    const hasTasks = Boolean(day?.tasks?.length);
    const isComplete = Boolean(day?.completedAt);
    const missed = key < todayKey && hasTasks && !isComplete;
    const node = document.createElement("div");

    node.className = "history-day";
    node.classList.toggle("is-complete", isComplete);
    node.classList.toggle("is-missed", missed);
    node.innerHTML = `
      <strong>${date.getDate()}</strong>
      <span>${date.toLocaleDateString("zh-CN", { weekday: "short" })}</span>
      <span>${getHistoryLabel(hasTasks, isComplete, missed)}</span>
    `;
    historyStrip.append(node);
  });
}

function getHistoryLabel(hasTasks, isComplete, missed) {
  if (isComplete) return "已完成";
  if (missed) return "未完成";
  if (hasTasks) return "进行中";
  return "未计划";
}

function getSelectedTasks() {
  return state.days[getSelectedKey()]?.tasks || [];
}

function getFilteredTasks() {
  const tasks = getSelectedTasks();
  if (activeFilter === "open") return tasks.filter((task) => !task.done);
  if (activeFilter === "done") return tasks.filter((task) => task.done);
  return tasks;
}

function getSelectedKey() {
  return toDateKey(selectedDate);
}

function selectDate(date) {
  selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);
  calendarCursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  weekCursor = getStartOfWeek(selectedDate);
  activeFilter = "all";
  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === "all");
  });
  render();
}

function getStartOfWeek(date) {
  const start = new Date(date);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getHeatmapDays() {
  const end = getStartOfWeek(today);
  end.setDate(end.getDate() + 6);
  const start = new Date(end);
  start.setDate(end.getDate() - 20 * 7 + 1);

  return Array.from({ length: 20 * 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getHeatLevel(ratio, taskCount) {
  if (!taskCount) return 0;
  if (ratio === 1) return 4;
  if (ratio >= 0.67) return 3;
  if (ratio >= 0.34) return 2;
  return 1;
}

function getCalendarDates(cursor) {
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatShortDate(date) {
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatMonthDay(date) {
  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

function getTaskIcon(title) {
  const text = title.toLowerCase();
  if (/水|喝|饮/.test(text)) return "💧";
  if (/睡|早起|起床|晚安/.test(text)) return "🌙";
  if (/运动|跑|健身|瑜伽|拉伸|走路/.test(text)) return "🏃";
  if (/保命线|先开|开始/.test(text)) return "🚦";
  if (/600分标准线|600分加分项/.test(text)) return "🎯";
  if (/监督规则/.test(text)) return "👀";
  if (/排班|上班|长班|非公开/.test(text)) return "🗓️";
  if (/mikan/.test(text)) return "🍊";
  if (/abceed|おすすめ|総復習/.test(text)) return "📱";
  if (/听力|精听|part 1|part 2|part 3|part 4|音频|重听|跟读|listening/.test(text)) return "🎧";
  if (/金フレ|单词|词|短语|星号/.test(text)) return "🟡";
  if (/文法|语法|part 5|part 6/.test(text)) return "🧩";
  if (/公式|真题|test|模拟|计时|part 7|阅读/.test(text)) return "📝";
  if (/错题|复盘|整理|统计|总结/.test(text)) return "🔁";
  if (/准备|证件|铅笔|路线|睡觉|早餐|出发/.test(text)) return "🎒";
  if (/书|读|阅读|学习|背|单词/.test(text)) return "📖";
  if (/饭|吃|早餐|午餐|晚餐/.test(text)) return "🥗";
  if (/洗|澡|清洁/.test(text)) return "🛁";
  if (/药|维生素/.test(text)) return "💊";
  if (/冥想|呼吸/.test(text)) return "🧘";
  return "✨";
}

function getToeicPlan() {
  return {
    "2026-08-02": {
        "focus": "从0重启：今晚只要启动，但不能空过",
        "tasks": [
            "保命线｜现在打开 mikan 做 5 分钟，先打破拖延",
            "保命线｜金フレ复习 431-450，只要看到能反应意思",
            "保命线｜abceed 総復習 8-10 分钟，只做最容易开始的题",
            "600分标准线｜如果还有力气，TEST 1 Part 7 做 1 篇；没力气就只看题目和定位句",
            "监督规则｜今天不补旧账，不熬夜；完成前三项就允许打卡"
        ]
    },
    "2026-08-03": {
        "focus": "标准日：词汇 + Part 7 定位",
        "tasks": [
            "保命线｜先开 mikan 做 5 分钟；开始了才算赢，别等状态好",
            "保命线｜mikan 15 分钟 + 金フレ 451-480",
            "600分标准线｜公式問題集 12：TEST 1 Reading Part 7 做 2 篇，逐题找定位句",
            "600分加分项｜文法特急第6駅错题写原因；abceed 総復習 10 分钟",
            "监督规则｜不要先刷手机；先完成 mikan 5 分钟再说"
        ]
    },
    "2026-08-04": {
        "focus": "听力日：TEST 1 Part 4 收尾",
        "tasks": [
            "保命线｜先开 mikan 做 5 分钟；开始了才算赢，别等状态好",
            "保命线｜mikan 15 分钟 + 金フレ 481-510",
            "600分标准线｜公式問題集 12：TEST 1 Listening Part 4 剩余组，错题看原文",
            "600分加分项｜abceed Listening 推荐题 15 分钟；错题重听 2 遍",
            "监督规则｜听力不用完美，但错题必须知道漏听哪一句"
        ]
    },
    "2026-08-05": {
        "focus": "上班前打底：Part 5/6",
        "tasks": [
            "保命线｜先开 mikan 做 5 分钟；开始了才算赢，别等状态好",
            "保命线｜mikan 15 分钟 + 金フレ 511-540",
            "600分标准线｜文法特急第7駅 + TEST 1 Reading Part 6 做 1 篇",
            "600分加分项｜abceed 総復習 10 分钟；整理 3 个语法错因",
            "监督规则｜明天开始有班，今天别拖到凌晨"
        ]
    },
    "2026-08-06": {
        "focus": "上班日轻量但不断线",
        "tasks": [
            "排班｜17:00-22:00 上班；今天任务减量但不能断线",
            "保命线｜mikan 10 分钟，打开就开始，不讲条件",
            "保命线｜金フレ 541-555，只背核心词，不追量",
            "600分标准线｜abceed 総復習 10 分钟 + 昨天 Part 6/文法错题看 5 分钟",
            "监督规则｜上班日不做新纸质题，完成小闭环就合格"
        ]
    },
    "2026-08-07": {
        "focus": "上班日听力保温",
        "tasks": [
            "排班｜17:30-22:00 上班；今天任务减量但不能断线",
            "保命线｜mikan 10 分钟，打开就开始，不讲条件",
            "保命线｜金フレ 复习 511-555 星号词，只背核心词，不追量",
            "600分标准线｜TEST 1 听力错题音频 15 分钟；abceed Listening 10 分钟",
            "监督规则｜只抓听力错题，不开新阅读"
        ]
    },
    "2026-08-08": {
        "focus": "上班日最低推进",
        "tasks": [
            "排班｜17:30-22:00 上班；今天任务减量但不能断线",
            "保命线｜mikan 10 分钟，打开就开始，不讲条件",
            "保命线｜金フレ 556-570，只背核心词，不追量",
            "600分标准线｜TEST 1 Part 7 做 1 篇短文；累就只读题并找定位",
            "监督规则｜今天保持连续比做很多重要"
        ]
    },
    "2026-08-09": {
        "focus": "休息日补质量：TEST 1 收尾",
        "tasks": [
            "保命线｜先开 mikan 做 5 分钟；开始了才算赢，别等状态好",
            "保命线｜mikan 15 分钟 + 金フレ 复习 001-570 星号词",
            "600分标准线｜TEST 1 Reading 剩余题尽量完成，至少做 Part 7 两篇",
            "600分加分项｜abceed Part 7 15 分钟；整理 TEST 1 最常错的 8 个词/题",
            "监督规则｜补质量，不补情绪；错题必须留下痕迹"
        ]
    },
    "2026-08-10": {
        "focus": "开始 TEST 2：Part 1 + 语法",
        "tasks": [
            "保命线｜先开 mikan 做 5 分钟；开始了才算赢，别等状态好",
            "保命线｜mikan 15 分钟 + 金フレ 571-600",
            "600分标准线｜TEST 2 Listening Part 1 全部 + 文法特急第8駅",
            "600分加分项｜abceed 総復習 10 分钟；Part 1 错题听 2 遍",
            "监督规则｜TEST 2 开始后，错题比做题更重要"
        ]
    },
    "2026-08-11": {
        "focus": "上班日 Part 2 核心训练",
        "tasks": [
            "排班｜17:30-22:00 上班；今天任务减量但不能断线",
            "保命线｜mikan 10 分钟，打开就开始，不讲条件",
            "保命线｜金フレ 601-615，只背核心词，不追量",
            "600分标准线｜TEST 2 Listening Part 2 前 10 题；只练开头疑问词",
            "监督规则｜别追数量，Part 2 要听懂开头"
        ]
    },
    "2026-08-12": {
        "focus": "Part 2 收尾 + 文法",
        "tasks": [
            "保命线｜先开 mikan 做 5 分钟；开始了才算赢，别等状态好",
            "保命线｜mikan 15 分钟 + 金フレ 616-645",
            "600分标准线｜TEST 2 Listening Part 2 剩余题 + 文法特急第9駅",
            "600分加分项｜abceed 総復習 15 分钟；Part 2 错题看原文",
            "监督规则｜今天是标准日，不爆量但要完成主线"
        ]
    },
    "2026-08-13": {
        "focus": "长班日最轻量，保连续",
        "tasks": [
            "排班｜16:00-22:00 上班；今天任务减量但不能断线",
            "保命线｜mikan 10 分钟，打开就开始，不讲条件",
            "保命线｜金フレ 646-655，只背核心词，不追量",
            "600分标准线｜abceed 総復習 8-10 分钟；睡前只看 Part 2 错题 5 分钟",
            "监督规则｜这是长班日，不和疲劳硬碰硬，但不能空过"
        ]
    },
    "2026-08-14": {
        "focus": "晚班日复盘，不开新坑",
        "tasks": [
            "排班｜17:30-22:30 上班；今天任务减量但不能断线",
            "保命线｜mikan 10 分钟，打开就开始，不讲条件",
            "保命线｜金フレ 复习 601-655 星号词，只背核心词，不追量",
            "600分标准线｜TEST 2 Part 2 错题重听 10 分钟 + abceed Listening 10 分钟",
            "监督规则｜不做新题也可以，重点保持手感"
        ]
    },
    "2026-08-15": {
        "focus": "休息日冲标准：Part 3 + Part 5",
        "tasks": [
            "保命线｜先开 mikan 做 5 分钟；开始了才算赢，别等状态好",
            "保命线｜mikan 15 分钟 + 金フレ 656-690",
            "600分标准线｜TEST 2 Listening Part 3 前 4 组 + Reading Part 5 前 15 题",
            "600分加分项｜文法特急第10駅；错题写关键词/错因",
            "监督规则｜今天要冲600标准线，但只补质量不补数量"
        ]
    },
    "2026-08-16": {
        "focus": "听力节奏日：Part 3/4",
        "tasks": [
            "保命线｜先开 mikan 做 5 分钟；开始了才算赢，别等状态好",
            "保命线｜mikan 15 分钟 + 金フレ 691-720",
            "600分标准线｜TEST 2 Listening Part 3 剩余组 + abceed Part 4 15 分钟",
            "600分加分项｜听力错题看原文，标出关键词；重听 2 遍",
            "监督规则｜别无限循环错题，听懂原因就过"
        ]
    },
    "2026-08-17": {
        "focus": "考前周：轻量稳定",
        "tasks": [
            "排班｜显示非公开；如果临时有班，至少完成前两项",
            "保命线｜mikan 10 分钟，只复习错词和熟词",
            "保命线｜金フレ 复习 001-720 星号词",
            "600分标准线｜TEST 2 Listening Part 4 前 2 组；忙就改成错题音频 15 分钟",
            "监督规则｜考前周开始减量，但每天必须碰英语"
        ]
    },
    "2026-08-18": {
        "focus": "Part 4 轻推进",
        "tasks": [
            "排班｜显示非公开；如果临时有班，至少完成前两项",
            "保命线｜mikan 10 分钟，只复习错词和熟词",
            "保命线｜金フレ 721-740，只背 20 个",
            "600分标准线｜TEST 2 Listening Part 4 再做 2 组；忙就改错题重听",
            "监督规则｜官方听力错题必须重听，但不熬夜"
        ]
    },
    "2026-08-19": {
        "focus": "阅读小块：Part 6",
        "tasks": [
            "排班｜显示非公开；如果临时有班，至少完成前两项",
            "保命线｜mikan 10 分钟，只复习错词和熟词",
            "保命线｜金フレ 741-760",
            "600分标准线｜TEST 2 Reading Part 6 做 1 篇 + 文法错题总复习 10 分钟",
            "监督规则｜不学复杂语法，只抓 Part 5/6 常错点"
        ]
    },
    "2026-08-20": {
        "focus": "考前三天：减少新内容",
        "tasks": [
            "排班｜显示非公开；如果临时有班，至少完成前两项",
            "保命线｜mikan 10 分钟，只复习错词和熟词",
            "保命线｜金フレ 复习 001-760 星号词",
            "600分标准线｜TEST 2 Reading Part 7 做 1 篇；忙就只做定位训练",
            "监督规则｜错题比新题重要，不追进度"
        ]
    },
    "2026-08-21": {
        "focus": "考前两天：只复盘",
        "tasks": [
            "排班｜显示非公开；如果临时有班，至少完成前两项",
            "保命线｜mikan 10 分钟，只复习错词和熟词",
            "保命线｜金フレ 只看星号词 30-50 个",
            "600分标准线｜TEST 1 + TEST 2 听力错题音频 20 分钟 + 文法错题 10 分钟",
            "监督规则｜不要开新题，不要追进度"
        ]
    },
    "2026-08-22": {
        "focus": "考前一天：稳住，早点睡",
        "tasks": [
            "排班｜显示非公开；如有班，只做前 4 项即可",
            "保命线｜mikan 8 分钟，只看熟词",
            "保命线｜金フレ星号词 30 个以内",
            "600分标准线｜听熟悉的官方错题音频 15-20 分钟 + 看文法错题，不做新题",
            "准备｜证件、准考证、路线、文具；晚上早点睡",
            "监督规则｜不要模考，不要熬夜，今天的任务是稳住"
        ]
    }
};
}

function getEncouragement(done) {
  const messages = [
    "第一项拿下，节奏有了。",
    "又清掉一项，今天在变轻。",
    "漂亮，这个勾很有分量。",
    "继续保持，进度条正在发光。",
    "稳稳推进，离收工更近了。",
  ];
  return messages[Math.min(done - 1, messages.length - 1)];
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1900);
}

function celebrate() {
  const colors = ["#a979df", "#e67eb8", "#86b95a", "#f3bf4f", "#67b8d8"];
  celebration.replaceChildren();

  for (let index = 0; index < 52; index += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--drift", `${Math.random() * 180 - 90}px`);
    piece.style.animationDelay = `${Math.random() * 0.45}s`;
    celebration.append(piece);
  }

  window.setTimeout(() => celebration.replaceChildren(), 2600);
}

function getStreak() {
  let streak = 0;
  let cursor = new Date(today);

  while (true) {
    const key = toDateKey(cursor);
    if (!state.days[key]?.completedAt) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getLastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date;
  });
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
