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

## Not yet verified or performed

- Completed Google sign-in and authenticated sync on production.
- Desktop + physical Android using the deployed URL, installation/standalone opening, offline restart/reconnect on that device.
- Actual quota consumption under ongoing personal use.

## Production verified on 2026-10-09

- Firebase project `weekdam-hieu-2026` enabled; Web app created and `.env` configured with its public SDK configuration.
- Firestore `(default)` is STANDARD/FIRESTORE_NATIVE in `asia-southeast1`, with `freeTier: true`; Cloud Billing reports `billingEnabled: false`.
- `npm run deploy` completed production build, Hosting release and Firestore rules/indexes release.
- URL: https://weekdam-hieu-2026.web.app. Production smoke passed Guest CRUD/persistence, HTTPS PWA offline restart/edit/reconnect, mobile layout, manifest, reserved auth handler and unauthenticated Firestore denial, with no desktop page errors. Report: `production-smoke.json`.

- Google provider enabled with an OAuth client ID; public auth-flow endpoint returns HTTP 200 with Google Accounts origin and the expected Firebase auth handler redirect. The app's login button opens the Google Accounts sign-in page in a real browser popup. Reports: `production-google-status.json`, `production-google-popup.json`. No credentials entered; no completed sign-in claimed.
- Login cancellation regression: closing the real Google popup previously showed a sync failure; the failing UI test reproduced it before the fix. The deployed fix now shows a cancellation status inside Settings and no sync error. Current production smoke passes this check. Other sign-in failures have specific localized guidance; user credentials were not entered during these tests.

The full goal is not complete. Completed Google sign-in, authenticated sync and physical Android installation/offline/reconnect acceptance remain open. Emulator results and the OAuth popup smoke are not evidence of a completed authenticated production session.
