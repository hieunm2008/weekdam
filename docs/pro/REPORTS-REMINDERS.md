# Báo cáo và nhắc deadline Pro

## Hợp đồng dữ liệu

- `buildStudyReport(plan, filter)` tính phút lên lịch từ các subtask có `startTime` / `endTime` hợp lệ; công việc chưa có giờ không được quy đổi.
- Pomodoro chỉ lưu phiên tập trung; báo cáo cộng `focusedDurationMs` của cả `completed` và `stopped`. Mỗi phiên thuộc ngày kết thúc theo `Asia/Ho_Chi_Minh` và dùng `task.projectName` đã chụp tại thời điểm ghi phiên, kể cả công việc đã xóa.
- `differenceMinutes = focusedMinutes - plannedMinutes`. Bộ lọc tên project khớp chính xác; `UNATTRIBUTED_PROJECT` chọn các phiên không gắn công việc. Mặc định từ 29 ngày trước đến hôm nay, gồm 30 ngày.
- CSV là UTF-8 có BOM; các ô văn bản có dấu công thức đầu ô (kể cả sau khoảng trắng) được thêm dấu nháy đơn. CSV chỉ xuất các dòng đúng bộ lọc đang áp dụng. HTML in thoát nội dung người dùng trước khi mở cửa sổ in; dùng Print → Save as PDF.
- Cấu hình nhắc lưu ở `Plan.pro.reminders`. Deadline chỉ ngày = 23:59 Việt Nam; datetime không có offset cũng được diễn giải theo giờ Việt Nam.
- Inbox và mã mốc đã nhắc nằm trong IndexedDB `weekdam-pro-reminders`, tách theo Firebase UID và thiết bị. Transaction `readwrite` bảo đảm hai tab chỉ có một tab nhận mốc mới. BroadcastChannel đồng bộ thao tác đóng inbox giữa các tab.
- Inbox giữ qua reload; đóng nhắc không xóa mã mốc đã nhận. Sửa deadline đổi mã mốc và dọn inbox cũ; xóa/hoàn thành công việc cũng dọn inbox. Các mốc bị lỡ được gộp theo entity và deadline; khi mở lại không phát hàng loạt Notification.
- Khi hết Pro, monitor chỉ đọc inbox đã có, không chạy tạo nhắc mới. Khi đổi tài khoản/unmount, kết quả đang chờ của tài khoản cũ không được đưa vào giao diện hoặc gửi Notification.
- Notification chỉ xin quyền qua nút chủ động; permission bị từ chối hoặc constructor không được trình duyệt hỗ trợ không ngăn nhắc trong app. Không có nhắc chạy nền khi app đóng.

## Kiểm thử tự động

`npm test` bao gồm:

- `src/pro/reports.test.ts`: phạm vi ngày qua năm, 30 ngày Việt Nam, lịch có giờ, phiên dừng sớm/qua nửa đêm, tên project lịch sử và việc đã xóa, nhóm không gắn việc, lọc/rỗng, CSV tiếng Việt/công thức, thoát HTML in.
- `src/pro/reminders.test.ts`: deadline Việt Nam, ba mốc, dedup, hoàn thành, sửa deadline, race hai scanner, inbox bền, đóng nhắc, tách tài khoản, xóa inbox cũ, mốc live và bị lỡ.
- `src/pro/useReminders.test.ts`: permission denied vẫn có inbox, live notification một lần, mở lại không phát hàng loạt, hủy trạng thái chờ tài khoản cũ, hết quyền, chỉ xin quyền qua helper chủ động.
- `src/pro/reportTools.test.ts`: guest chỉ thấy dữ liệu mẫu; người có quyền thấy lựa chọn project; form có mốc mặc định và nút quyền trình duyệt.

## Checklist nghiệm thu UI / thiết bị thật

Bổ sung ngày 24/10/2026: `tests/sync-e2e/pro-lifecycle.spec.ts` đã chạy riêng **2/2 đạt** trên Chrome và Emulator. Hai tab cùng account dùng IndexedDB/BroadcastChannel thật, vượt mốc qua bộ quét 30 giây và chỉ gọi native Notification constructor một lần; reload giữ một dòng inbox và không gọi lại. Test đóng Notification ngay sau khi khởi tạo để không để lại banner. Bằng chứng này xác nhận việc gọi/chống trùng trong Chrome, không thay thế nghiệm thu giao nhận thông báo của hệ điều hành hoặc điện thoại vật lý. Ca còn lại xác nhận Pro hết hạn vẫn sửa/hoàn thành/xóa/backup công việc và đổi tên/xóa mẫu cũ được, đồng thời chặn tính kế hoạch mới.

Hồi quy sau hết hạn: cleanup inbox tiếp tục loại mục đã hoàn thành/xóa/đổi deadline, giữ mục còn hợp lệ và không nhận mốc mới; không chạy cleanup trước khi dữ liệu account sẵn sàng. Bốn unit mới đã quan sát đỏ trước sửa và gate cuối đạt **206/206 unit**, **19/19 sync**. Lần chạy chung cuối dùng `sync-expiry-prune.log` ngày 24/10; không suy ra các thao tác Office hoặc giao nhận thông báo OS từ việc native constructor được gọi.

Các phép thử dưới đây cần được chạy trên giao diện cuối đã tích hợp; unit test và Emulator không thay thế kiểm tra trình duyệt thật.

1. Desktop/mobile, Việt/Anh, sáng/tối: mở Báo cáo, điền ngày và project, Tạo báo cáo. So số phút tổng, theo ngày và theo project với các phiên mẫu; khoảng rỗng hiển thị 0. Dùng bàn phím đến tất cả input/nút và mở bảng chi tiết theo ngày.
2. Tạo lịch 50 phút và một việc chưa có giờ. Ghi Pomodoro hoàn thành rồi dừng sớm một phiên; kiểm tra chỉ phần tập trung được cộng. Xóa công việc: tên project lịch sử và phút tập trung vẫn còn.
3. Xuất CSV bộ lọc hiện tại; mở bằng Excel/LibreOffice, kiểm tra tiếng Việt. Đặt tên project `=1+1`, `+1`, `@SUM(1,2)` hoặc có dấu phẩy/nháy: phải là văn bản, không chạy công thức.
4. In/Lưu PDF: kiểm tra ngày, tên project, số phút, bảng theo ngày đúng bộ lọc; tên chứa `<` hoặc `&` hiển thị nguyên văn. Kiểm tra popup bị chặn có hướng dẫn thử lại.
5. Bật nhắc trong app, chọn nhiều mốc; đặt deadline có ngày và có giờ. Kiểm tra đúng mốc Việt Nam, project chỉ một nhắc mỗi mốc. Tắt nhắc: không phát mốc mới.
6. Khi chưa bấm Bật thông báo trình duyệt, không xuất hiện hộp xin quyền. Bấm rồi từ chối: vẫn có nhắc trong app. Cho phép trên desktop: mốc mới phát một thông báo; kiểm tra trình duyệt mobile chỉ hỗ trợ inbox nếu chặn Notification constructor.
7. Mở hai tab cùng UID, cùng thiết bị; đặt mốc gần. Chỉ một Notification; đóng nhắc ở một tab được phản ánh ở tab còn lại. Reload không phát lại mốc đã đóng.
8. Đóng app qua nhiều mốc rồi mở lại: mỗi công việc/project có một dòng với các mốc bị lỡ; không phát liên tiếp nhiều thông báo hệ thống.
9. Sửa deadline/xóa/hoàn thành ngay trước khi mốc đến; inbox cũ mất, không nhắc mốc cũ. Offline: cấu hình/cache có quyền còn hạn vẫn tạo inbox được.
10. Đổi Google account trong lúc có scan đang chờ; tài khoản mới không thấy inbox cũ. Hết Pro: không sinh nhắc mới. Inbox là theo thiết bị; cấu hình nhắc, kế hoạch và Pomodoro phải được xác minh đồng bộ trên thiết bị khác qua Firebase thử nghiệm thật.
