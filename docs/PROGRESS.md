# Tiến độ weekdam

Yêu cầu tiếp tục các phase không ngắt quãng được áp dụng ngày 09/10/2026: dùng các mặc định Q1–Q9 và U3 trong checkpoint, không chờ trả lời riêng từng câu. Tài liệu Phase 0 giữ tính lịch sử của khảo sát, không được dùng để ngăn triển khai sau chỉ thị mới này.

| Phase | Trạng thái hiện tại | Bằng chứng / còn lại |
|---|---|---|
| 0 — nghiên cứu | Hoàn tất | Commit `5c3758e`, 106 ảnh; verifier research |
| 1 — shell | Đã triển khai và kiểm tra phần mềm | Responsive, vi/en, light/dark/system, icon riêng, manifest/SW; E2E offline reload và nhớ preferences. Android vật lý còn mở |
| 2 — local core | Đã triển khai và kiểm tra | CRUD, trọng số, ngày/tuần Saigon, undo, IndexedDB; 15 unit tests và E2E CRUD |
| 3 — tương tác | Đã triển khai và kiểm tra phần mềm | Mouse/touch/keyboard sensors, mobile day-tab drop/menu move; copy/paste/carry/move, giữ thứ tự editor. Android vật lý còn mở |
| 4 — sync | Emulator đã kiểm chứng; backend production đã deploy | 3 rules tests và 3 browser sync tests: cross-device, offline reload/reconnect, sign-out isolation, Guest migration, concurrent tabs. Google provider đã bật; còn login/sync thật giữa thiết bị |
| 5 — hoàn thiện | Chức năng và QA phần mềm đã kiểm tra | End/reopen, Stats, history, guide, JSON import/export, focus/dialog, translations; Axe/Lighthouse và các ca biên đã kiểm tra |
| 6 — deploy | Hosting + Firestore đã deploy | URL HTTPS `weekdam-hieu-2026.web.app`, smoke production PASS; database free tier và billing chưa bật. Google OAuth popup tới Google Accounts; còn xác thực/sync thật và Android vật lý |

## Bằng chứng hiện có

- `npm test`: 15 tests PASS.
- `npm run test:e2e`: 23 PASS, 3 skip có chủ đích (keyboard/mouse ordering chỉ desktop, touch chỉ mobile).
- `npm run test:rules`: 3 PASS với Firestore Emulator thực.
- `npm run test:sync`: 3 PASS với Auth + Firestore Emulator: hai thiết bị (gồm mobile), Guest migration qua reload, multi-tab và hai task tạo đồng thời.
- Axe/WCAG: không có violations trong planner/editor, sáng/tối, desktop/mobile.
- Lighthouse production mobile: performance 98, accessibility 100, best practices 100. Xem `docs/validation/lighthouse.html`; không dùng category PWA deprecated.
- Production dependencies audit: 0 vulnerabilities sau override gRPC 1.14.6. Audit toàn bộ vẫn có 14 cảnh báo trong dev tooling; không dùng force downgrade Firebase/CLI. Reports nằm trong `docs/validation`.
- Ảnh app riêng trong `docs/validation/screens`, khác screenshot research của bản gốc.
- `npm run deploy`: build production, deploy Hosting/rules/indexes thành công ngày 09/10/2026.
- Smoke URL production: Guest CRUD/completion/persistence, PWA offline/restart/reconnect, mobile layout, manifest, Firebase auth handler và chặn Firestore read chưa đăng nhập đều PASS. Xem `docs/validation/production-smoke.json` và ảnh `production-desktop.png`, `production-mobile.png`.

Các kết quả trên chưa chứng minh Google sign-in/sync production hoặc cài/mở app trên Android vật lý. Goal toàn bộ app chưa hoàn tất.

## Quyết định triển khai đã cụ thể hóa

- Week identity canonical theo ngày Thứ Hai khi sync, các entity con giữ ID.
- Cloud records phân tách theo entity; initial listener theo UID đọc dữ liệu lịch sử của tài khoản để có Stats/history đầy đủ, không polling. Đây là v1 cho một người; cần theo dõi reads khi lịch sử lớn, không khẳng định sync không giới hạn.
- Offline outbox lưu bền vững và dùng revision UUID; ACK cũ không xóa intent mới kể cả payload bằng nhau. Cloud writes chia batch tối đa 100 records.
- Undo dùng patch theo entity, tránh ghi đè những entity không liên quan; tối đa 20 bước trong phiên, không giữ lịch sử undo qua reload.
- Metadata tuần đang có được giữ khi merge backup; deadline không tự dịch. Unknown authenticated backend của Beaverplans không được dùng làm cơ sở khẳng định hành vi cloud.
- Firebase CLI thực tế dùng device-code login trên môi trường này; người dùng hoàn tất trong terminal, không chia sẻ authorization code/token qua chat.
- `npm run deploy` có guard: từ chối config thiếu, project demo/Emulator hoặc CLI project không khớp config frontend. Production `.env` đã lấy từ Web app; `.firebaserc` chọn project thật và guard đã PASS.

## Prerequisite ngoài máy cần hoàn tất

Ngày 09/10/2026, thử lại `projects:addfirebase` đã thành công trên `weekdam-hieu-2026`. Web app ID `1:18370042360:web:cfad5a373f1f3446145e0d`; database `(default)` Standard/native ở `asia-southeast1`, `freeTier: true`. Cloud Billing API xác nhận `billingEnabled: false`. Hosting/rules/indexes đã deploy thành công.

Kiểm tra mới ngày 09/10/2026 xác nhận Authentication có subtype `FIREBASE_AUTH`; authorized domains gồm `localhost`, `weekdam-hieu-2026.firebaseapp.com`, `weekdam-hieu-2026.web.app`. Google provider đã bật và có client ID. Client `accounts:createAuthUri` trả HTTP 200, Google origin `https://accounts.google.com`, redirect URI `https://weekdam-hieu-2026.firebaseapp.com/__/auth/handler`; không lưu mã phiên/token trong báo cáo.

Playwright trên production đã xác nhận nút Đăng nhập Google mở popup và tới trang “Sign in - Google Accounts”. Chưa nhập credentials hoặc hoàn tất đăng nhập. Báo cáo: `production-google-status.json`, `production-google-popup.json`; screenshot `production-google-popup.png`. Đã yêu cầu Hieu đăng nhập cùng account trên desktop/Android và thử task sync/offline restart/reconnect; giữ Spark.

Android vật lý cần mở URL HTTPS/cài PWA và thực hiện offline/reconnect; các browser test hiện có chưa thay thế được bước đó.
