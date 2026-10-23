# TaskFlow

TaskFlow is a personal task manager built for **SWYNEX Frontend Internship, Task 2**. It provides a responsive workspace for creating, organizing, and tracking tasks, with data stored locally in the browser. No account, backend, or API credentials are required.

## Requirements Mapping

| Requirement          | Implementation                                                                                                     | Source                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Reusable components  | Shared task form for creation and editing; task cards, list, filters, statistics, empty states, icons, and dialogs | `src/components/`                                                            |
| Form validation      | Required title, length limits, allowed priorities, valid optional calendar dates, and accessible inline errors     | `src/components/TaskForm.jsx`, `src/lib/taskUtils.js`                        |
| State management     | React `useReducer` for task changes; local state for filters, forms, dialogs, and feedback                         | `src/App.jsx`, `src/lib/taskUtils.js`                                        |
| Task organization    | Search, status and priority filters, completion toggles, overdue indicators, counts, and progress                  | `src/App.jsx`, `src/components/FilterBar.jsx`, `src/components/TaskCard.jsx` |
| Persistence          | Validated `localStorage` loading, saving, and visible recovery warnings                                            | `src/lib/taskUtils.js`, `src/App.jsx`                                        |
| Responsive interface | Plain CSS layouts and media queries for desktop, tablet, and mobile                                                | `src/styles.css`                                                             |
| Reviewable source    | React application source, public assets, package scripts, and Vite configuration                                   | `src/`, `public/`, `package.json`, `vite.config.js`                          |

## Implemented Features

- Create tasks with a title, optional description, priority, and optional due date. New tasks appear first.
- Edit tasks in a modal using the same form as task creation.
- Mark tasks complete or active again, and delete tasks after confirmation.
- Combine case-insensitive title/description search with All, Active, or Completed status and Low, Medium, or High priority filters.
- View total, active, completed, and overdue counts, plus completion progress. Dashboard counts describe all tasks, not only filtered results.
- Distinguish an empty workspace from a search/filter with no matches, with a clear-filters action for the latter.
- Retain saved tasks after reload when browser storage is available.
- Use labeled controls, visible keyboard focus, a skip link, live status announcements, inline error associations, and native modal dialogs with focus restoration and Escape dismissal.

## Stack And Requirements

- React 19 and React DOM, using JavaScript and JSX.
- Vite 7 with the official React plugin.
- Plain CSS, with no component library, CSS framework, routing library, or external state-management dependency.
- Node's built-in test runner for utility tests, Playwright for browser tests, and axe-core for automated accessibility checks. These are development tools, not runtime requirements.
- Inline SVG icons. CSS requests the DM Sans font from Google Fonts, with system-font fallbacks if it is unavailable.

Use **Node.js 22.12+** and npm for the complete development and testing toolchain. Use a modern browser with support for native `<dialog>` and `localStorage`.

## Run Locally

Run these commands from the project root:

```sh
npm install
npm run dev
```

The default development address is **http://127.0.0.1:5173**. If that port is taken, Vite may select another port. The URL printed in the terminal is authoritative.

No environment-variable configuration is required.

## Production Build

```sh
npm run build
npm run preview
```

The build writes static output to `dist/`. Preview serves that build locally, normally at `http://127.0.0.1:4173`; use the URL printed in the terminal. Preview is for checking the production build, not a production hosting service.

## Project Structure

```text
public/
  favicon.svg
src/
  components/
    AppHeader.jsx       Workspace navigation and status counts
    ConfirmDialog.jsx   Shared modal and delete confirmation
    EmptyState.jsx      Empty workspace and no-results feedback
    FilterBar.jsx       Search, status, and priority controls
    Icon.jsx            Shared inline SVG icons
    StatCard.jsx        Dashboard statistic display
    TaskCard.jsx        Task details and actions
    TaskForm.jsx        Shared create/edit form and errors
    TaskList.jsx        Task collection and empty-state selection
  lib/
    taskUtils.js        Reducer, validation, dates, filters, storage
  App.jsx               Application state and component composition
  main.jsx              React entry point
  styles.css            Shared styles and responsive layouts
index.html
package.json
package-lock.json
playwright.config.js
tests/
  taskUtils.test.js     Validation, state, dates, filters, and storage tests
  taskflow.spec.js      Browser workflows, accessibility, and responsive tests
  submission.spec.js    Submission regression checks and sidebar synchronization
scripts/
  capture-demo.mjs       Isolated source recording and screenshot capture
docs/
  verification.md        Actual verification results and limitations
  screenshots/           Fictional-task desktop, mobile, edit, validation images
  demo/                  Final edited MP4 demo
vite.config.js
.gitignore
README.md
```

## State, Dates, And Storage

`App.jsx` initializes tasks from storage and manages add, edit, toggle, and delete actions with `useReducer`. Filters, dialog selection, storage warnings, and announcements are separate UI state. Visible tasks, dashboard counts, and completion percentage are derived from the task list rather than maintained as duplicate state.

Due dates are calendar strings in `YYYY-MM-DD` format. Today's date is calculated in the browser's local timezone, and display dates are constructed at local noon to avoid UTC date shifts. An incomplete task is overdue only when its due date is before today; tasks due today and completed tasks are not overdue. Today refreshes periodically and on page focus/visibility changes.

Tasks are stored under `taskflow.tasks.v1` in `localStorage`. Loading validates the full saved list, including task fields and unique IDs. Malformed or unavailable storage produces an empty in-memory list and a visible warning rather than crashing. The initial load does not automatically overwrite damaged data; adding or otherwise saving tasks can replace it with the current list. A **Try saving again** action is available.

If storage is blocked or full, task changes remain usable in memory and a warning explains that reloading or closing the page can lose those changes.

### Limitations

- There is no account, server backup, cloud sync, or cross-device sync.
- Persistence belongs to one browser profile and origin. Different hosts, ports, or protocols have separate storage; `localhost` and `127.0.0.1` are not interchangeable for saved data.
- Tabs do not synchronize live. Each tab holds its own in-memory list, and the last successful write to storage wins, potentially replacing changes from another tab.
- Clearing site data removes saved tasks. Private browsing or browser policy can restrict persistence.
- Search and filter selections are not persisted. Deletion has no undo, and there is no import/export feature.

## Validation Behavior

- A title is required and cannot consist only of whitespace. Its maximum length is 100 characters.
- The optional description has a maximum length of 500 characters.
- Priority must be Low, Medium, or High; new tasks default to Medium.
- An optional due date must be a real calendar date. Past dates are permitted so overdue work can be tracked.
- Partially entered native date fields are rejected with an inline error rather than silently saved without a due date. Clear the field completely to leave the date optional.
- Invalid submission keeps all entered values, displays field errors, and focuses the first invalid field. Character counters show title and description length, including over-limit input.
- Length checks use the entered values before trimming. A successful save trims the title and description; successful creation clears the form and returns focus to the title. Editing preserves completion status.

## Automated Checks

The package scripts define these commands:

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

`npm test` runs `tests/taskUtils.test.js` using Node's built-in test runner. It checks validation, reducer operations, counts, combined filters, local dates, and storage recovery. `npm run test:e2e` runs both browser spec files in Chromium. The Playwright configuration starts the application server automatically, or reuses it when already running on port 5173. Browser tests cover task workflows, dialogs and keyboard focus, persistence, storage failures, mobile overflow, timezone boundaries, and axe-core WCAG A/AA scans. Automated accessibility scans are useful checks, not a guarantee of full accessibility compliance. Install Chromium with the command above before the first browser-test run.

## Verified Results

Verification completed on **October 23, 2026**:

| Check                       | Actual result                                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Utility tests               | 18 passed in the earlier run. Those results were reused because the utility source and utility tests were unchanged.                    |
| Final `npm run test:e2e`    | 41 Chromium tests passed: the original 31 plus 10 targeted submission/regression checks.                                                |
| Final `npm run build`       | Succeeded after the application fixes.                                                                                                  |
| `npm run demo:record`       | Succeeded with fictional tasks in isolated storage; checked the workflow, counts, layout bounds, and absence of console/runtime errors. |
| Final edited video playback | 34.96-second, 1440 x 1280 MP4 verified in Chromium: normal-speed samples and full playback to the end at 4x, with no media error.       |
| Visual inspection           | Opened and inspected all four saved screenshots, plus a frame from the saved video.                                                     |

The new checks cover focus after disappearing controls, sidebar/tab consistency, edit-filter fallback focus, repeated live-region updates, partial date entry, and skip-link/empty-state actions. Browser coverage is Chromium only; physical-device, Firefox, Safari, and screen-reader testing were not performed. See [the verification report](docs/verification.md) for scope and fixes.

## Screenshots And Demo

These captures contain only fictional community-workshop tasks. The capture context uses October 23, 2026 as its fixed demo date; this is not a hardcoded date in the app.

- [Populated desktop dashboard](docs/screenshots/desktop.png)
- [Populated mobile layout](docs/screenshots/mobile.png)
- [Edit dialog](docs/screenshots/edit-dialog.png)
- [Inline validation error with preserved input](docs/screenshots/validation-errors.png)
- [Final edited demo: add, edit, complete, filter, refresh](docs/demo/taskflow-demo-final.mp4)

The final edited MP4 is the submission video. To regenerate screenshots and an unedited source recording, leave the development server running at `http://127.0.0.1:5173` and run:

```sh
npm run demo:record
```

The script launches a fresh, nonpersistent Playwright context; it does not connect to your normal browser or change its saved tasks. It updates the intended screenshots under `docs/screenshots/` and saves a raw WebM source at `test-results/demo-source/taskflow-demo-source.webm`, which is ignored by Git. It does not regenerate or overwrite `docs/demo/taskflow-demo-final.mp4`; the final MP4 is a separately edited deliverable.

## Manual Checklist

- Add a task with each priority, with and without a description and due date; reload and check persistence.
- Submit a blank/whitespace title, a title over 100 characters, and a description over 500 characters. Check errors, focus, and retained input, then correct and save.
- Add a past-due task and a task due today. Check overdue counts, then complete and reopen the past-due task.
- Combine search, status, and priority filters. Check no-results feedback, clear filters, and confirm global statistics remain unchanged by filtering.
- Edit a task; cancel and confirm deletion on separate attempts. Check keyboard navigation, Escape dismissal, and focus restoration.
- Check narrow mobile and desktop layouts. Inspect storage warnings with malformed saved data or blocked storage, and verify the page remains usable.

## GitHub Source Handoff

Keep the complete application source, public assets, package metadata and lockfile, Vite and Playwright configurations, tests, and this README in the source handoff. The lockfile supports reproducible installs with `npm ci`.

The `.gitignore` excludes generated/dependency output such as `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, and `test-results/`, along with environment files, local editor/tool configuration, authentication artifacts, logs, and common private-key formats. Intended screenshots and the demo video under `docs/` remain included.

The Git repository is rooted inside `SWYNEX-Interactive-Web-Application`, so only this project folder is included, not the enclosing Desktop or user directory. The source handoff includes the reviewed application, tests, documentation, screenshots, and demo recording. Publishing source to GitHub does not deploy the application or submit the SWYNEX form. No deployment URL is claimed.
