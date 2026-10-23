import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const STORAGE_KEY = "taskflow.tasks.v1";

test("dashboard, task cards, and dialogs have no detected WCAG A/AA violations", async ({
  page,
}) => {
  await seed(page, [
    task({
      priority: "High",
      dueDate: "2000-01-01",
      description: "A readable task description.",
    }),
    task({
      id: "completed",
      title: "Finished task",
      priority: "Low",
      completed: true,
    }),
    task({ id: "medium", title: "Medium task" }),
  ]);
  await page.goto("/");
  const scan = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  };
  await scan();
  await page
    .getByRole("button", { name: "Edit Plan the week", exact: true })
    .click();
  await scan();
  // Native modal dialogs keep Tab and Shift+Tab inside the open dialog.
  for (let index = 0; index < 10; index++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        document.querySelector("dialog").contains(document.activeElement),
      ),
    ).toBe(true);
  }
  for (let index = 0; index < 10; index++) {
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(() =>
        document.querySelector("dialog").contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Delete Plan the week", exact: true })
    .click();
  await scan();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 320, height: 900 });
  await scan();
});
const task = (values = {}) => ({
  id: "task-1",
  title: "Plan the week",
  description: "",
  priority: "Medium",
  dueDate: "",
  completed: false,
  ...values,
});
const createPanel = (page) =>
  page.getByRole("complementary", {
    name: "Create and track tasks",
    exact: true,
  });
const titleField = (scope) =>
  scope.getByRole("textbox", { name: "Task title *", exact: true });
const descriptionField = (scope) =>
  scope.getByRole("textbox", { name: "Description (optional)", exact: true });
const dueField = (scope) =>
  scope.getByLabel("Due date (optional)", { exact: true });
const card = (page, title) =>
  page.getByRole("article").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });

async function seed(page, tasks) {
  // Init scripts run on reload too; seed only once per isolated browser context.
  await page.addInitScript(
    ({ key, raw }) => {
      if (!sessionStorage.getItem("taskflow-test-seeded")) {
        localStorage.setItem(key, raw);
        sessionStorage.setItem("taskflow-test-seeded", "yes");
      }
    },
    {
      key: STORAGE_KEY,
      raw: typeof tasks === "string" ? tasks : JSON.stringify(tasks),
    },
  );
}

async function addTask(
  page,
  { title, description = "", priority = "Medium", dueDate = "" },
) {
  const form = createPanel(page);
  await titleField(form).fill(title);
  await descriptionField(form).fill(description);
  await form
    .getByRole("combobox", { name: "Priority", exact: true })
    .selectOption(priority);
  await dueField(form).fill(dueDate);
  await form.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(card(page, title.trim())).toBeVisible();
}

async function expectCounts(page, { total, active, completed, overdue }) {
  const stats = page.getByRole("region", {
    name: "Task statistics",
    exact: true,
  });
  for (const [label, value] of [
    ["Total tasks", total],
    ["Active", active],
    ["Completed", completed],
    ["Overdue", overdue],
  ]) {
    // StatCard has no named role; anchor its value to the exact visible label.
    await expect(
      stats.getByText(label, { exact: true }).locator("..").locator("strong"),
    ).toHaveText(String(value));
  }
}

async function savedTasks(page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    STORAGE_KEY,
  );
}

test("add validates blank and oversized fields, preserves values, and resets only after success", async ({
  page,
}) => {
  await page.goto("/");
  const form = createPanel(page);
  await form.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(form.getByRole("alert")).toHaveText("Give your task a title.");
  await expect(titleField(form)).toBeFocused();
  await titleField(form).fill(" \t ");
  await descriptionField(form).fill("Keep these details");
  await form
    .getByRole("combobox", { name: "Priority", exact: true })
    .selectOption("High");
  await dueField(form).fill("2000-02-29");
  await form.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(titleField(form)).toHaveAttribute("aria-invalid", "true");
  await expect(descriptionField(form)).toHaveValue("Keep these details");
  await expect(dueField(form)).toHaveValue("2000-02-29");
  await expect(page.getByRole("article")).toHaveCount(0);

  await titleField(form).fill("T".repeat(101));
  await descriptionField(form).fill("D".repeat(501));
  await form.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(form.getByRole("alert")).toHaveText([
    "Keep the title to 100 characters or fewer.",
    "Keep the description to 500 characters or fewer.",
  ]);
  await expect(titleField(form)).toHaveValue("T".repeat(101));
  await expect(descriptionField(form)).toHaveValue("D".repeat(501));
  await titleField(form).fill("T".repeat(100));
  await descriptionField(form).fill("D".repeat(500));
  await form.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(card(page, "T".repeat(100))).toContainText("D".repeat(500));
  await expect(card(page, "T".repeat(100))).toContainText("High priority");
  await expect(titleField(form)).toHaveValue("");
  await expect(descriptionField(form)).toHaveValue("");
  await expect(dueField(form)).toHaveValue("");
  await expect(
    form.getByRole("combobox", { name: "Priority", exact: true }),
  ).toHaveValue("Medium");
  await expect(titleField(form)).toBeFocused();
  await expect(form.getByRole("alert")).toHaveCount(0);
});

test("add trims values, permits optional fields, and announces success", async ({
  page,
}) => {
  await page.goto("/");
  await addTask(page, {
    title: "  First task  ",
    description: "  Some details  ",
  });
  await expect(page.getByRole("status")).toHaveText("Added: First task.");
  await addTask(page, { title: "No deadline" });
  await expect(card(page, "No deadline").locator("time")).toHaveCount(0);
  await expect
    .poll(() => savedTasks(page))
    .toEqual([
      expect.objectContaining({
        title: "No deadline",
        description: "",
        dueDate: "",
        completed: false,
      }),
      expect.objectContaining({
        title: "First task",
        description: "Some details",
      }),
    ]);
});

test("edit validation preserves original task and draft, then saves without changing ID or completion", async ({
  page,
}) => {
  await seed(page, [
    task({
      completed: true,
      description: "Original details",
      dueDate: "2024-02-29",
    }),
  ]);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Edit Plan the week", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Edit task", exact: true });
  await expect(titleField(dialog)).toHaveValue("Plan the week");
  await expect(descriptionField(dialog)).toHaveValue("Original details");
  await expect(dueField(dialog)).toHaveValue("2024-02-29");
  await titleField(dialog).fill("   ");
  await descriptionField(dialog).fill("Draft details");
  await dialog
    .getByRole("combobox", { name: "Priority", exact: true })
    .selectOption("Low");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText("Give your task a title.");
  await expect(titleField(dialog)).toBeFocused();
  await expect(descriptionField(dialog)).toHaveValue("Draft details");
  await expect
    .poll(() => savedTasks(page))
    .toEqual([
      task({
        completed: true,
        description: "Original details",
        dueDate: "2024-02-29",
      }),
    ]);
  await titleField(dialog).fill("  Updated plan  ");
  await dueField(dialog).fill("");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(card(page, "Updated plan")).toContainText("Draft details");
  await expect(
    page.getByRole("checkbox", {
      name: "Mark Updated plan incomplete",
      exact: true,
    }),
  ).toBeChecked();
  await expect
    .poll(() => savedTasks(page))
    .toEqual([
      task({
        title: "Updated plan",
        description: "Draft details",
        priority: "Low",
        completed: true,
      }),
    ]);
});

for (const close of ["Cancel", "Close dialog", "Escape"]) {
  test(`edit ${close} discards draft and returns focus to its trigger`, async ({
    page,
  }) => {
    await seed(page, [task()]);
    await page.goto("/");
    const trigger = page.getByRole("button", {
      name: "Edit Plan the week",
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Edit task", exact: true });
    await expect(titleField(dialog)).toBeFocused();
    await titleField(dialog).fill("Unsaved draft");
    if (close === "Escape") await page.keyboard.press("Escape");
    else await dialog.getByRole("button", { name: close, exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(card(page, "Plan the week")).toBeVisible();
    expect(await savedTasks(page)).toEqual([task()]);
    await trigger.click();
    await expect(titleField(dialog)).toHaveValue("Plan the week");
  });
}

test("completion toggles counts, overdue, progress and persistence", async ({
  page,
}) => {
  await seed(page, [
    task({ dueDate: "2000-01-01" }),
    task({ id: "second", title: "Later" }),
  ]);
  await page.goto("/");
  await expectCounts(page, { total: 2, active: 2, completed: 0, overdue: 1 });
  await expect(
    card(page, "Plan the week").getByText("Overdue", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Mark Plan the week complete", exact: true })
    .check();
  await expectCounts(page, { total: 2, active: 1, completed: 1, overdue: 0 });
  await expect(
    card(page, "Plan the week").getByText("Overdue", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("progressbar", { name: "Tasks completed", exact: true }),
  ).toHaveAttribute("value", "50");
  await page.reload();
  await expect(
    page.getByRole("checkbox", {
      name: "Mark Plan the week incomplete",
      exact: true,
    }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", {
      name: "Mark Plan the week incomplete",
      exact: true,
    })
    .uncheck();
  await expectCounts(page, { total: 2, active: 2, completed: 0, overdue: 1 });
});

test("delete cancel and Escape preserve task, confirm deletes and focuses list heading", async ({
  page,
}) => {
  await seed(page, [task()]);
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Delete Plan the week",
    exact: true,
  });
  const dialog = page.getByRole("dialog", {
    name: "Delete this task?",
    exact: true,
  });
  for (const close of ["Keep task", "Escape", "Close dialog"]) {
    await trigger.click();
    await expect(
      dialog.getByRole("button", { name: "Keep task", exact: true }),
    ).toBeFocused();
    if (close === "Escape") await page.keyboard.press("Escape");
    else await dialog.getByRole("button", { name: close, exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await savedTasks(page)).toEqual([task()]);
  }
  await trigger.click();
  await dialog
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your tasks 0", exact: true }),
  ).toBeFocused();
  await expectCounts(page, { total: 0, active: 0, completed: 0, overdue: 0 });
  await expect.poll(() => savedTasks(page)).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "A fresh start, a clear mind.",
      exact: true,
    }),
  ).toBeVisible();
});

test("search, status and priority intersect and clear together without changing global counts", async ({
  page,
}) => {
  await seed(page, [
    task({ title: "Release plan", priority: "High" }),
    task({
      id: "b",
      title: "Review",
      description: "RELEASE notes",
      priority: "High",
      completed: true,
    }),
    task({ id: "c", title: "Release checklist", priority: "Low" }),
    task({ id: "d", title: "Unrelated", priority: "High" }),
  ]);
  await page.goto("/");
  const status = page.getByRole("group", {
    name: "Filter by status",
    exact: true,
  });
  await page
    .getByRole("searchbox", { name: "Search tasks", exact: true })
    .fill("  reLEASE  ");
  await page
    .getByRole("combobox", { name: "Filter by priority", exact: true })
    .selectOption("High");
  await status.getByRole("button", { name: "Active", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(card(page, "Release plan")).toBeVisible();
  await status.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(card(page, "Review")).toBeVisible();
  await expectCounts(page, { total: 4, active: 3, completed: 1, overdue: 0 });
  await page
    .getByRole("combobox", { name: "Filter by priority", exact: true })
    .selectOption("Low");
  await expect(
    page.getByRole("heading", { name: "No matching tasks", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear search & filters", exact: true })
    .click();
  await expect(
    page.getByRole("searchbox", { name: "Search tasks", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Filter by priority", exact: true }),
  ).toHaveValue("All");
  await expect(
    status.getByRole("button", { name: "All", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("article")).toHaveCount(4);
});

test("valid saved tasks survive refresh and newly added tasks are not replaced by seed data", async ({
  page,
}) => {
  await seed(page, [task({ dueDate: "2024-02-29", completed: true })]);
  await page.goto("/");
  await expect(card(page, "Plan the week")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await addTask(page, { title: "Persist me", priority: "Low" });
  await expect.poll(async () => (await savedTasks(page)).length).toBe(2);
  await page.reload();
  await expect(card(page, "Persist me")).toBeVisible();
  await expect(
    page.getByRole("checkbox", {
      name: "Mark Plan the week incomplete",
      exact: true,
    }),
  ).toBeChecked();
  await expect(page.getByRole("article")).toHaveCount(2);
});

for (const [name, raw] of [
  ["malformed JSON", "{broken"],
  ["non-array", "{}"],
  ["invalid date", JSON.stringify([task({ dueDate: "2025-02-29" })])],
  [
    "invalid record",
    JSON.stringify([task(), { id: "bad", title: "Incomplete" }]),
  ],
  ["duplicate IDs", JSON.stringify([task(), task({ title: "Duplicate" })])],
]) {
  test(`${name} storage warns without overwriting until the user adds a task`, async ({
    page,
  }) => {
    await seed(page, raw);
    await page.goto("/");
    await expect(page.getByRole("alert")).toContainText(
      "Saved tasks could not be loaded.",
    );
    await expect(page.getByRole("article")).toHaveCount(0);
    expect(
      await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
    ).toBe(raw);
    await page.reload();
    await expect(page.getByRole("alert")).toContainText(
      "Saved tasks could not be loaded.",
    );
    await addTask(page, { title: "Recovered" });
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect
      .poll(() => savedTasks(page))
      .toEqual([expect.objectContaining({ title: "Recovered" })]);
    await page.reload();
    await expect(card(page, "Recovered")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("unavailable storage warns but allows in-memory work and retry after recovery", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Access denied", "SecurityError");
      },
    });
    window.restoreTaskflowStorage = () =>
      Object.defineProperty(window, "localStorage", descriptor);
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Saved tasks could not be loaded.",
  );
  await addTask(page, { title: "In memory" });
  await expect(page.getByRole("alert")).toContainText(
    "Your latest changes are only in memory",
  );
  await page
    .getByRole("checkbox", { name: "Mark In memory complete", exact: true })
    .check();
  await expectCounts(page, { total: 1, active: 0, completed: 1, overdue: 0 });
  await page
    .getByRole("button", { name: "Try saving again", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("only in memory");
  await page.evaluate(() => window.restoreTaskflowStorage());
  await page
    .getByRole("button", { name: "Try saving again", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await savedTasks(page)).toEqual([
    expect.objectContaining({ title: "In memory", completed: true }),
  ]);
});

test("save quota failure preserves loaded data and latest in-memory changes until retry succeeds", async ({
  page,
}) => {
  await seed(page, [task()]);
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    window.taskflowFailWrites = true;
    Storage.prototype.setItem = function (key, value) {
      if (
        key === "taskflow.tasks.v1" &&
        window.taskflowFailWrites &&
        sessionStorage.getItem("taskflow-test-seeded")
      ) {
        throw new DOMException("Full", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    };
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await addTask(page, { title: "Unsaved change" });
  await expect(page.getByRole("alert")).toContainText("only in memory");
  expect(await savedTasks(page)).toEqual([task()]);
  await expect(card(page, "Unsaved change")).toBeVisible();
  await page.evaluate(() => {
    window.taskflowFailWrites = false;
  });
  await page
    .getByRole("button", { name: "Try saving again", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(card(page, "Unsaved change")).toBeVisible();
});

for (const width of [320, 375, 768, 1440]) {
  test(`long task content has no horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const title = "W".repeat(100);
    const description = "X".repeat(500);
    await page.goto("/");
    await addTask(page, {
      title,
      description,
      priority: "High",
      dueDate: "2000-02-29",
    });
    await expect(card(page, title)).toBeVisible();
    const noOverflow = async () => {
      expect(
        await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
          ),
        })),
      ).toEqual({ viewport: width, content: width });
      const bounds = await card(page, title).boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    };
    await noOverflow();
    await page
      .getByRole("button", { name: `Edit ${title}`, exact: true })
      .click();
    const edit = page.getByRole("dialog", { name: "Edit task", exact: true });
    await expect(titleField(edit)).toHaveValue(title);
    await noOverflow();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: `Delete ${title}`, exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Delete this task?", exact: true }),
    ).toBeVisible();
    await noOverflow();
  });
}

for (const [timezoneId, overdue] of [
  ["America/Los_Angeles", 0],
  ["UTC", 0],
  ["Pacific/Kiritimati", 1],
]) {
  test.describe(`local calendar dates in ${timezoneId}`, () => {
    test.use({ timezoneId });

    test("today and overdue use local date while due date labels retain the chosen day", async ({
      page,
    }) => {
      // The same instant is Jan 1 in Los Angeles/UTC and Jan 2 in Kiritimati.
      await page.clock.install({ time: new Date("2026-01-01T10:30:00Z") });
      await seed(page, [task({ dueDate: "2026-01-01" })]);
      await page.goto("/");
      await expectCounts(page, { total: 1, active: 1, completed: 0, overdue });
      await expect(card(page, "Plan the week").locator("time")).toHaveText(
        "Jan 1, 2026",
      );
      await expect(card(page, "Plan the week").locator("time")).toHaveAttribute(
        "datetime",
        "2026-01-01",
      );
      await addTask(page, { title: "Leap day", dueDate: "2024-02-29" });
      await expect(card(page, "Leap day").locator("time")).toHaveText(
        "Feb 29, 2024",
      );
      await page.reload();
      await expect(card(page, "Leap day").locator("time")).toHaveText(
        "Feb 29, 2024",
      );
    });

    test("overdue refreshes across local midnight without reloading", async ({
      page,
    }) => {
      const midnight = await page.evaluate(() =>
        new Date(2026, 0, 1, 23, 59, 50).toISOString(),
      );
      await page.clock.install({ time: new Date(midnight) });
      await seed(page, [task({ dueDate: "2026-01-01" })]);
      await page.goto("/");
      await expectCounts(page, {
        total: 1,
        active: 1,
        completed: 0,
        overdue: 0,
      });
      await page.clock.fastForward(31_000);
      await expectCounts(page, {
        total: 1,
        active: 1,
        completed: 0,
        overdue: 1,
      });
      await expect(
        card(page, "Plan the week").getByText("Overdue", { exact: true }),
      ).toBeVisible();
    });

    test("a western timezone can still be on the previous calendar day", async ({
      page,
    }) => {
      await page.clock.install({ time: new Date("2026-01-01T00:30:00Z") });
      await seed(page, [task({ dueDate: "2025-12-31" })]);
      await page.goto("/");
      await expectCounts(page, {
        total: 1,
        active: 1,
        completed: 0,
        overdue: timezoneId === "America/Los_Angeles" ? 0 : 1,
      });
      await expect(card(page, "Plan the week").locator("time")).toHaveText(
        "Dec 31, 2025",
      );
    });
  });
}
