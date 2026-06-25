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
const examDate = new Date(2026, 6, 5);
const N2_PLAN_VERSION = "n2-sprint-2026-07-05-v2";
let activeFilter = "all";
let state = loadState();
let selectedDate = new Date(today);
let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let weekCursor = getStartOfWeek(today);
let toastTimer;

ensureToday();
seedN2Plan();
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

function seedN2Plan() {
  Object.entries(getN2Plan()).forEach(([key, dayPlan]) => {
    ensureDay(key);
    const existingCurrentPlan = state.days[key].tasks.some(
      (task) => task.plan === N2_PLAN_VERSION,
    );
    if (existingCurrentPlan) return;

    const oldPlanTasks = state.days[key].tasks.filter(
      (task) => task.plan?.startsWith("n2-sprint-"),
    );
    const completedOldTasks = oldPlanTasks.filter((task) => task.done).length;
    state.days[key].tasks = state.days[key].tasks.filter(
      (task) => !task.plan?.startsWith("n2-sprint-"),
    );

    dayPlan.tasks.forEach((title, index) => {
      state.days[key].tasks.push({
        id: createId(),
        title,
        done: index < completedOldTasks,
        createdAt: Date.now(),
        plan: N2_PLAN_VERSION,
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
  taskInput.placeholder = isToday ? "例如：背 30 个单词" : "为这一天安排一项任务";
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
  const plan = getN2Plan()[getSelectedKey()];
  examDaysLeft.textContent = String(remainingDays);
  examDateLabel.textContent = "2026年7月5日 · JLPT N2";
  dailyFocus.textContent = plan
    ? `今日重点：${plan.focus}`
    : getSelectedKey() > toDateKey(examDate)
      ? "考试已经结束，辛苦了"
      : "选择冲刺日期查看当天重点";
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
  if (/书|读|阅读|学习|背|单词/.test(text)) return "📖";
  if (/饭|吃|早餐|午餐|晚餐/.test(text)) return "🥗";
  if (/洗|澡|清洁/.test(text)) return "🛁";
  if (/药|维生素/.test(text)) return "💊";
  if (/冥想|呼吸/.test(text)) return "🧘";
  return "✨";
}

function getN2Plan() {
  return {
    "2026-06-25": {
      focus: "第11课吃透 + 真题摸底",
      tasks: [
        "① 语法课｜周业繁视频 + 新完全掌握第11课同步学；每个句型写接续、中文义和1个自造句（90分钟）",
        "② 蓝宝书｜查找第11课对应语法，做20题；错题旁写“为什么不能选其他项”（40分钟，正确率≥75%）",
        "③ MOJiTest｜N2单词新学60个，复习180个；错词加入收藏并晚间再测一次（45分钟）",
        "④ 真题摸底｜做1套文字词汇+语法部分，严格计时；记录正确率和3类最大失分点（45分钟）",
        "⑤ 真题阅读｜短篇2篇+中篇1篇（35分钟）；每题圈出原文定位句",
        "⑥ 真题听力｜问题理解+即时应答各一组（30分钟）；错题盲听→看原文→再听",
        "⑦ 收尾｜把今天错词、错语法、错题型各写前3名，明早先复习（15分钟）",
      ],
    },
    "2026-06-26": {
      focus: "第12-13课 + 短中篇提速",
      tasks: [
        "① 语法课｜周业繁视频 + 新完全掌握第12-13课；相似句型做成二选一对比卡（120分钟）",
        "② 蓝宝书｜对应语法30题（45分钟）；正确率不足75%时，只回看错题对应视频段落",
        "③ MOJiTest｜新学60个 + 复习昨日错词和旧词180个；最终正确率≥85%（45分钟）",
        "④ 真题阅读｜短篇2篇+中篇2篇，限时45分钟；单篇超时立即标记",
        "⑤ 真题听力｜重点理解+概要理解共30分钟；每道错题写漏听关键词",
        "⑥ 日清复盘｜口头讲出第11-13课至少10个句型，不会的加入明日复习表（20分钟）",
      ],
    },
    "2026-06-27": {
      focus: "第14-15课 + 词汇辨析",
      tasks: [
        "① 语法课｜周业繁视频 + 新完全掌握第14-15课；完成课后练习并逐题订正（120分钟）",
        "② 蓝宝书｜第11-15课混合语法35题（45分钟）；按接续错/语义错/语境错分类",
        "③ MOJiTest｜新学60个 + 复习200个；整理易混词20组并各写短语（50分钟）",
        "④ 真题语言知识｜汉字读音、词形成、近义替换、用法各做一组（35分钟）",
        "⑤ 真题阅读｜中篇2篇+综合理解1篇（50分钟）；先读问题再回文定位",
        "⑥ 真题听力｜概要理解+即时应答40分钟；错题至少重听3遍",
      ],
    },
    "2026-06-28": {
      focus: "真题一整套，建立时间分配",
      tasks: [
        "① N2真题一｜语言知识+阅读完整105分钟；全程不停表，最后5分钟检查答题卡",
        "② N2真题一｜听力完整50分钟；不中途暂停，模拟正式考试",
        "③ 真题复盘｜分别计算语言知识、阅读、听力正确率；标出低于60%的模块（60分钟）",
        "④ 错题归因｜每题标记：不会/混淆/没看清/时间不足/漏听；同类错误超过3题即列为弱项",
        "⑤ 语法补洞｜只看周业繁/新完全掌握中对应错题的内容，不推进新课（45分钟）",
        "⑥ MOJiTest｜仅复习真题生词和既有错词200个（30分钟）",
      ],
    },
    "2026-06-29": {
      focus: "第16-17课 + 真题弱项修复",
      tasks: [
        "① 语法课｜周业繁视频 + 新完全掌握第16-17课；每课结束闭书复述句型（110分钟）",
        "② 蓝宝书｜第16-17课对应题20题 + 真题错语法重做（40分钟，目标≥80%）",
        "③ MOJiTest｜新学50个 + 复习错词220个；连续答对2次才移出错词（45分钟）",
        "④ 真题弱项A｜选择昨日最低正确率题型，专项做3组并计时（45分钟）",
        "⑤ 真题阅读｜中篇1篇+长篇/主旨题1篇（40分钟）；写每段一句主旨",
        "⑥ 真题听力｜昨日最低分题型30分钟 + 影子跟读10分钟",
      ],
    },
    "2026-06-30": {
      focus: "第18-19课 + 听力专项",
      tasks: [
        "① 语法课｜周业繁视频 + 新完全掌握第18-19课；整理与第11-17课相似句型（110分钟）",
        "② 蓝宝书｜第11-19课混合语法40题（50分钟）；错题正确率二刷达到90%",
        "③ MOJiTest｜新学50个 + 复习250个；重点做词汇用法题（45分钟）",
        "④ 真题听力｜完整50分钟一套；第一遍模拟，第二遍只精听错题（75分钟）",
        "⑤ 真题阅读｜信息检索2篇+综合理解1篇（40分钟）；训练快速找条件和对立观点",
        "⑥ 错题本｜压缩成一页“高危语法/词汇/听力信号词”（20分钟）",
      ],
    },
    "2026-07-01": {
      focus: "第20课后继续推进 + 首轮总复习",
      tasks: [
        "① 语法课｜从新完全掌握第20课继续，按周业繁视频实际进度完成2课；不为赶课跳过练习（120分钟）",
        "② 蓝宝书｜高频语法与敬语/助词/副词专项35题（45分钟）",
        "③ 语法口试｜随机抽30个已学句型，10秒内说出接续和意思；答错立刻回书（30分钟）",
        "④ MOJiTest｜停止大量新词；复习高频词、错词共300个（50分钟，目标≥90%）",
        "⑤ 真题阅读｜短中长与信息检索混合一组，限时60分钟；检查时间分配",
        "⑥ 真题听力｜即时应答+综合理解40分钟；练习错过一题后立即切换注意力",
      ],
    },
    "2026-07-02": {
      focus: "真题二全真模考，锁定最终弱项",
      tasks: [
        "① N2真题二｜按正式时间完成语言知识+阅读105分钟，桌面只留考试用品",
        "② N2真题二｜休息后完成听力50分钟，全程不暂停",
        "③ 三科估分｜语言知识、阅读、听力分别统计；任何一科低于60%列为最高优先级",
        "④ 深度复盘｜所有错题写答案依据；蒙对题也算错题处理（90分钟）",
        "⑤ 蓝宝书｜只做模考错语法对应题20题，确认不是偶然答对",
        "⑥ MOJiTest｜导入真题生词，连同旧错词复习150个，不再追求新词量",
        "⑦ 最终清单｜写出未来两天只补的3个弱点，其他内容暂时停止",
      ],
    },
    "2026-07-03": {
      focus: "按模考结果精准补分",
      tasks: [
        "① 弱项一｜针对模考最低模块做真题专项3组（50分钟）；完成后正确率≥75%",
        "② 弱项二｜针对第二弱模块做真题专项2组（40分钟）；逐题写依据",
        "③ 语法回收｜周业繁视频只回看错题时间点；新完全掌握重做对应练习（60分钟）",
        "④ 蓝宝书｜错题页与标记题30题，目标≥85%；仍错的抄入最终一页纸",
        "⑤ MOJiTest｜高频词+全部错词250个，不新增低频词（45分钟）",
        "⑥ 阅读保温｜长篇1篇+信息检索1篇（35分钟），严格控制节奏",
        "⑦ 听力保温｜重点理解+即时应答30分钟，只复盘错题",
      ],
    },
    "2026-07-04": {
      focus: "最终回收，减量保状态",
      tasks: [
        "① 语法最终页｜看新完全掌握/蓝宝书错题与相似语法对比，闭书回忆30个重点（60分钟）",
        "② MOJiTest｜只复习收藏错词150个；答不出的看例句，不再添加新词（30分钟）",
        "③ 真题热身｜文字词汇10题+语法10题+短篇1篇，控制在30分钟内",
        "④ 听力热身｜即时应答10题+重点理解2题（20分钟），保持耳朵不做整套",
        "⑤ 考试策略｜确定105分钟分配、跳题规则、涂卡检查时间（15分钟）",
        "⑥ 考试准备｜准考证、证件、2B/HB铅笔、橡皮、手表、路线全部装包",
        "⑦ 状态管理｜晚间停止刷题，洗澡放松，23点前睡觉",
      ],
    },
    "2026-07-05": {
      focus: "稳定发挥，不在考前消耗自己",
      tasks: [
        "① 出发前｜正常早餐、补水，确认准考证和证件；至少提前45分钟到场",
        "② 考前复习｜只看最终一页语法和30个高危错词，20分钟后停止",
        "③ 语言知识｜单题卡住超过40秒先标记跳过，保证阅读时间",
        "④ 阅读｜先看题目再定位；最后预留5分钟检查和涂卡",
        "⑤ 听力｜先扫选项和人物关系；漏掉一题立即放下，专注下一题",
        "⑥ 完成考试｜每个科目都必须参加，交卷前检查姓名和答题卡",
      ],
    },
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
