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

- Real Firebase Spark project creation, actual Google sign-in provider, production Firestore/Hosting deployment.
- Desktop + physical Android using the deployed URL, installation/standalone opening, offline restart/reconnect on that device.
- Actual project quotas and billing state after creation; current proposal uses Spark, no billing, provider subdomain.

These are explicit remaining gates. The full goal is not complete. Deployment is currently blocked by missing Firebase CLI authentication/project configuration, not by a passing emulator test being treated as production evidence.
