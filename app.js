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
const TOEIC_PLAN_VERSION = "toeic-600-2026-08-23-v2";
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
  Object.entries(getToeicPlan()).forEach(([key, dayPlan]) => {
    ensureDay(key);
    const existingCurrentPlan = state.days[key].tasks.some(
      (task) => task.plan === TOEIC_PLAN_VERSION,
    );
    if (existingCurrentPlan) return;

    const plannedTasks = state.days[key].tasks.filter(
      (task) =>
        task.plan?.startsWith("toeic-600-") ||
        task.plan?.startsWith("n2-sprint-"),
    );
    const completedPlannedTasks = plannedTasks.filter((task) => task.done).length;
    state.days[key].tasks = state.days[key].tasks.filter(
      (task) =>
        !task.plan?.startsWith("toeic-600-") &&
        !task.plan?.startsWith("n2-sprint-"),
    );

    dayPlan.tasks.forEach((title, index) => {
      state.days[key].tasks.push({
        id: createId(),
        title,
        done: index < completedPlannedTasks,
        createdAt: Date.now(),
        plan: TOEIC_PLAN_VERSION,
      });
    });
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
  if (/听力|精听|part 1|part 2|part 3|part 4|音频|重听|跟读/.test(text)) return "🎧";
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
    "2026-07-08": {
        "focus": "先启动，不追求多。",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "App：做弱点推荐里的单词/听力任务 20-30 分钟。",
            "YouTube 或 App：做 `TOEIC Part 2 listening practice` 10-20 题。",
            "单词：从 App 里整理 20 个不会的词。",
            "要求：今天只要完成 60-90 分钟就合格。",
            "完成标准1｜写下 20 个不会的词。",
            "完成标准2｜听力至少做 10 题。",
            "完成标准3｜知道自己最容易错的是听不懂、反应慢，还是单词不认识。"
        ]
    },
    "2026-07-09": {
        "focus": "把资料整理好，不急着猛刷。",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "`公式問題集 12`：翻目录，确认有 `TEST 1` 和 `TEST 2`。",
            "`公式問題集 12`：下载/确认音频能播放。",
            "`金のフレーズ`：找到音频，学前 30 个短语。",
            "`文法特急`：做最前面 1 站。",
            "App：只做 10 分钟复习，不要刷太久。",
            "完成标准1｜三本书都能开始用。",
            "完成标准2｜金フレ前 30 个听过并跟读。",
            "完成标准3｜文法特急第一组错题知道为什么错。"
        ]
    },
    "2026-07-10": {
        "focus": "建立正常节奏。",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：31-80，听音频，跟读。",
            "公式問題集 12：TEST 1 的 Part 1 做完。",
            "公式問題集 12：TEST 1 的 Part 2 做 15 题。",
            "文法特急：做 1 站。",
            "错题本：整理 10 个词/题。",
            "完成标准1｜Part 1 错题重听 3 遍。",
            "完成标准2｜Part 2 每道错题看原文，确认是没听到疑问词还是没听懂选项。"
        ]
    },
    "2026-07-11": {
        "focus": "周六",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：81-130。",
            "公式問題集 12：TEST 1 Part 2 再做 15-20 题。",
            "文法特急：1 站。",
            "复盘：把今天听力错题原文读 3 遍。",
            "重点｜Part 2 要先听疑问词：Where, When, Who, Why, How, Do, Did, Is。"
        ]
    },
    "2026-07-12": {
        "focus": "周日",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：131-180。",
            "公式問題集 12：TEST 1 Part 2 剩余题。",
            "公式問題集 12：TEST 1 Part 5 做 15 题。",
            "复盘：错题按“单词不懂/语法不懂/粗心”分类。",
            "重点｜Part 5 不要整句翻译，先看空格前后判断词性。"
        ]
    },
    "2026-07-13": {
        "focus": "周一",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：181-230。",
            "App：听力弱点练习 20 题。",
            "文法特急：1 站。",
            "公式問題集 12：TEST 1 Part 7 做 1 篇短文。",
            "重点｜今天不追求速度，只要搞懂题目问什么。"
        ]
    },
    "2026-07-14": {
        "focus": "周二",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：231-280。",
            "公式問題集 12：TEST 1 Part 3 做 1 组对话。",
            "公式問題集 12：同一组对话听 3 遍。",
            "文法特急：1 站。",
            "重点｜Part 3 做题前先看问题，圈出 who/where/why/what。"
        ]
    },
    "2026-07-15": {
        "focus": "周三",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：281-330。",
            "公式問題集 12：TEST 1 Part 3 再做 2 组。",
            "公式問題集 12：TEST 1 Part 5 做 15 题。",
            "错题本：整理 10 个高频错词。",
            "重点｜听力错题不要只看答案，要看“正确选项在原文哪一句出现”。"
        ]
    },
    "2026-07-16": {
        "focus": "周四",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：331-380。",
            "公式問題集 12：TEST 1 Part 4 做 1-2 组。",
            "文法特急：1 站。",
            "App：单词复习 10 分钟。",
            "重点｜Part 4 常见场景是通知、语音留言、广告、广播。"
        ]
    },
    "2026-07-17": {
        "focus": "周五",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：381-430。",
            "小测试：复习本周所有星号词。",
            "公式問題集 12：TEST 1 Part 1 + Part 2 错题重做。",
            "文法特急：本周错题重做。",
            "完成标准1｜金フレ至少过 400 个左右。",
            "完成标准2｜Part 1/2 的错题能听懂原文。",
            "完成标准3｜文法特急错题知道是词性、时态、介词还是连接词。"
        ]
    },
    "2026-07-18": {
        "focus": "周六",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：431-480。",
            "公式問題集 12：TEST 1 Part 3 做 3 组。",
            "文法特急：2 站。",
            "复盘：听力错题原文跟读。"
        ]
    },
    "2026-07-19": {
        "focus": "周日",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：481-530。",
            "公式問題集 12：TEST 1 Part 4 做 3 组。",
            "公式問題集 12：TEST 1 Part 5 做 20 题。",
            "错题本：整理 Part 5 错题。"
        ]
    },
    "2026-07-20": {
        "focus": "周一",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：531-580。",
            "App：听力弱点练习 20 题。",
            "公式問題集 12：TEST 1 Part 7 做 2 篇短文。",
            "文法特急：1 站。"
        ]
    },
    "2026-07-21": {
        "focus": "周二",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：581-630。",
            "公式問題集 12：TEST 1 Part 3 做 3 组。",
            "公式問題集 12：TEST 1 Part 6 做 1 篇。",
            "复盘：Part 6 看连接词和前后句逻辑。"
        ]
    },
    "2026-07-22": {
        "focus": "周三",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：631-680。",
            "公式問題集 12：TEST 1 Part 4 做 3 组。",
            "文法特急：1-2 站。",
            "App：单词复习 10 分钟。"
        ]
    },
    "2026-07-23": {
        "focus": "周四",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：681-730。",
            "公式問題集 12：TEST 1 Part 5 剩余题。",
            "公式問題集 12：TEST 1 Part 7 做 2 篇。",
            "错题本：整理 15 个词。"
        ]
    },
    "2026-07-24": {
        "focus": "周五",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：731-780。",
            "本周复盘：Part 3/4 错题重听。",
            "文法特急：错题重做。",
            "App：做一次 20-30 分钟弱点练习。",
            "完成标准1｜金フレ接近 800 个。",
            "完成标准2｜Part 3/4 做题前能先读题。",
            "完成标准3｜Part 5 开始能判断一部分词性题。"
        ]
    },
    "2026-07-25": {
        "focus": "周六",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：781-830。",
            "公式問題集 12：TEST 1 听力 Part 1-2 计时重做。",
            "文法特急：2 站。",
            "复盘：Part 2 错题按疑问词分类。"
        ]
    },
    "2026-07-26": {
        "focus": "周日",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：831-880。",
            "公式問題集 12：TEST 1 听力 Part 3-4 做一半。",
            "公式問題集 12：TEST 1 Part 5 做 20 题计时。",
            "错题本：整理错题。"
        ]
    },
    "2026-07-27": {
        "focus": "周一",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：881-930。",
            "公式問題集 12：TEST 1 Part 7 做 3 篇。",
            "文法特急：1 站。",
            "App：听力练习 15 分钟。"
        ]
    },
    "2026-07-28": {
        "focus": "周二",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：931-980。",
            "公式問題集 12：TEST 1 听力 Part 3-4 剩余题。",
            "复盘：错题原文精听。"
        ]
    },
    "2026-07-29": {
        "focus": "周三",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：981-1030。",
            "公式問題集 12：TEST 1 Part 6 做完。",
            "公式問題集 12：TEST 1 Part 7 做 3 篇。",
            "文法特急：1 站。"
        ]
    },
    "2026-07-30": {
        "focus": "周四",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1031-1080。",
            "公式問題集 12：TEST 1 阅读剩余题尽量做完。",
            "不限时先做完，再对答案。",
            "错题本：整理 Part 7 生词。"
        ]
    },
    "2026-07-31": {
        "focus": "周五",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：复习 1-1080 的星号词，不学太多新词。",
            "TEST 1 总复盘：统计听力分、阅读分、错题类型。",
            "文法特急：错题重做。",
            "完成标准1｜TEST 1 基本做完。",
            "完成标准2｜知道自己 Part 1-7 哪一部分最拖分。",
            "完成标准3｜金フレ第一轮已经过一大半。"
        ]
    },
    "2026-08-01": {
        "focus": "周六",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1081-1130。",
            "公式問題集 12：TEST 2 Part 1 + Part 2。",
            "文法特急：2 站。",
            "复盘：听力错题重听。"
        ]
    },
    "2026-08-02": {
        "focus": "周日",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1131-1180。",
            "公式問題集 12：TEST 2 Part 3 做 3-4 组。",
            "公式問題集 12：TEST 2 Part 5 做 20 题。"
        ]
    },
    "2026-08-03": {
        "focus": "周一",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1181-1230。",
            "公式問題集 12：TEST 2 Part 4 做 3-4 组。",
            "公式問題集 12：TEST 2 Part 7 做 2 篇。"
        ]
    },
    "2026-08-04": {
        "focus": "周二",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1231-1280。",
            "文法特急：1-2 站。",
            "App：听力弱点练习 20 题。",
            "TEST 2 Part 3/4 错题精听。"
        ]
    },
    "2026-08-05": {
        "focus": "周三",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1281-1330。",
            "公式問題集 12：TEST 2 Part 5/6 继续做。",
            "公式問題集 12：TEST 2 Part 7 做 3 篇。"
        ]
    },
    "2026-08-06": {
        "focus": "周四",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1331-1380。",
            "公式問題集 12：TEST 2 听力剩余部分做完。",
            "复盘：错题听 3 遍，跟读关键句。"
        ]
    },
    "2026-08-07": {
        "focus": "周五",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1381-1430。",
            "公式問題集 12：TEST 2 阅读继续做。",
            "文法特急：错题重做。",
            "本周总结：统计正确率。",
            "完成标准1｜TEST 2 已做一半以上。",
            "完成标准2｜听力不能只做题，必须开始精听。",
            "完成标准3｜Part 5 错题数量要慢慢下降。"
        ]
    },
    "2026-08-08": {
        "focus": "周六",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1431-1480。",
            "公式問題集 12：TEST 2 阅读做完。",
            "TEST 2 错题初步整理。"
        ]
    },
    "2026-08-09": {
        "focus": "周日",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "第一次完整模拟：重做 TEST 1。",
            "严格计时：听力约 45 分钟，阅读约 75 分钟。",
            "做完后先不要马上看解析，先标出没把握的题。"
        ]
    },
    "2026-08-10": {
        "focus": "周一",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "复盘 TEST 1 听力。",
            "每道错题听 3 遍。",
            "看原文，标出没听出来的词。",
            "金フレ：只复习星号词。"
        ]
    },
    "2026-08-11": {
        "focus": "周二",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "复盘 TEST 1 阅读。",
            "Part 5 错题写语法原因。",
            "Part 7 错题写定位句。",
            "文法特急：1 站。"
        ]
    },
    "2026-08-12": {
        "focus": "周三",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1481-1530。",
            "公式問題集 12：TEST 2 Part 1/2 错题重做。",
            "App：听力弱点练习 20 题。"
        ]
    },
    "2026-08-13": {
        "focus": "周四",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：1531-1580。",
            "公式問題集 12：TEST 2 Part 3/4 错题重听。",
            "文法特急：2 站。"
        ]
    },
    "2026-08-14": {
        "focus": "周五",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：复习 1-1580 星号词。",
            "Part 5 错题总复习。",
            "Part 7 做 2 篇短文，计时。",
            "完成标准1｜完成第一次完整模拟。",
            "完成标准2｜知道自己距离 600 还差在听力、词汇还是做题速度。",
            "完成标准3｜错题不再只写答案，要写原因。"
        ]
    },
    "2026-08-15": {
        "focus": "周六",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "第二次完整模拟：做 TEST 2 或重做 TEST 2。",
            "严格计时，不中途查词。",
            "做完记录分数和时间。"
        ]
    },
    "2026-08-16": {
        "focus": "周日",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "复盘 TEST 2 听力。",
            "Part 2 错题重点看疑问词。",
            "Part 3/4 错题重点看正确答案对应原文哪一句。",
            "金フレ：星号词复习。"
        ]
    },
    "2026-08-17": {
        "focus": "周一",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "复盘 TEST 2 阅读。",
            "Part 5 错题按词性、时态、介词、连接词分类。",
            "Part 7 错题找定位句。"
        ]
    },
    "2026-08-18": {
        "focus": "周二",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "金フレ：只复习高频星号词。",
            "文法特急：错题重做。",
            "App：听力弱点练习 20 题。",
            "公式問題集 12：Part 1/2 错题重听。"
        ]
    },
    "2026-08-19": {
        "focus": "周三",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "公式問題集 12：Part 3/4 错题重听。",
            "公式問題集 12：Part 5 错题重做。",
            "金フレ：复习最不熟的 100 个。"
        ]
    },
    "2026-08-20": {
        "focus": "周四",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "小模拟：听力 45 分钟或阅读 75 分钟，二选一。",
            "如果累，就只做听力 Part 1-4 错题。",
            "金フレ：复习星号词。"
        ]
    },
    "2026-08-21": {
        "focus": "考前两天：收口，不再开新坑",
        "tasks": [
            "日清底线｜金フレ/听力/阅读语法/错题复盘至少完成当天安排，不把欠账拖到明天",
            "不做新难题。",
            "复习金フレ星号词。",
            "复习文法特急错题。",
            "听 TEST 1/2 的错题音频。",
            "完成标准1｜至少完整模拟 2 次。",
            "完成标准2｜金フレ星号词复习到看到就能反应意思。",
            "完成标准3｜Part 2 和 Part 5 错题明显减少。"
        ]
    },
    "2026-08-22": {
        "focus": "考前一天：稳住，不熬夜",
        "tasks": [
            "金フレ：只看星号词 30-60 分钟。",
            "听力：听官方题集错题音频 20-30 分钟。",
            "阅读：看 Part 5 错题，不做新题。",
            "准备：准考证、证件、铅笔/橡皮、考场路线。",
            "睡觉：尽量早睡。",
            "禁止：不要做一整套新题。",
            "禁止：不要熬夜背单词。",
            "禁止：不要临时买新资料。"
        ]
    },
    "2026-08-23": {
        "focus": "考试当天：稳定发挥",
        "tasks": [
            "进考场前：只看 20-30 个熟悉的词，不看新词。",
            "进考场前：听一小段熟悉音频，让耳朵进入英语状态。",
            "阅读部分如果做不完，不要慌。先保证 Part 5/6 稳定拿分，Part 7 会做的先做。",
            "Part 1：看图先想人、物、动作、位置。",
            "Part 2：听开头疑问词。",
            "Part 3/4：先看题干和选项，听到关键词就选，不纠结上一题。",
            "Part 5：先看空格前后判断词性。",
            "Part 6：看前后句逻辑。",
            "Part 7：先读题，再去文章找信息。"
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
