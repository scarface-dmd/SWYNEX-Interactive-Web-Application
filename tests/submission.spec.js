import { test, expect } from "@playwright/test";

const task = {
  id: "workshop",
  title: "Plan a fictional workshop",
  description: "Prepare sample materials.",
  priority: "High",
  dueDate: "2000-01-01",
  completed: false,
};

async function seed(page, tasks = [task]) {
  await page.goto("/");
  await page.evaluate(
    (tasks) => localStorage.setItem("taskflow.tasks.v1", JSON.stringify(tasks)),
    tasks,
  );
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  // Attach a per-test collector without accessing a persistent browser profile.
  page.submissionErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.submissionErrors, "Unexpected browser errors").toEqual([]);
});

test("skip and brand links focus main content; the empty-state action focuses the task form", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByRole("button", { name: "Create your first task" }).click();
  await expect(page.locator("#new-title")).toBeFocused();
  await page.getByRole("link", { name: "TaskFlow .", exact: true }).click();
  await expect(page.getByRole("main")).toBeFocused();
});

for (const status of ["Active", "Completed"]) {
  test(`keyboard completion in ${status} view keeps focus after the task leaves`, async ({
    page,
  }) => {
    await seed(page, [{ ...task, completed: status === "Completed" }]);
    await page
      .getByRole("group", { name: "Filter by status" })
      .getByRole("button", { name: status, exact: true })
      .click();
    const checkbox = page.getByRole("checkbox");
    await checkbox.focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.locator("#task-list-heading")).toBeFocused();
  });
}

test("clearing a no-results view sends keyboard focus to search", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("searchbox").fill("no such fictional task");
  await page.getByRole("button", { name: "Clear search & filters" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("searchbox")).toBeFocused();
});

test("successful storage retry moves focus out of the removed warning", async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreWrites = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("alert")).toContainText("only in memory");
  await page.evaluate(() => window.restoreWrites());
  await page.getByRole("button", { name: "Try saving again" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator("#task-list-heading")).toBeFocused();
});

test("sidebar and status tabs stay synchronized without resetting search or priority", async ({
  page,
}) => {
  await seed(page, [task, { ...task, id: "finished", completed: true }]);
  const tabs = page.getByRole("group", { name: "Filter by status" });
  const nav = page.getByRole("navigation", { name: "Task views" });
  await page.getByRole("searchbox").fill("materials");
  await page.getByLabel("Filter by priority").selectOption("High");
  for (const [status, label] of [
    ["Completed", "Completed"],
    ["Active", "Active tasks"],
    ["All", "All tasks"],
  ]) {
    await nav.getByRole("button", { name: new RegExp(`^${label} `) }).click();
    await expect(
      tabs.getByRole("button", { name: status, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("article")).toHaveCount(
      status === "All" ? 2 : 1,
    );
  }
  await tabs.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(
    nav.getByRole("button", { name: /^Completed / }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("searchbox")).toHaveValue("materials");
  await expect(page.getByLabel("Filter by priority")).toHaveValue("High");
});

test("editing a task out of the current filter restores focus to the list heading", async ({
  page,
}) => {
  await seed(page);
  await page.getByLabel("Filter by priority").selectOption("High");
  await page
    .getByRole("button", { name: `Edit ${task.title}`, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Priority", { exact: true }).selectOption("Low");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.locator("#task-list-heading")).toBeFocused();
});

test("repeated saves create fresh live-region updates even with the same title", async ({
  page,
}) => {
  await seed(page);
  for (const description of ["First change", "Second change"]) {
    await page
      .getByRole("button", { name: `Edit ${task.title}`, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Description (optional)", { exact: true })
      .fill(description);
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText(
      `Saved changes: ${task.title}.`,
    );
    if (description === "First change") {
      await page.evaluate(() => {
        window.previousAnnouncement = document.querySelector(
          '[role="status"] span',
        );
      });
    }
  }
  expect(
    await page.evaluate(
      () =>
        window.previousAnnouncement !==
        document.querySelector('[role="status"] span'),
    ),
  ).toBe(true);
});

for (const mode of ["create", "edit"]) {
  test(`partial date entry is rejected rather than silently discarded during ${mode}`, async ({
    page,
  }) => {
    await seed(page, mode === "edit" ? [task] : []);
    if (mode === "edit")
      await page
        .getByRole("button", { name: `Edit ${task.title}`, exact: true })
        .click();
    const scope =
      mode === "edit"
        ? page.getByRole("dialog")
        : page.getByRole("complementary", { name: "Create and track tasks" });
    await scope
      .getByLabel("Task title *", { exact: true })
      .fill("A fictional date-entry task");
    const due = scope.getByLabel("Due date (optional)", { exact: true });
    await due.fill("");
    await due.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.type("10");
    expect(await due.evaluate((input) => input.validity.badInput)).toBe(true);
    await scope
      .getByRole("button", {
        name: mode === "edit" ? "Save changes" : "Add task",
        exact: true,
      })
      .click();
    await expect(scope.getByRole("alert")).toHaveText(
      "Enter a complete calendar date, or clear the date field.",
    );
    await expect(due).toBeFocused();
    await expect(page.getByRole("article")).toHaveCount(
      mode === "edit" ? 1 : 0,
    );
    await due.fill("2026-10-23");
    await scope
      .getByRole("button", {
        name: mode === "edit" ? "Save changes" : "Add task",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "A fictional date-entry task",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("article").locator("time")).toHaveAttribute(
      "datetime",
      "2026-10-23",
    );
  });
}
