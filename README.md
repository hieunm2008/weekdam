# weekdam

Weekly planner cá nhân cho desktop và Android, định hướng PWA local-first và đồng bộ miễn phí.

App đã deploy tại [weekdam-hieu-2026.web.app](https://weekdam-hieu-2026.web.app): kế hoạch tuần/ngày, project/task/subtask, độ khó 1/2/3, drag chuột/cảm ứng/bàn phím, copy/paste, end/carry/reopen, Stats, lịch sử, undo, JSON backup, vi/en, theme và PWA offline. Firestore rules/indexes đã deploy; database Standard ở Singapore có free tier và billing chưa bật. Google provider production đã bật; ngày 09/10/2026 Hieu xác nhận đồng bộ thực, cài PWA Android và offline/reconnect thành công. Xem `docs/validation/ACCEPTANCE.md` để phân biệt kiểm thử tự động với nghiệm thu từ người dùng.

## Chạy và kiểm thử

Bản giao diện kính mờ đã deploy ngày 10/10/2026: nền kem/than ấm, Inter cục bộ, rail với panel dự án, thẻ kéo bằng thân, thứ tự tự do qua project/task, animation và reduced motion. `Subtask.dayOrder` lưu/sync riêng thứ tự ngày; dữ liệu cũ, backup v1 và IndexedDB v2 tương thích. 96 kiểm thử đã đạt; Lighthouse mobile production 99/100/100. Nghiệm thu kéo/thả và thứ tự offline trên Android thật của bản mới còn chờ xác nhận. Xem [plan và bằng chứng giao diện](docs/design/glass-v1/IMPLEMENTATION.md).

Yêu cầu Node 24 LTS (hoặc phiên bản đáp ứng engines của dependencies), npm; Java 21+ cho Emulator.

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run test:rules
npm run test:sync
npm run build
npm run preview -- --port 4173
```

`npm run test:production` kiểm tra URL Hosting đã deploy: Guest CRUD/persistence, PWA offline/restart/reconnect, mobile layout, manifest/auth handler, Firestore chặn đọc chưa đăng nhập và Google OAuth popup đến trang Google Accounts. Dữ liệu thử chỉ lưu Guest trong browser context tạm; lệnh không nhập credentials, đăng nhập hay ghi dữ liệu cloud. Báo cáo nằm trong `docs/validation/production-smoke.json`.

E2E dùng Chrome đã cài qua Playwright. Rules/sync tests chỉ dùng `demo-weekdam`, không dùng project production. Nếu JDK nằm trong `.tools/jdk/`, wrapper tự tìm; nếu không, đặt `JAVA_HOME` và PATH cho Java 21+. Bản test sync có fixture đăng nhập bằng token Emulator; fixture không được build vào production.

## Bật đồng bộ và deploy

1. Trong thư mục dự án, đăng nhập Firebase CLI: `npm run firebase -- login`. Script dùng CLI từ package `firebase-tools` đã cài qua `npm ci`. Mật khẩu/mã xác thực nhập vào Google/terminal trực tiếp, không gửi vào chat.
2. Tạo Firebase project gói **Spark**, không liên kết billing; không cần Analytics, Functions hoặc Cloud Storage. Tạo Firestore Standard native database, đề xuất region `asia-southeast1`.
3. Tạo Web app; copy `.env.example` thành `.env`, điền 4 trường cấu hình web. Đây là cấu hình frontend công khai; không thêm service-account/private key. Production phải để `VITE_USE_FIREBASE_EMULATORS=false`.
4. Bật Google trong Authentication; thêm tên miền Hosting vào Authorized domains. Nếu dùng authDomain cùng miền `project-id.web.app`, Google OAuth client phải cho phép redirect URI `https://project-id.web.app/__/auth/handler`. Service worker không intercept đường dẫn `/__/`.
5. Chọn project: `npm run firebase -- use --add`, rồi chạy `npm run deploy`. Hosting public directory là `dist`; rules/indexes được deploy cùng app. Không deploy bản Emulator.

Firestore chỉ cho mỗi UID đọc/ghi `users/{uid}/records`. Mỗi week/project/task/subtask là một document, LWW theo document; không lưu cả tuần trong một document. Xóa bằng tombstone không giữ note/nội dung. IndexedDB giữ outbox theo project+UID với revision để retry không xóa nhầm thay đổi mới. First login tự upload Guest khi cloud trống; cloud có dữ liệu thì hỏi merge/cloud. Bản Guest vẫn giữ để sao lưu.

Spark có hạn mức; vượt quota có thể tạm dừng dịch vụ đồng bộ. Không tự nâng Blaze. Backup JSON tối đa 5 MB, version 1; import gộp theo ID, remap cây nếu cùng ID khác nội dung, giữ metadata của tuần đang có. Deadline được giữ ngày tuyệt đối khi copy/carry/move.

## Cài PWA trên Android

Mở URL HTTPS Hosting bằng Chrome, chọn Cài ứng dụng/Thêm vào màn hình chính. Mở online ít nhất một lần để cache app. Sau đó thử tạo/sửa việc offline, đóng/mở lại, kết nối mạng và kiểm tra desktop nhận thay đổi. Chỉ coi tiêu chí Android thật hoàn tất sau khi thực hiện trên thiết bị vật lý.

Xem [checklist nghiệm thu Android](docs/validation/ANDROID.md) để kiểm tra cài đặt, tương tác, sync/offline reconnect và cách ghi nhận kết quả.

- [Kết quả tính năng](docs/research/FEATURES.md)
- [Các quyết định cần duyệt](docs/research/OPEN_QUESTIONS.md)
- [Mô hình dữ liệu quan sát](docs/research/DATA_MODEL.md)
- [Đề xuất kỹ thuật và hạn mức](docs/DECISIONS.md)
- [Phương pháp và luồng đã khảo sát](docs/research/SESSION.md)
- [Danh mục ảnh bằng chứng](docs/research/screens/INDEX.md)

Chạy kiểm tra bộ research: `npm run check:research`. Xem [tiến độ và bằng chứng triển khai](docs/PROGRESS.md).

Screenshot và payload JSON trong thư mục research chỉ là bằng chứng Guest do phiên thử tạo. Không sử dụng thương hiệu, văn bản hướng dẫn, source hoặc assets của Beaverplans trong ứng dụng weekdam.
