# weekdam — quyết định kỹ thuật

Ngày kiểm tra nguồn: 09/10/2026. Các mặc định Q1–Q9 và U3 được áp dụng theo chỉ thị tiếp tục toàn bộ phase không ngắt quãng. Trạng thái và bằng chứng tại [PROGRESS.md](PROGRESS.md); tài liệu Phase 0 trong `docs/research/` giữ lại kết quả khảo sát lịch sử.

## Stack giữ từ yêu cầu

Đã triển khai Vite + React + TypeScript; Tailwind/CSS variables; dnd-kit cho chuột/cảm ứng/bàn phím; i18next vi/en; vite-plugin-pwa/Workbox; date-fns; Vitest, Playwright, Firebase Emulator cho rules/sync. Dependencies và scripts nằm trong `package.json`, phiên bản khóa trong `package-lock.json`.

## Chi phí $0

Đã chọn **Firebase Hosting**, Auth Google và Firestore Standard trên **Spark**, không liên kết billing. Hosting tại [weekdam-hieu-2026.web.app](https://weekdam-hieu-2026.web.app). Nguồn [Firebase Pricing](https://firebase.google.com/pricing), kiểm tra lại 09/10/2026:

| Sản phẩm | Spark / hạn mức miễn phí |
|---|---|
| Auth social sign-in | Có trên Spark; không cần SMS/phone auth |
| Firestore Standard | 1 GiB lưu trữ; 50.000 reads/ngày; 20.000 writes/ngày; 20.000 deletes/ngày; 10 GiB egress/tháng |
| Firebase Hosting | 10 GB storage; 360 MB transfer/ngày; SSL |

Đây là đánh giá khả thi cho một người, không phải cam kết dịch vụ không giới hạn. Khi vượt quota, Spark có thể chặn sản phẩm theo chu kỳ quota thay vì tính phí; offline vẫn cần giữ thay đổi và báo lỗi đồng bộ. Không tự nâng Blaze. Không cần Functions, Cloud Storage, App Hosting hoặc billing-linked trial. Linking billing tự đổi plan sang Blaze; budget alert không phải trần tiền. [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)

Project `weekdam-hieu-2026` đã bật Firebase; Web app ID `1:18370042360:web:cfad5a373f1f3446145e0d`. Database `(default)` Standard/native tại `asia-southeast1` được API xác nhận `freeTier: true`; Cloud Billing xác nhận `billingEnabled: false`. Hosting/rules/indexes đã deploy. Google provider đã bật; Hieu xác nhận sync production và PWA Android offline/reconnect thành công ngày 09/10/2026.

## Local-first và sync đã triển khai

- Guest dùng IndexedDB namespace riêng; không cần Auth. `storage.ts` giữ plan/outbox/meta, `usePlanner.ts` áp dụng local mutations và persist ngay cả offline.
- Đăng nhập Google mới bật sync. Dữ liệu account nằm dưới `users/{uid}/...`; rules kiểm `request.auth.uid == uid` cùng schema/ownership. Emulator phải chứng minh không đăng nhập và user khác không đọc/ghi được. Không đặt dữ liệu Guest vào collection cloud public.
- Firestore web dùng `persistentLocalCache` + `persistentMultipleTabManager`, APIs hiện hành trong [tài liệu offline chính thức](https://firebase.google.com/docs/firestore/manage-data/enable-offline). Nếu persistence không khả dụng phải giữ local repository và báo sync hạn chế, không tuyên bố dữ liệu đã bền vững.
- Mỗi week/project/task/subtask là một document `users/{uid}/records/{id}`. Fields gồm `id`, `kind`, `parent`, `order`, `deleted`, `value`, `updatedAt`; thứ tự nằm trên document con. Week ID canonical `week_YYYY-MM-DD`, thực thể con giữ ID. `updatedAt` dùng server timestamp. Last-write-wins theo document: hai chỉnh sửa cùng thực thể có thể ghi đè nhau; chỉnh sửa thực thể khác được merge độc lập.
- Xóa bằng tombstone chỉ giữ `value: {id}` cùng metadata. Undo tối đa 20 thao tác trong phiên, patch theo thực thể; không giữ lịch sử undo qua reload. Outbox phân tách project+UID, revision UUID ngăn ACK cũ xóa intent mới; cloud writes chia batch tối đa 100 records.
- First-login merge theo Q8: cloud trống upload; cloud có dữ liệu cho chọn merge/cloud. Giữ IDs để import có thể retry; bảo toàn local backup, không gộp theo tên hoặc ghi đè cloud ngầm. Cache Guest/account tách theo UID; đăng xuất không để Guest hiển thị dữ liệu account khác.
- UI phân biệt local saved, offline, pending sync, synced và sync error. Synced dựa server snapshot và pending writes; network online không đủ. Listener đọc records của UID, gồm lịch sử để tính Stats; không polling. Đây là lựa chọn v1 cho một người, initial reads tăng cùng lịch sử nên cần theo dõi quota khi dữ liệu lớn.
- `.env.example` và `.env` cho cấu hình frontend; không commit `.env`, private key/service account hoặc token. Không đưa admin credential vào bundle. Thiết kế bảo vệ dữ liệu dựa rules, không dựa việc giấu cấu hình frontend.

Backup JSON version 1, tối đa 5 MB; import gộp theo ID, ID trùng khác nội dung tạo ID mới/remap cây. Metadata tuần đang có được giữ. Deadline giữ ngày tuyệt đối khi copy/carry/move. Đây là quyết định của weekdam, không suy ra từ cloud của Beaverplans.

## Lịch, PWA và kiểm thử

Tuần bắt đầu Thứ Hai; timezone kế hoạch cố định Asia/Ho_Chi_Minh, ngày lịch YYYY-MM-DD và UTC cho sync timestamp. Theme/ngôn ngữ/tuần đang xem lưu trên thiết bị, không đồng bộ preferences.

“Lighthouse PWA đạt” cần thay bằng tiêu chí cụ thể vì PWA testing của Lighthouse đã deprecated. [Chrome Developers](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest)

- Phase 1: manifest/icons/start URL, service worker và shell load/reload offline sau lần tải online; kiểm tra installability ở Chrome.
- Phase 4: hai browser contexts/accounts test cùng UID, offline edits/reconnect, concurrent edit LWW, cache account isolation, rules emulator.
- Phase 6: HTTPS production, cài PWA vào Android thật, mở standalone, đóng/mở lại khi offline, dữ liệu còn và reconnect đồng bộ sang desktop. Mô phỏng mobile không thay thế bước này.
- Lighthouse dùng performance/accessibility/best practices để phát hiện vấn đề, không đặt điểm PWA deprecated làm acceptance gate.

Không sử dụng logo/mascot/icon/font asset, marketing text hoặc code của bản gốc. Các screenshot nghiên cứu không được import vào bundle app.

## Nghiệm thu

Authentication có subtype `FIREBASE_AUTH`, hai miền Hosting đã được cho phép và Google provider đã bật. Guest migration/account isolation đã kiểm thử với Emulator; Hieu xác nhận đồng bộ thực và cài PWA/offline restart/reconnect trên Android thật. [Checklist Android](validation/ANDROID.md) ghi phạm vi xác nhận và hướng dẫn thử lại; không coi mobile emulation là bằng chứng thiết bị thật. Mặc định sản phẩm đã chốt theo chỉ thị tiếp tục; [OPEN_QUESTIONS.md](research/OPEN_QUESTIONS.md) giữ câu hỏi ở thời điểm checkpoint để truy vết.
