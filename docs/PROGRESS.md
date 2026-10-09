# Tiến độ weekdam

Yêu cầu tiếp tục các phase không ngắt quãng được áp dụng ngày 09/10/2026: dùng các mặc định Q1–Q9 và U3 trong checkpoint, không chờ trả lời riêng từng câu. Tài liệu Phase 0 giữ tính lịch sử của khảo sát, không được dùng để ngăn triển khai sau chỉ thị mới này.

| Phase | Trạng thái hiện tại | Bằng chứng / còn lại |
|---|---|---|
| 0 — nghiên cứu | Hoàn tất | Commit `5c3758e`, 106 ảnh; verifier research |
| 1 — shell | Đã triển khai và kiểm tra phần mềm | Responsive, vi/en, light/dark/system, icon riêng, manifest/SW; E2E offline reload và nhớ preferences. Android vật lý còn mở |
| 2 — local core | Đã triển khai và kiểm tra | CRUD, trọng số, ngày/tuần Saigon, undo, IndexedDB; 15 unit tests và E2E CRUD |
| 3 — tương tác | Đã triển khai và kiểm tra phần mềm | Mouse/touch/keyboard sensors, mobile day-tab drop/menu move; copy/paste/carry/move, giữ thứ tự editor. Android vật lý còn mở |
| 4 — sync | Emulator đã kiểm chứng | 3 rules tests và 2 browser sync tests: cross-device, offline reload/reconnect, sign-out isolation, Guest migration qua reload. Google provider thật/production project còn mở |
| 5 — hoàn thiện | Phần chức năng đã có, đang QA | End/reopen, Stats, history, guide, JSON import/export, focus/dialog, translations; tiếp tục accessibility/Lighthouse và ca biên |
| 6 — deploy | Đang chuẩn bị, chưa triển khai thật | CLI chưa đăng nhập; Hieu chưa có Firebase project. Đã chuẩn bị Hosting/rules/indexes/env example; cần đăng nhập, tạo Spark, cấu hình Google và kiểm tra Android thật |

## Bằng chứng hiện có

- `npm test`: 15 tests PASS.
- `npm run test:e2e`: 14 PASS, 2 skip có chủ đích (keyboard chỉ desktop, touch chỉ mobile).
- `npm run test:rules`: 3 PASS với Firestore Emulator thực.
- `npm run test:sync`: 2 PASS với Auth + Firestore Emulator và hai browser contexts, gồm mobile.
- Ảnh app riêng trong `docs/validation/screens`, khác screenshot research của bản gốc.

Các kết quả trên chưa chứng minh Google sign-in production, deploy HTTPS thật hoặc cài/mở app trên Android vật lý. Goal toàn bộ app vẫn đang active.

## Quyết định triển khai đã cụ thể hóa

- Week identity canonical theo ngày Thứ Hai khi sync, các entity con giữ ID.
- Cloud records phân tách theo entity; initial listener theo UID đọc dữ liệu lịch sử của tài khoản để có Stats/history đầy đủ, không polling. Đây là v1 cho một người; cần theo dõi reads khi lịch sử lớn, không khẳng định sync không giới hạn.
- Offline outbox lưu bền vững và dùng revision UUID; ACK cũ không xóa intent mới kể cả payload bằng nhau. Cloud writes chia batch tối đa 100 records.
- Undo dùng patch theo entity, tránh ghi đè những entity không liên quan; tối đa 20 bước trong phiên, không giữ lịch sử undo qua reload.
- Metadata tuần đang có được giữ khi merge backup; deadline không tự dịch. Unknown authenticated backend của Beaverplans không được dùng làm cơ sở khẳng định hành vi cloud.
- Firebase CLI thực tế dùng device-code login trên môi trường này; người dùng hoàn tất trong terminal, không chia sẻ authorization code/token qua chat.
