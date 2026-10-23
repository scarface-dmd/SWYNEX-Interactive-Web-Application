# TaskFlow Submission Verification

Date: October 23, 2026. Project: SWYNEX Frontend Internship Task 2.

## Evidence And Method

- Confirmed that `http://127.0.0.1:5173` returned HTTP 200 and the TaskFlow page before browser automation.
- Reviewed the existing source, both original test files, and the previous Playwright result (`status: passed`, no failed tests).
- Reused the previously executed **18 passing utility tests** because `src/lib/taskUtils.js` and `tests/taskUtils.test.js` were unchanged. These were not rerun during this submission-preparation pass.
- Reused the original browser scenarios rather than duplicating them. After changing application code, reran all **31 original Chromium tests** plus **10 targeted checks** in `tests/submission.spec.js`: **41 passed** in the final run.
- Used fresh Playwright browser contexts. No persistent profile, normal-browser storage, accounts, or real user tasks were accessed.

## Verified Behavior

| Area                                               | Evidence                                                                                                                                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty/whitespace titles, lengths, preserved drafts | Original browser validation and edit-validation tests passed. Captured and viewed the inline-error screenshot.                                                                                                  |
| Add and edit/save                                  | Original browser tests passed. The recording script also added a task and saved an edited title through the actual UI.                                                                                          |
| Edit cancellation                                  | Cancel, close button, and Escape tests passed; original task and trigger focus preserved.                                                                                                                       |
| Completion and all counts                          | Toggle, progress, overdue, and reload tests passed. The demo asserted 5 total, 3 active, 2 completed, and 1 overdue task.                                                                                       |
| Overdue exclusions                                 | Existing utility/timezone tests and final browser tests exclude completed tasks and tasks due today. The demo includes an active task due today and a completed past-due task without increasing overdue count. |
| Delete confirmation                                | Keep task, close, Escape, confirm deletion, persistence, and fallback focus tests passed.                                                                                                                       |
| Combined filters                                   | Search matches title/description and intersects status/priority; global counts remain unchanged.                                                                                                                |
| Sidebar consistency                                | New test switched sidebar views and status tabs in both directions while retaining search/priority and verifying matching rows.                                                                                 |
| Empty/no-results states                            | Original empty/no-match tests passed. New test activated the empty-state action; clear-results focus regression passed.                                                                                         |
| Saved tasks and storage failures                   | Original reload, malformed JSON, invalid shape/date, duplicate ID, unavailable storage, quota, and retry tests passed.                                                                                          |
| Keyboard controls                                  | Tab/Shift+Tab modal bounds, Escape, initial/return focus, removed-trigger fallback, filtered completion, clear-filters, storage retry, skip link, and empty-state action checks passed.                         |
| Date entry                                         | New create/edit tests reject partial native date entries, preserve the draft, and allow correction and successful saving.                                                                                       |
| Accessibility                                      | Original axe-core WCAG A/AA scans passed in dashboard, dialogs, and mobile states. Repeated-action tests verify a fresh live-region DOM update.                                                                 |
| Layout                                             | Original long-content checks passed at 320, 375, 768, and 1440px. Capture script additionally checked 390px and bounded/scrollable dialogs, including a 320 x 568 viewport.                                     |
| Browser errors                                     | No unexpected console or runtime errors observed during the supplemental tests or the recorded workflow.                                                                                                        |
| Production output                                  | Final `npm run build` succeeded after all application fixes. Generated `dist/` is ignored.                                                                                                                      |

## Bugs Reproduced And Fixed

1. Completing/reopening a focused task under Active/Completed removed its checkbox and lost keyboard position. Focus now moves to the task-list heading before removal.
2. Clearing a no-results view removed the focused clear button. Focus now moves to the search field.
3. Successful storage retry removed its focused warning button. Focus now moves to the task-list heading.
4. Repeated edits/actions reused identical live-region content. Announcements now identify the affected task, and each event replaces a keyed message node even when the text repeats.
5. Native date inputs exposed partial entries as an empty value with `badInput`; the form silently accepted that as an absent optional date. The shared form now checks native `badInput` and displays an inline error. Complete omission and past dates remain allowed.
6. The skip link scrolled to main content but left focus on the body. The main region now has `tabIndex={-1}`, so skip/brand navigation can focus it without adding it to the normal tab order.

The initial focus-regression run had four failing cases, confirming the first three problems (both status views were checked separately). After fixes, all targeted regressions and the full final browser suite passed. The partial-date and skip-link issues were also reproduced in isolated browser probes before their fixes.

## Submission Assets

- `docs/screenshots/desktop.png`: populated dashboard, all three priorities, due-today, overdue, and completed tasks.
- `docs/screenshots/mobile.png`: full-page populated mobile dashboard and create form.
- `docs/screenshots/edit-dialog.png`: viewport capture with the edit modal and its backdrop.
- `docs/screenshots/validation-errors.png`: whitespace title rejected while description is retained.
- `docs/demo/taskflow-demo.webm`: silent 18.08-second recording at 1440 x 1100, including add -> edit -> complete -> combined filters -> refresh persistence, followed by validation/responsive checks.

All four actual saved images were opened and visually inspected. The video was loaded in Chromium, decoded, sought to a frame, played successfully, and a frame was opened for inspection. All demo content is fictional. The capture script fixes its isolated demo clock to October 23, 2026 for reproducible due-date examples; application time handling remains dynamic.

Regenerate assets with `npm run demo:record` while the existing development server is running on port 5173. The script does not launch or stop that server.

## Repository Safety

The inherited Git root originally pointed outside the project. Initialized a separate local `.git` directory inside `SWYNEX-Interactive-Web-Application` and verified the Git root is now the project folder. No parent-repository files were changed or staged. At the end of this pre-publication verification pass, no commits or remotes had been created.

The ignore rules exclude dependencies, builds, test output, environment/secrets files, common private-key formats, and local configuration. Intended `docs/` images and the demo recording are not ignored. At the time of this verification pass, publication to GitHub, LinkedIn, or SWYNEX had not occurred. This document records testing before the separately authorized GitHub publication step.

Final `git status --short --untracked-files=all` listed only intended project source, tests, configuration, documentation, and demo assets. `git check-ignore -v` confirmed the dependency/build/test/environment/local-config/private-key exclusions and did not exclude the intended images or video. `git remote -v` was empty. A targeted text scan found no private-key headers or matching GitHub/API-token/password-assignment patterns in the reviewed source and metadata; this is not a comprehensive secret audit. The development page and all five saved media assets returned HTTP 200 in the final availability check.

## Limits And Readiness

The project is ready for a reviewed initial Git commit and subsequent explicitly authorized GitHub publication. There is no known blocking application defect from this verification. Browser coverage is Chromium only, with simulated mobile viewports rather than physical phones. Firefox, Safari, on-screen mobile keyboards, and actual screen-reader announcement delivery were not tested. Automated accessibility scans are not full accessibility certification.

Storage remains browser/origin-specific, with no account, backend, cross-device sync, or live synchronization between tabs. Those intentional limitations are documented in the README.
