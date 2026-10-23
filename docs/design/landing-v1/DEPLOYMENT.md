# Phát hành website weekdam

Đã deploy ngày 11/10/2026, Asia/Saigon, lên Firebase project `weekdam-hieu-2026`. Kiểm tra website public hoàn tất khoảng 08:42.

| Trang     | URL                                     |
| --------- | --------------------------------------- |
| Landing   | https://weekdam-hieu-2026.web.app/      |
| Hướng dẫn | https://weekdam-hieu-2026.web.app/guide |
| Kế hoạch  | https://weekdam-hieu-2026.web.app/app   |

## Phát hành

`npm run deploy -- --project weekdam-hieu-2026 --non-interactive` kết thúc với exit 0. Script xác nhận cấu hình frontend khớp Firebase project và không phải Emulator, build lại TypeScript/Vite/PWA, rồi phát hành Hosting, Firestore rules và indexes. Firebase xác nhận release complete; Hosting có 38 file, service worker precache 37 entry. Quy tắc giờ mới vẫn cho phép record cũ không có giờ.

## Kiểm tra trước phát hành

- 52/52 unit test, 5/5 Firestore rules test và 9/9 kiểm thử đồng bộ Emulator đạt trong lần deploy này. Kiểm thử đồng bộ bao gồm khung giờ trên hai thiết bị, sửa offline/tải lại/xóa giờ và luồng Guest sau authentication redirect.
- Bản nguồn đã có 90 E2E đạt, 10 skip theo cấu hình thiết bị, cùng kiểm tra giao diện và Lighthouse ghi trong [VALIDATION.md](VALIDATION.md).

## Kiểm tra website public

- [release-assets.json](production/release-assets.json): cả ba đường dẫn trả HTTP 200, SHA-256 shell HTML khớp bản build; 9 asset/manifest/service worker/robots khớp nội dung cục bộ. Manifest `id: /`, `start_url: /app`; build không chứa auth fixture Emulator.
- 28/28 Playwright test desktop/mobile trên tên miền public đạt: CTA, preview bảng/lịch, hoàn thành việc mẫu, tìm kiếm, Việt/Anh, accessibility, reduced motion, back/history, fragment/reload/mở tab mới và bảo toàn kế hoạch khi chuyển trang.
- [production-smoke.json](production/production-smoke.json): Guest CRUD/persistence, PWA offline/restart/reconnect, thứ tự thẻ, bố cục mobile, manifest, Firebase auth handler, unauthenticated Firestore read bị từ chối và Google OAuth popup đến Google Accounts đều đạt.
- [calendar-production.json](production/calendar-production.json): desktop/mobile tạo và sửa lịch từ 09:00–10:00 thành 10:15–11:45, tải lại vẫn giữ giờ và chế độ lịch, editor mobile nằm trong viewport, không có page error. Kiểm tra dùng Guest trong browser context tạm, không ghi dữ liệu cloud.

Ảnh bằng chứng nằm trong `production/`. Google popup được kiểm tra tới màn hình đăng nhập, không nhập credentials; đồng bộ authenticated giữa thiết bị được kiểm tra bằng Emulator. Các viewport mobile được mô phỏng trong Chrome.
