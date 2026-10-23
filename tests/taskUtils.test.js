import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  STORAGE_KEY,
  localDateKey,
  isValidDate,
  formatDueDate,
  isOverdue,
  validateTask,
  taskReducer,
  getTaskCounts,
  filterTasks,
  loadTasks,
  saveTasks,
} from "../src/lib/taskUtils.js";

const task = (values = {}) => ({
  id: "task-1",
  title: "Plan the week",
  description: "",
  priority: "Medium",
  dueDate: "",
  completed: false,
  ...values,
});
const filters = (values = {}) => ({
  search: "",
  status: "All",
  priority: "All",
  ...values,
});
const stored = (value) => ({
  getItem(key) {
    assert.equal(key, STORAGE_KEY);
    return value;
  },
});

test("validation rejects blank titles, including whitespace", () => {
  for (const title of ["", " ", "\t\n\r"]) {
    assert.deepEqual(validateTask(task({ title })), {
      title: "Give your task a title.",
    });
  }
  assert.deepEqual(validateTask(task({ title: "  A useful task  " })), {});
});

test("title and description limits include their boundaries and raw whitespace", () => {
  assert.deepEqual(
    validateTask(
      task({ title: "a".repeat(100), description: "b".repeat(500) }),
    ),
    {},
  );
  assert.deepEqual(
    validateTask(
      task({ title: "a".repeat(101), description: "b".repeat(501) }),
    ),
    {
      title: "Keep the title to 100 characters or fewer.",
      description: "Keep the description to 500 characters or fewer.",
    },
  );
  assert.ok(validateTask(task({ title: ` ${"a".repeat(100)}` })).title);
  assert.ok(validateTask(task({ description: " ".repeat(501) })).description);
});

test("description and date are optional, past dates are allowed, priorities are exact", () => {
  for (const priority of ["Low", "Medium", "High"]) {
    assert.deepEqual(validateTask(task({ priority })), {});
    assert.deepEqual(
      validateTask(task({ priority, dueDate: "2000-01-01" })),
      {},
    );
  }
  for (const priority of ["", "medium", "Urgent", null, undefined]) {
    assert.deepEqual(validateTask(task({ priority })), {
      priority: "Choose Low, Medium, or High priority.",
    });
  }
  assert.deepEqual(validateTask(task({ dueDate: "2025-02-29" })), {
    dueDate: "Enter a valid calendar date.",
  });
});

test("calendar validation handles month lengths, strict syntax, and Gregorian leap years", () => {
  for (const date of [
    "0001-01-01",
    "0099-12-31",
    "2000-02-29",
    "2024-02-29",
    "2400-02-29",
    "2026-04-30",
    "2026-12-31",
    "9999-12-31",
  ]) {
    assert.equal(isValidDate(date), true, date);
  }
  for (const date of [
    "",
    " ",
    "2026-1-01",
    "2026-01-1",
    "26-01-01",
    "10000-01-01",
    "2026-01-01T00:00:00Z",
    " 2026-01-01",
    "2026-01-01 ",
    "0000-01-01",
    "2026-00-01",
    "2026-13-01",
    "2026-01-00",
    "2026-01-32",
    "2026-04-31",
    "2026-02-30",
    "2025-02-29",
    "1900-02-29",
    "2100-02-29",
  ]) {
    assert.equal(isValidDate(date), false, date);
  }
});

test("local date keys are padded and due dates are formatted without changing the year", () => {
  assert.equal(localDateKey(new Date(2026, 0, 2, 23, 59)), "2026-01-02");
  for (const [value, year, month, day] of [
    ["2024-02-29", 2024, 1, 29],
    ["0001-01-01", 1, 0, 1],
    ["0099-12-31", 99, 11, 31],
  ]) {
    const date = new Date(2000, month, day, 12);
    date.setFullYear(year);
    assert.equal(
      formatDueDate(value),
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date),
    );
  }
});

for (const [tz, expected] of [
  ["UTC", "2026-01-01"],
  ["America/Los_Angeles", "2026-01-01"],
  ["Pacific/Kiritimati", "2026-01-02"],
]) {
  test(`local dates and default overdue calculations respect TZ=${tz}`, () => {
    // Separate processes avoid changing the timezone of concurrent tests.
    const script = `
      import assert from 'node:assert/strict';
      import { localDateKey, formatDueDate, isOverdue, getTaskCounts } from ${JSON.stringify(new URL("../src/lib/taskUtils.js", import.meta.url).href)};
      const NativeDate = Date;
      globalThis.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : ['2026-01-01T10:30:00Z'])); }
      };
      assert.equal(localDateKey(), ${JSON.stringify(expected)});
      assert.equal(localDateKey(new NativeDate('2026-01-01T00:30:00Z')),
        ${JSON.stringify(tz === "America/Los_Angeles" ? "2025-12-31" : "2026-01-01")});
      for (const value of ['2024-02-29', '2026-03-08', '2026-11-01']) {
        const [y, m, d] = value.split('-').map(Number);
        assert.equal(formatDueDate(value), new Intl.DateTimeFormat(undefined, {
          month: 'short', day: 'numeric', year: 'numeric'
        }).format(new NativeDate(y, m - 1, d, 12)));
      }
      const tasks = [{ completed: false, dueDate: '2026-01-01' }];
      assert.equal(isOverdue(tasks[0]), ${expected > "2026-01-01"});
      assert.equal(getTaskCounts(tasks).overdue, ${Number(expected > "2026-01-01")});
    `;
    execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
      env: { ...process.env, TZ: tz },
      encoding: "utf8",
    });
  });
}

test("reducer add, edit, toggle and delete do not mutate tasks or action values", () => {
  const first = Object.freeze(task());
  const second = Object.freeze(
    task({ id: "task-2", title: "Second", completed: true }),
  );
  const original = Object.freeze([first, second]);
  const addedTask = Object.freeze(task({ id: "task-3" }));
  const added = taskReducer(
    original,
    Object.freeze({ type: "add", task: addedTask }),
  );
  assert.deepEqual(added, [addedTask, first, second]);
  assert.notEqual(added, original);

  const values = Object.freeze({
    title: "Edited",
    description: "Details",
    priority: "High",
    dueDate: "2024-02-29",
  });
  const edited = taskReducer(
    original,
    Object.freeze({ type: "edit", id: first.id, values }),
  );
  assert.deepEqual(edited[0], { ...first, ...values });
  assert.notEqual(edited[0], first);
  assert.equal(edited[1], second);
  assert.notEqual(edited, original);

  const toggled = taskReducer(original, { type: "toggle", id: first.id });
  assert.deepEqual(toggled[0], { ...first, completed: true });
  assert.notEqual(toggled[0], first);
  assert.equal(toggled[1], second);
  assert.deepEqual(
    taskReducer(toggled, { type: "toggle", id: first.id }),
    original,
  );
  const deleted = taskReducer(original, { type: "delete", id: first.id });
  assert.deepEqual(deleted, [second]);
  assert.notEqual(deleted, original);
  assert.equal(deleted[0], second);
  assert.deepEqual(original, [
    task(),
    task({ id: "task-2", title: "Second", completed: true }),
  ]);
});

test("unknown actions preserve the array and missing IDs leave values unchanged", () => {
  const tasks = Object.freeze([Object.freeze(task())]);
  assert.equal(taskReducer(tasks, { type: "unknown" }), tasks);
  for (const type of ["edit", "toggle", "delete"]) {
    const result = taskReducer(tasks, {
      type,
      id: "missing",
      values: { title: "Changed" },
    });
    assert.deepEqual(result, tasks);
    assert.equal(result[0], tasks[0]);
  }
});

test("counts and overdue distinguish completed, undated, today, past and future tasks", () => {
  const today = "2026-03-01";
  const tasks = [
    task({ dueDate: "2026-02-28" }),
    task({ dueDate: today }),
    task({ dueDate: "2026-03-02" }),
    task(),
    task({ completed: true, dueDate: "2024-02-29" }),
  ];
  assert.deepEqual(
    tasks.map((item) => isOverdue(item, today)),
    [true, false, false, false, false],
  );
  assert.deepEqual(getTaskCounts(tasks, today), {
    total: 5,
    active: 4,
    completed: 1,
    overdue: 1,
  });
  assert.deepEqual(getTaskCounts([], today), {
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0,
  });
});

test("search matches title or description, trims case-insensitively, and combines all filters", () => {
  const tasks = Object.freeze([
    Object.freeze(task({ id: "a", title: "Release plan", priority: "High" })),
    Object.freeze(
      task({
        id: "b",
        title: "Review",
        description: "RELEASE notes",
        priority: "High",
        completed: true,
      }),
    ),
    Object.freeze(
      task({ id: "c", title: "Release checklist", priority: "Low" }),
    ),
    Object.freeze(task({ id: "d", title: "Other", priority: "High" })),
  ]);
  assert.deepEqual(filterTasks(tasks, filters()), tasks);
  assert.deepEqual(
    filterTasks(tasks, filters({ search: "  reLEASE  " })),
    tasks.slice(0, 3),
  );
  assert.deepEqual(
    filterTasks(
      tasks,
      filters({ search: "release", status: "Active", priority: "High" }),
    ),
    [tasks[0]],
  );
  assert.deepEqual(
    filterTasks(
      tasks,
      filters({ search: "release", status: "Completed", priority: "High" }),
    ),
    [tasks[1]],
  );
  assert.deepEqual(
    filterTasks(
      tasks,
      filters({ search: "release", status: "Completed", priority: "Low" }),
    ),
    [],
  );
  assert.deepEqual(filterTasks(tasks, filters({ search: "not found" })), []);
  assert.deepEqual(filterTasks([], filters()), []);
  assert.equal(tasks[1].description, "RELEASE notes");
});

test("loading missing, empty and valid storage uses the TaskFlow key", () => {
  assert.deepEqual(loadTasks(stored(null)), { tasks: [], warning: "" });
  assert.deepEqual(loadTasks(stored("[]")), { tasks: [], warning: "" });
  const tasks = [
    task(),
    task({
      id: "second",
      priority: "High",
      completed: true,
      dueDate: "2000-02-29",
    }),
  ];
  assert.deepEqual(loadTasks(stored(JSON.stringify(tasks))), {
    tasks,
    warning: "",
  });
});

test("malformed or non-array storage is rejected with a warning", () => {
  for (const raw of ["", "{broken", "null", "{}", "42", '"tasks"']) {
    const result = loadTasks(stored(raw));
    assert.deepEqual(result.tasks, [], raw);
    assert.match(result.warning, /Saved tasks could not be loaded/);
  }
});

test("invalid task records and duplicate IDs reject the whole saved list", () => {
  const invalid = [
    null,
    [],
    {},
    ...[
      { id: "" },
      { id: " \t" },
      { id: 1 },
      { title: null },
      { title: " " },
      { title: "t".repeat(101) },
      { description: null },
      { description: "d".repeat(501) },
      { completed: "false" },
      { completed: 0 },
      { priority: "Urgent" },
      { dueDate: null },
      { dueDate: "2025-02-29" },
      { dueDate: "1900-02-29" },
    ].map((values) => task({ id: "invalid", ...values })),
  ];
  for (const field of [
    "id",
    "title",
    "description",
    "completed",
    "priority",
    "dueDate",
  ]) {
    const record = task({ id: "invalid" });
    delete record[field];
    invalid.push(record);
  }
  for (const record of invalid) {
    const result = loadTasks(stored(JSON.stringify([task(), record])));
    assert.deepEqual(result.tasks, [], JSON.stringify(record));
    assert.match(result.warning, /saved data may be damaged/);
  }
  const duplicates = loadTasks(
    stored(JSON.stringify([task(), task({ title: "Duplicate ID" })])),
  );
  assert.deepEqual(duplicates.tasks, []);
  assert.ok(duplicates.warning);
});

test("storage read failures and unavailable localStorage are caught", () => {
  const result = loadTasks({
    getItem() {
      throw new Error("Access denied");
    },
  });
  assert.deepEqual(result.tasks, []);
  assert.match(result.warning, /Storage may be unavailable/);
  // Node has no window, exercising the default-storage failure path too.
  assert.ok(loadTasks().warning);
  assert.match(saveTasks([task()]), /only in memory/);
});

test("saving writes JSON under the correct key without mutating tasks", () => {
  const tasks = Object.freeze([Object.freeze(task())]);
  const writes = [];
  assert.equal(
    saveTasks(tasks, { setItem: (...args) => writes.push(args) }),
    "",
  );
  assert.deepEqual(writes, [[STORAGE_KEY, JSON.stringify(tasks)]]);
  assert.equal(saveTasks([], { setItem: (...args) => writes.push(args) }), "");
  assert.deepEqual(writes[1], [STORAGE_KEY, "[]"]);
});

test("saving failures produce a warning and can be retried", () => {
  let fail = true;
  let saved;
  const storage = {
    setItem(key, value) {
      assert.equal(key, STORAGE_KEY);
      if (fail) throw new Error("Quota exceeded");
      saved = value;
    },
  };
  assert.match(
    saveTasks([task()], storage),
    /only in memory.*unavailable or full/,
  );
  fail = false;
  assert.equal(saveTasks([task()], storage), "");
  assert.deepEqual(JSON.parse(saved), [task()]);
  const circular = [];
  circular.push(circular);
  assert.match(saveTasks(circular, storage), /only in memory/);
});
