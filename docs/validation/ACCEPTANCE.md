# Acceptance evidence

## Software verified

- Local CRUD project/task/subtask; task checkbox, step checkbox; weighted units, separate per-day counts/units; persist/reload.
- Week starts Monday, planning timezone Asia/Ho_Chi_Minh, cross-year and UTC-boundary tests, Today/week navigation and remembered view.
- Project mouse reorder, task keyboard reorder, board keyboard Space/arrows/Space/Escape, mobile touch drop onto day tabs, alternative move-day menu.
- Copy/Paste selected projects, new IDs/reset progress/default merge, carry pending/end without carry, reopen, clear board and undo.
- JSON schema validation, Guest/account isolation, outbox revisions, first-login migration/reload, concurrent tasks across tabs, two-browser offline reload/reconnect.
- vi/en + light/dark/system, PWA manifest/icons/SW and offline shell; keyboard/focus/modal names, WCAG automation in both themes/viewports.
- Rules Emulator positive owner CRUD/tombstones, negative unauthenticated/cross-UID/invalid fields/client timestamps.

Commands: `npm test` (15), `npm run test:e2e` (23 pass/3 intentional skips), `npm run test:rules` (3), `npm run test:sync` (3). Production build succeeds. Lighthouse 98/100/100 for performance/accessibility/best practices. Research verifier remains separate.

## User acceptance on 2026-10-09

Hieu reported “đã test và đồng bộ ok”. In response to the explicit Android installation/offline restart/reconnect question, Hieu confirmed “Đã cài PWA và thử offline/reconnect thành công”. This closes the production cross-device sync and physical Android PWA/offline/reconnect gates based on direct user testing. See `ANDROID.md` for the recorded scope; no phone model, browser version or device screenshots were supplied.

Actual quota consumption under ongoing personal use remains an operational consideration, not an unfinished installation task. The project is on the verified free-tier setup with billing disabled.

## Production verified on 2026-10-09

- Firebase project `weekdam-hieu-2026` enabled; Web app created and `.env` configured with its public SDK configuration.
- Firestore `(default)` is STANDARD/FIRESTORE_NATIVE in `asia-southeast1`, with `freeTier: true`; Cloud Billing reports `billingEnabled: false`.
- `npm run deploy` completed production build, Hosting release and Firestore rules/indexes release.
- URL: https://weekdam-hieu-2026.web.app. Production smoke passed Guest CRUD/persistence, HTTPS PWA offline restart/edit/reconnect, mobile layout, manifest, reserved auth handler and unauthenticated Firestore denial, with no desktop page errors. Report: `production-smoke.json`.

- Google provider enabled with an OAuth client ID; public auth-flow endpoint returns HTTP 200 with Google Accounts origin and the expected Firebase auth handler redirect. The app's login button opens the Google Accounts sign-in page in a real browser popup. Reports: `production-google-status.json`, `production-google-popup.json`. No credentials entered; no completed sign-in claimed.
- Login cancellation regression: closing the real Google popup previously showed a sync failure; the failing UI test reproduced it before the fix. The deployed fix now shows a cancellation status inside Settings and no sync error. Current production smoke passes this check. Other sign-in failures have specific localized guidance; user credentials were not entered during these tests.

Authenticated production and physical Android acceptance are supported by the user's confirmations above. Emulator results and OAuth popup smoke provide separate software evidence and are not presented as physical-device evidence.

Final regression on 2026-10-09: 15 unit, 23 E2E, 3 rules and 3 sync tests passed (44 total); 3 E2E skips are intentional device-specific cases. An initial sandbox SSR-cache read failed; the same unit suite passed outside sandbox without code changes. Production APIs were rechecked: billing disabled and Standard database still on the free tier. Phases 0–6 and the user acceptance gates are complete.
