# Theo dõi triển khai glass UI

Hieu duyệt bộ 6 mockup và yêu cầu bắt đầu triển khai ngày 09/10/2026. Nguồn phạm vi: `PLAN.md`; ảnh chuẩn: các PNG trong thư mục này. App đang chạy và dữ liệu production được giữ trong quá trình triển khai.

- [x] Mockup desktop/Android/editor/Stats/Weeks/dark đã tạo và được duyệt.
- [x] Thứ tự thẻ riêng từng ngày, dữ liệu cũ, copy/carry/import/undo.
- [x] Rules cho dayOrder tùy chọn và test Emulator; rules bổ sung đã phát hành trước frontend.
- [x] Thẻ kính, font cục bộ, rail/panel, 7 cột và responsive Android.
- [x] Kéo thân thẻ, trước/sau, tab ngày, filter, keyboard, touch và animation.
- [x] Toàn bộ màn hình/dialog theo cùng hệ thiết kế; giữ chức năng hiện có.
- [x] Unit/E2E/rules/sync, visual QA, accessibility, reduced motion/fallback và Lighthouse.
- [x] Deploy rules trước frontend, giữ Spark/billing tắt; smoke production.
- [ ] Nghiệm thu lại kéo/thả/thứ tự offline và reconnect trên Android thật.

## Kiểm tra ngày 10/10/2026

41 unit, 37 E2E (7 skip theo thiết bị), 4 rules và 8 sync PASS: 90 kiểm thử. E2E có cả vuốt cuộn thật bằng touch events, thả trước/sau/ngoài vùng, keyboard lên/xuống/đổi ngày/trở lại/hủy, filter, undo/reload, font offline và Axe trên planner/editor/Stats/Weeks sáng/tối. Sync gồm thay đổi offline qua reload, Guest migration, cùng khoảng rank và LWW cùng document. Bộ E2E và sync đã chạy lại sau tối ưu tải đầu.

36 ảnh frontend thật và báo cáo `rendered/measurements.json` xác nhận không tràn ngang page/toolbar ở 1440, 1366, 390 và 320 px, vi/en, light/dark; Inter tải thành công, không có page errors. Đã sửa header editor quá dài và hai bố cục bị bó hẹp tại320 px. Fallback không blur được mô phỏng bằng CSS ghi rõ trong báo cáo; reduced motion dùng browser media emulation.

Lighthouse mobile đạt 91/100/100 trên preview và 96/100/100 trên URL production sau khi tải Board/editor theo nhu cầu, hoãn Firestore đến watch/write và chỉ khởi tạo resolver popup Google khi đăng nhập. Persistence, Google provider và dịch vụ Auth giữ nguyên. Production dependencies audit0 vulnerabilities. API xác nhận billing tắt, Standard/native database Singapore và freeTier true tại `validation/free-tier.json`.

Frontend đã phát hành tại https://weekdam-hieu-2026.web.app ngày 10/10/2026. `validation/production-smoke.json` PASS: CRUD/persistence, PWA offline/restart/reconnect, thứ tự thẻ offline, mobile, manifest, auth handler, chặn Firestore chưa đăng nhập, popup Google và thông báo hủy đăng nhập; không nhập credentials hoặc ghi dữ liệu cloud trong smoke test. SDK chờ8 giây cộng polling để xác nhận popup đóng; timeout kiểm thử là 20 giây.

Nghiệm thu Android của bản cũ ngày 09/10 không thay thế bước kéo/thả/thứ tự của bản này. Đã gửi câu hỏi nghiệm thu bản mới; đang chờ xác nhận trực tiếp từ Hieu.
