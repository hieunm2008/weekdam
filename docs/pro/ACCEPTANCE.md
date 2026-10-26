# Nghiệm thu weekdam Pro — cập nhật 24/10/2026

## Phạm vi đã triển khai

`/pricing` so sánh Free/Pro và giữ lựa chọn tháng/năm sang `/app?plan=…#pro`. Mục Pro có quản lý gói và năm công cụ. Guest xem giới thiệu, ví dụ và cấu hình; chạy công cụ, dùng thử hoặc nâng cấp yêu cầu đăng nhập. Đầu vào công cụ được giữ khi chuyển sang quản lý gói. Quyền được kiểm tra lại lúc thực thi; đổi tài khoản hủy thao tác chờ.

Billing demo dùng Firestore transaction, receipt bất biến và ID giao dịch giữ nguyên khi retry. Chỉ xác nhận sau commit. Trial 7 ngày một lần, tháng/năm theo lịch Việt Nam, gia hạn từ hạn cũ hoặc hiện tại, không tự gia hạn. Offline dùng quyền còn hạn đã cache của đúng UID; chưa biết trạng thái hiển thị đang kiểm tra.

Các phép tính ôn thi/lặp/mẫu/báo cáo là hàm thuần. Lịch ôn thi loại giờ đã qua, lịch bận, tuần kết thúc và ngày thi; preview thiếu phút không áp dụng. Lịch lặp được tạo hữu hạn ngay lúc áp dụng, giữ ngoại lệ và lịch sử; copy/carry không nối lại chuỗi. Mẫu riêng chỉ chứa nội dung kế hoạch. Thao tác hàng loạt dùng một commit Undo; ledger chống áp dụng trùng cũng đi qua backup/sync.

Báo cáo dùng giờ Việt Nam, giữ snapshot Pomodoro đã xóa công việc, tính cả dừng sớm, xuất CSV UTF-8 có BOM và chống công thức, bản in để Save as PDF. Nhắc deadline ngày-only là 23:59 Việt Nam, quét mỗi 30 giây/focus/đổi dữ liệu, inbox gộp mốc lỡ và claim IndexedDB nguyên tử chống trùng tab. Không tự xin quyền Notification.

## Bằng chứng tự động

Xem [kiểm chứng Firebase](FIREBASE-VALIDATION.md) và [hợp đồng báo cáo/nhắc](REPORTS-REMINDERS.md). Các lệnh nghiệm thu: `npm test`, `npm run build`, `npm run test:rules`, `npm run test:sync`, `npm run test:e2e`. Unit runner dùng thư mục tạm workspace để các process Windows sandbox đọc chung cache Vitest.

Kết quả số lượng cuối cùng và nghiệm thu UI được cập nhật tại cuối tài liệu sau lần chạy cuối. Không dùng kết quả từ Emulator để khẳng định Google provider hoặc cloud đã đạt.

Lần kiểm chứng cuối ngày 23/10/2026: Firestore rules **16/16**, Auth/Firestore sync **19/19**, UI production **130 đạt / 10 bỏ qua theo thiết bị**, tất cả exit 0. UI chạy bằng một Chrome worker, hai project desktop/mobile; cả Việt/Anh và sáng/tối. Các trường hợp chuột/cảm ứng chỉ chạy trên loại thiết bị phù hợp. Log và ảnh nằm trong `.tmp/validation-final/`; lệnh, phạm vi và giới hạn chi tiết ở [FIREBASE-VALIDATION.md](FIREBASE-VALIDATION.md). Unit/build được cập nhật riêng sau lần chạy cuối của gate tương ứng.

Hành trình form Pro trên Emulator đã thực hiện: guest nhập môn/nội dung → popup Google Emulator → dùng thử → checkout thất bại/hủy/thành công → áp dụng ôn thi, tạo lặp, lưu và áp dụng mẫu → báo cáo/tải CSV → bật inbox và từ chối Notification → reload → context mobile thứ hai vẫn có Pro, mẫu và cấu hình nhắc. Đổi tài khoản hủy form chờ và checkout của account trước cũng đã có kiểm thử đạt. Ảnh desktop/mobile được xem trực tiếp, nội dung đọc được và trang không tràn ngang. Các kiểm tra Notification thật đa tab, bản in/CSV trong ứng dụng văn phòng và thiết bị vật lý vẫn cần checklist tương ứng.

Bài Pro UI bổ sung đã đạt **1/1, exit 0**: áp dụng kế hoạch ôn thi 100 phút (một project, hai buổi), bấm một lần Hoàn tác loại toàn bộ project/buổi và operation ledger, giữ nguyên trial/billing, rồi tính và áp dụng lại thành công. Test đọc kế hoạch IndexedDB thật của đúng scope, sau đó tiếp tục đủ năm công cụ và đồng bộ client mobile. Log tại `.tmp/validation-final/pro-ui-undo.log`.

Bổ sung 24/10/2026: hai ca lifecycle chạy riêng **2/2 đạt**, log `.tmp/validation-final/lifecycle-retry.log`. UI sau khi hết Pro vẫn sửa, hoàn thành, xóa và backup công việc; vẫn đổi tên/xóa mẫu; chạy ôn thi mới bị chặn. Hai tab Chrome cùng account chỉ gọi native Notification constructor một lần khi quét tới mốc, cùng nhận inbox và reload không gọi lại. Thiết bị/OS thật và cloud vẫn thuộc checklist riêng.

Sau sửa inbox của quyền đã hết hạn, gate đầy đủ ngày 24/10 đã đạt **206/206 unit và 19/19 sync**, exit 0. Inbox cũ bị loại khi công việc/project đã xóa, hoàn thành hoặc đổi deadline; mục còn hợp lệ vẫn giữ, không thêm các mốc mới khi chưa có Pro. ReminderCenter chỉ được mount sau khi dữ liệu account tải xong để tránh dọn nhầm inbox trong lúc hydration. Log: `.tmp/validation-final/unit-expiry-prune.log`, `.tmp/validation-final/sync-expiry-prune.log`.

## Checklist cloud còn chờ

- [x] Tạo project `weekdam-pro-demo-2026` với Web app, Firestore và Google provider; đọc lại authorized domains.
- [x] Cấu hình frontend/CLI cùng project riêng, guard và build đạt; deploy Hosting/rules/indexes thành công.
- [ ] Google login thật → dùng thử → checkout mô phỏng thành công/thất bại/hủy → reload → đủ năm công cụ.
- [ ] Cùng tài khoản trên thiết bị thứ hai nhận hạn Pro, receipts và đủ dữ liệu; offline/reconnect không mất quyền hợp lệ hoặc hồi sinh buổi đã xóa.
- [ ] Đổi tài khoản giữa popup/checkout/Notification permission không mang thao tác hoặc quyền cũ sang tài khoản mới.
- [ ] Thử hết hạn và gia hạn; vẫn sửa/hoàn thành/xóa/backup công việc cũ được, khóa tạo mới/chạy Pro.
- [ ] Thử PWA Android vật lý, bàn phím, trình duyệt từ chối Notification, nhiều tab và mở lại sau deadline.
- [ ] Nhóm thu phỏng vấn thật 1–3 người và khảo sát nhu cầu/mức sẵn sàng trả tiền; không điền kết quả giả.

Project riêng đã tạo và deploy trong phiên này: [mở demo](https://weekdam.web.app/pricing), Hosting site `weekdam` trong project `weekdam-pro-demo-2026`. Google provider đọc lại có `enabled: true`; authorized domains gồm `weekdam-pro-demo-2026.firebaseapp.com`, `weekdam-pro-demo-2026.web.app`, `weekdam.web.app`, `weekdam.firebaseapp.com` và `localhost`. Xem [bằng chứng cloud](CLOUD-SETUP.md).

Người dùng đã yêu cầu **để nghiệm thu cloud sau**. Không đánh dấu hoàn tất các mục đăng nhập Google thật/thiết bị thật ở trên. Chưa thu hoặc dựng kết quả phỏng vấn/khảo sát. Unit cuối: **206/206**, build cloud và guard **exit 0**; rules **16/16**, sync **19/19**, UI production **130 đạt/10 bỏ qua theo thiết bị**.
