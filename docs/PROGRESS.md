# Tiến độ weekdam

## Bản kính mờ — 10/10/2026

Mockup đã được Hieu duyệt trước khi triển khai. Đã deploy toàn bộ giao diện, kéo thân thẻ, thứ tự ngày độc lập và đồng bộ tại URL hiện tại. 41 unit + 37 E2E + 4 rules + 8 sync = 90 PASS; 7 E2E skip theo thiết bị. Axe planner/editor/Stats/Weeks sáng/tối không có violations. 36 ảnh frontend ở 1440/1366/390/320, vi/en, light/dark không tràn page/toolbar, fonts tải đủ; có kiểm tra font offline, reduced motion và mô phỏng fallback đặc. Lighthouse mobile production 96 performance,100 accessibility,100 best practices. Production smoke gồm thứ tự offline và popup Google PASS. API xác nhận billing vẫn tắt và database freeTier true. [Bằng chứng chi tiết](design/glass-v1/IMPLEMENTATION.md).

Còn nghiệm thu bản mới trên Android thật: kéo thẻ, đổi thứ tự offline, đóng/mở lại và reconnect để desktop nhận đúng thứ tự. Xác nhận Android ngày 09/10 bên dưới chỉ áp dụng phiên bản cũ; không được dùng để đóng gate mới.

## Bản đầu tiên — lịch sử nghiệm thu

Yêu cầu tiếp tục các phase không ngắt quãng được áp dụng ngày 09/10/2026: dùng các mặc định Q1–Q9 và U3 trong checkpoint, không chờ trả lời riêng từng câu. Tài liệu Phase 0 giữ tính lịch sử của khảo sát, không được dùng để ngăn triển khai sau chỉ thị mới này.

| Phase          | Trạng thái hiện tại | Bằng chứng / còn lại                                                                                                                                                |
| -------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — nghiên cứu | Hoàn tất            | Commit `5c3758e`, 106 ảnh; verifier research                                                                                                                        |
| 1 — shell      | Hoàn tất            | Responsive, vi/en, light/dark/system, icon riêng, manifest/SW; E2E offline reload và nhớ preferences. Hieu đã xác nhận cài PWA Android và offline/reconnect         |
| 2 — local core | Hoàn tất            | CRUD, trọng số, ngày/tuần Saigon, undo, IndexedDB; 15 unit tests và E2E CRUD                                                                                        |
| 3 — tương tác  | Hoàn tất            | Mouse/touch/keyboard sensors, mobile day-tab drop/menu move; copy/paste/carry/move, giữ thứ tự editor; Hieu đã test app trên Android thật                           |
| 4 — sync       | Hoàn tất            | 3 rules tests và 3 browser sync tests; Google provider production đã bật. Hieu xác nhận đồng bộ thực và offline/reconnect thành công                                |
| 5 — hoàn thiện | Hoàn tất            | End/reopen, Stats, history, guide, JSON import/export, focus/dialog, translations; Axe/Lighthouse và các ca biên đã kiểm tra                                        |
| 6 — deploy     | Hoàn tất            | URL HTTPS `weekdam-hieu-2026.web.app`, smoke production PASS; database free tier và billing chưa bật. Hieu xác nhận cài PWA Android và offline/reconnect thành công |

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
- Hủy Google popup: ca kiểm thử đã thất bại trước khi sửa (app báo nhầm lỗi sync), sau khi deploy bản sửa đã PASS. Hủy đăng nhập có thông báo riêng trong dialog, không báo sync error; popup bị chặn, lỗi mạng, domain/provider chưa cấu hình có hướng dẫn riêng bằng vi/en. `npm test` vẫn 15 PASS; production smoke gồm ca hồi quy này.

Hieu đã xác nhận “đã test và đồng bộ ok” và, khi được hỏi rõ tiêu chí Android, “Đã cài PWA và thử offline/reconnect thành công”. Google sign-in/sync production và Android thật được nghiệm thu theo xác nhận trực tiếp của người dùng, không dựa vào mobile emulation. Xem `docs/validation/ANDROID.md`.

Kiểm tra cuối ngày 09/10/2026: 44 tests PASS (15 unit + 23 E2E + 3 rules + 3 sync), 3 skip theo thiết bị có chủ đích. Unit tests trong sandbox gặp lỗi đọc cache SSR ở thư mục temp; chạy lại ngoài sandbox PASS, không cần sửa logic app. Kiểm tra API production cuối xác nhận `billingEnabled: false`, `freeTier: true`, database Standard tại Singapore. Toàn bộ Phase 0–6 đã nghiệm thu.

## Quyết định triển khai đã cụ thể hóa

- Week identity canonical theo ngày Thứ Hai khi sync, các entity con giữ ID.
- Cloud records phân tách theo entity; initial listener theo UID đọc dữ liệu lịch sử của tài khoản để có Stats/history đầy đủ, không polling. Đây là v1 cho một người; cần theo dõi reads khi lịch sử lớn, không khẳng định sync không giới hạn.
- Offline outbox lưu bền vững và dùng revision UUID; ACK cũ không xóa intent mới kể cả payload bằng nhau. Cloud writes chia batch tối đa 100 records.
- Undo dùng patch theo entity, tránh ghi đè những entity không liên quan; tối đa 20 bước trong phiên, không giữ lịch sử undo qua reload.
- Metadata tuần đang có được giữ khi merge backup; deadline không tự dịch. Unknown authenticated backend của Beaverplans không được dùng làm cơ sở khẳng định hành vi cloud.
- Firebase CLI thực tế dùng device-code login trên môi trường này; người dùng hoàn tất trong terminal, không chia sẻ authorization code/token qua chat.
- `npm run deploy` có guard: từ chối config thiếu, project demo/Emulator hoặc CLI project không khớp config frontend. Production `.env` đã lấy từ Web app; `.firebaserc` chọn project thật và guard đã PASS.

## Production và nghiệm thu thực tế

Ngày 09/10/2026, thử lại `projects:addfirebase` đã thành công trên `weekdam-hieu-2026`. Web app ID `1:18370042360:web:cfad5a373f1f3446145e0d`; database `(default)` Standard/native ở `asia-southeast1`, `freeTier: true`. Cloud Billing API xác nhận `billingEnabled: false`. Hosting/rules/indexes đã deploy thành công.

Kiểm tra mới ngày 09/10/2026 xác nhận Authentication có subtype `FIREBASE_AUTH`; authorized domains gồm `localhost`, `weekdam-hieu-2026.firebaseapp.com`, `weekdam-hieu-2026.web.app`. Google provider đã bật và có client ID. Client `accounts:createAuthUri` trả HTTP 200, Google origin `https://accounts.google.com`, redirect URI `https://weekdam-hieu-2026.firebaseapp.com/__/auth/handler`; không lưu mã phiên/token trong báo cáo.

Playwright trên production đã xác nhận nút Đăng nhập Google mở popup và tới trang “Sign in - Google Accounts”; test tự động không nhập credentials. Báo cáo: `production-google-status.json`, `production-google-popup.json`; screenshot `production-google-popup.png`. Hieu sau đó xác nhận đồng bộ giữa thiết bị và cài PWA/offline restart/reconnect trên Android thật thành công ngày 09/10/2026. Giữ Spark; không có yêu cầu nâng billing.
