# Pomodoro UI verification

The latest Chrome headless run covers 1440×900, 390×844 and 320×844, with Vietnamese/English and light/dark themes. It produced 60 screenshots: free focus, a paused session with a long task name, the planner minibar, completed history and stopped history.

Every screenshot passed axe, horizontal-overflow checks and mobile navigation target checks. All mobile timer controls and minibars stay above the fixed navigation at the initial scroll position. The smallest navigation target measured 56px. Minibar captures wait for the board to render and check its real card footer widths.

The interaction checks import a task, select it through its exact accessible label, change focus duration, start/pause/stop with Enter, resume from the minibar and wait for a manual next phase. A completed one-minute session produces one completed session for today and the last seven days. An additional stopped half-minute adds focus time while both completed-session counts stay at one.

The clock is fixed to the test date of 11 October 2026, with the Asia/Ho_Chi_Minh timezone. The helper waits for asynchronous settings and runtime actions to appear in the UI before advancing its test clock.

## Changes verified

| Before | After | Why |
| --- | --- | --- |
| The wrapped task label included all option text, so exact label queries failed after import. | The select has an explicit translated accessible label. | Task selection remains identifiable after adding tasks. |
| Three summary values omitted completed sessions over seven days. | Four desktop columns and two mobile columns show duration and completion count for both ranges. | Both requested reporting windows are represented. |
| Paused controls at 390px ended below the mobile navigation. | The mobile dial is 250px, or 232px on narrow screens. | The controls fit above the navigation. |
| A completion/stop notice pushed controls below the navigation again. | The dial becomes 210px while a notice or error is present. | Completion feedback and timer controls remain usable together. |
| Planner captures sometimes showed the lazy-loading placeholder. | The helper waits for the day board. | Card and minibar layout checks use rendered content. |

## Evidence

- [Layout and accessibility metrics](qa-report.json): 60 screenshots, zero axe violations, zero horizontal overflows and zero timer controls covered by navigation.
- [Reduced-motion probe](reduced-motion-report.json): 320px, English, dark theme; keyboard start/pause works, the timer uses `aria-live="off"`, and dial/button transitions are `0s`.
- [Desktop focus](1440-light-en-long-task.png), [desktop dark minibar](1440-dark-en-minibar.png), [mobile focus](390-dark-en-long-task.png), [narrow minibar](320-light-en-minibar.png), [stopped history](390-dark-en-stopped-history.png).
- TypeScript and the separate Vite/PWA preview build exited successfully. The unit suite passed 105 tests across 12 files. The build retains the existing large Firebase chunk warning.

Storage durability, account isolation and cloud rules are verified by the separate unit, Firestore and sync suites. These UI captures use Chrome's mobile viewport emulation.

## Reproduce

Build the application and start its preview server, then run:

```powershell
$env:POMODORO_QA_URL = 'http://127.0.0.1:4173/app'
node tools/inspect-pomodoro.cjs
```

The helper writes the screenshots and `qa-report.json` into this directory and exits nonzero if an interaction, accessibility or layout assertion fails.
