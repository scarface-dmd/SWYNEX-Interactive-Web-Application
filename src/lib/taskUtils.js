export const STORAGE_KEY = "taskflow.tasks.v1";
export const PRIORITIES = ["Low", "Medium", "High"];

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return (
    day <=
    [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  );
}

export function formatDueDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  // Construct local noon rather than parsing an ISO string as UTC.
  const date = new Date(2000, month - 1, day, 12);
  date.setFullYear(year);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function isOverdue(task, today = localDateKey()) {
  return !task.completed && Boolean(task.dueDate) && task.dueDate < today;
}

export function validateTask(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = "Give your task a title.";
  else if (values.title.length > 100)
    errors.title = "Keep the title to 100 characters or fewer.";
  if (values.description.length > 500)
    errors.description = "Keep the description to 500 characters or fewer.";
  if (!PRIORITIES.includes(values.priority))
    errors.priority = "Choose Low, Medium, or High priority.";
  if (values.dueDate && !isValidDate(values.dueDate))
    errors.dueDate = "Enter a valid calendar date.";
  return errors;
}

export function taskReducer(tasks, action) {
  switch (action.type) {
    case "add":
      return [action.task, ...tasks];
    case "edit":
      return tasks.map((task) =>
        task.id === action.id ? { ...task, ...action.values } : task,
      );
    case "toggle":
      return tasks.map((task) =>
        task.id === action.id ? { ...task, completed: !task.completed } : task,
      );
    case "delete":
      return tasks.filter((task) => task.id !== action.id);
    default:
      return tasks;
  }
}

export function getTaskCounts(tasks, today = localDateKey()) {
  const completed = tasks.filter((task) => task.completed).length;
  return {
    total: tasks.length,
    active: tasks.length - completed,
    completed,
    overdue: tasks.filter((task) => isOverdue(task, today)).length,
  };
}

export function filterTasks(tasks, { search, status, priority }) {
  const query = search.trim().toLowerCase();
  return tasks.filter(
    (task) =>
      (status === "All" ||
        (status === "Completed" ? task.completed : !task.completed)) &&
      (priority === "All" || task.priority === priority) &&
      `${task.title}\n${task.description}`.toLowerCase().includes(query),
  );
}

export function loadTasks(storage) {
  try {
    const raw = (storage ?? window.localStorage).getItem(STORAGE_KEY);
    if (raw === null) return { tasks: [], warning: "" };
    const tasks = JSON.parse(raw);
    const ids = new Set();
    if (
      !Array.isArray(tasks) ||
      !tasks.every((task) => {
        if (
          !task ||
          typeof task.id !== "string" ||
          !task.id.trim() ||
          ids.has(task.id) ||
          typeof task.title !== "string" ||
          typeof task.description !== "string" ||
          typeof task.completed !== "boolean" ||
          typeof task.dueDate !== "string" ||
          Object.keys(validateTask(task)).length > 0
        )
          return false;
        ids.add(task.id);
        return true;
      })
    )
      throw new Error("Invalid saved tasks");
    return { tasks, warning: "" };
  } catch {
    return {
      tasks: [],
      warning:
        "Saved tasks could not be loaded. Storage may be unavailable or the saved data may be damaged. You can still use TaskFlow; adding a task will attempt to save a fresh list.",
    };
  }
}

export function saveTasks(tasks, storage) {
  try {
    (storage ?? window.localStorage).setItem(
      STORAGE_KEY,
      JSON.stringify(tasks),
    );
    return "";
  } catch {
    return "Your latest changes are only in memory because browser storage is unavailable or full. Keep this page open to avoid losing them.";
  }
}
