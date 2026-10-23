import assert from "node:assert/strict";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

// This context has its own storage; it never attaches to the user's browser.
const url = "http://127.0.0.1:5173";
const response = await fetch(url);
assert.equal(
  response.status,
  200,
  "Start the TaskFlow development server first.",
);
const output = (path) =>
  fileURLToPath(new URL(`../docs/${path}`, import.meta.url));
const sourceDirectory = fileURLToPath(
  new URL("../test-results/demo-source/", import.meta.url),
);
const fictionalTasks = [
  {
    id: "workshop",
    title: "Prepare the community workshop",
    description: "Gather sample materials and draft a friendly welcome.",
    priority: "High",
    dueDate: "2026-10-22",
    completed: false,
  },
  {
    id: "checklist",
    title: "Review the workshop checklist",
    description: "Confirm the room layout, supplies, and session timing.",
    priority: "Medium",
    dueDate: "2026-10-23",
    completed: false,
  },
  {
    id: "reading",
    title: "Sketch a cozy reading corner",
    description: "Explore a few simple layouts for the neighborhood library.",
    priority: "Low",
    dueDate: "2026-10-30",
    completed: false,
  },
  {
    id: "welcome",
    title: "Write the welcome notes",
    description: "A small introduction for our fictional community event.",
    priority: "Low",
    dueDate: "2026-10-21",
    completed: true,
  },
];

const browser = await chromium.launch({ slowMo: 120 });
const errors = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  locale: "en-US",
  timezoneId: "UTC",
  reducedMotion: "reduce",
  storageState: {
    cookies: [],
    origins: [
      {
        origin: url,
        localStorage: [
          { name: "taskflow.tasks.v1", value: JSON.stringify(fictionalTasks) },
        ],
      },
    ],
  },
  recordVideo: { dir: sourceDirectory, size: { width: 1440, height: 1100 } },
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const pause = () => page.waitForTimeout(650);
const screenshot = async (name) => {
  await page.evaluate(() => document.activeElement?.blur());
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: output(`screenshots/${name}.png`),
    fullPage: name !== "edit-dialog",
    animations: "disabled",
  });
};
const count = (label) =>
  page
    .getByRole("region", { name: "Task statistics" })
    .getByText(label, { exact: true })
    .locator("..")
    .locator("strong");

try {
  await page.clock.setFixedTime(new Date("2026-10-23T12:00:00Z"));
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("article")).toHaveCount(4);
  await expect(count("Overdue")).toHaveText("1");
  await pause();

  // Recorded sequence: add -> edit -> complete -> filter -> refresh persistence.
  await page.locator("#new-title").fill("Draft the workshop agenda");
  await page
    .locator("#new-description")
    .fill(
      "Plan a short introduction, a creative activity, and time to share ideas.",
    );
  await page.locator("#new-priority").selectOption("High");
  await page.locator("#new-dueDate").fill("2026-10-23");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(5);
  await pause();

  await page
    .getByRole("button", {
      name: "Edit Draft the workshop agenda",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", { name: "Edit task" });
  await dialog.locator("#edit-title").fill("Finalize the workshop agenda");
  await screenshot("edit-dialog");
  await pause();
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Finalize the workshop agenda",
      exact: true,
    }),
  ).toBeVisible();
  await pause();

  await page
    .getByRole("checkbox", {
      name: "Mark Finalize the workshop agenda complete",
      exact: true,
    })
    .check();
  await expect(count("Total tasks")).toHaveText("5");
  await expect(count("Active")).toHaveText("3");
  await expect(count("Completed")).toHaveText("2");
  await expect(count("Overdue")).toHaveText("1");
  await pause();

  const tabs = page.getByRole("group", { name: "Filter by status" });
  await tabs.getByRole("button", { name: "Completed", exact: true }).click();
  await page.getByLabel("Filter by priority").selectOption("High");
  await page.getByRole("searchbox").fill("agenda");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("navigation").getByRole("button", { name: /^Completed / }),
  ).toHaveAttribute("aria-pressed", "true");
  await pause();
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(5);
  await expect(
    page.getByRole("checkbox", {
      name: "Mark Finalize the workshop agenda incomplete",
      exact: true,
    }),
  ).toBeChecked();
  await expect(count("Overdue")).toHaveText("1");
  await pause();
  console.log(
    "PASS: recorded add, edit, complete, combined filters, and refresh persistence.",
  );

  await screenshot("desktop");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.locator("#new-title")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator("#new-title").fill("   ");
  await page
    .locator("#new-description")
    .fill("These details should remain when validation fails.");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Give your task a title.");
  await expect(page.locator("#new-description")).toHaveValue(
    "These details should remain when validation fails.",
  );
  await screenshot("validation-errors");
  await page.locator("#new-title").fill("");
  await page.locator("#new-description").fill("");

  // Check short viewports as well as narrow widths, including a scrollable dialog.
  for (const [width, height] of [
    [1440, 900],
    [768, 900],
    [390, 844],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    const size = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.equal(
      size.content,
      size.viewport,
      `Horizontal overflow at ${width}px`,
    );
    await page
      .getByRole("button", {
        name: "Edit Finalize the workshop agenda",
        exact: true,
      })
      .click();
    const bounds = await page.getByRole("dialog").boundingBox();
    assert.ok(
      bounds.x >= 0 && bounds.x + bounds.width <= width,
      "Dialog clipped horizontally",
    );
    assert.ok(
      bounds.y >= 0 && bounds.y + bounds.height <= height,
      "Dialog clipped vertically",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save changes" })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "Save changes" }),
    ).toBeInViewport();
    await page.keyboard.press("Escape");
    if (width === 390) await screenshot("mobile");
  }
  console.log(
    "PASS: desktop/tablet/mobile overflow and short-height dialog bounds/scrolling.",
  );
  assert.deepEqual(errors, [], "Unexpected browser console/runtime errors");
  console.log(
    "PASS: no browser console or runtime errors during the recorded workflow.",
  );
} finally {
  const video = page.video();
  await context.close();
  await video.saveAs(join(sourceDirectory, "taskflow-demo-source.webm"));
  await video.delete();
  await browser.close();
}

console.log(
  "Saved docs/screenshots/{desktop,mobile,edit-dialog,validation-errors}.png",
);
console.log(
  "Saved raw source: test-results/demo-source/taskflow-demo-source.webm",
);
console.log("Preserved final edited video: docs/demo/taskflow-demo-final.mp4");
