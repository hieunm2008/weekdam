# Công cụ lập kế hoạch Pro

Các hàm trong `src/pro/planning.ts` chỉ nhận dữ liệu và trả về preview hoặc một `Plan` mới. Thành phần giao diện chịu trách nhiệm kiểm tra tài khoản/quyền Pro khi mở công cụ và ngay trước khi áp dụng; `usePlanner.commit` lưu cả thay đổi hàng loạt trong một mục Undo. Quyền gói và receipt nằm ngoài `Plan`, backup và Undo.

## Ôn thi tự động

- `previewExam(plan, input, now?)` nhận môn/kỳ thi, khoảng ngày, nội dung theo thứ tự, thời lượng buổi và các khoảng rảnh theo thứ. Thứ Hai là `0`, Chủ nhật là `6`.
- Mặc định bắt đầu hôm nay theo `Asia/Ho_Chi_Minh`, buổi 50 phút; khoảng từ ngày bắt đầu đến ngày thi tối đa 180 ngày. Không xếp vào ngày thi.
- Hợp nhất khoảng rảnh giao nhau, loại các buổi có giờ hiện có và tuần đã kết thúc. Không dùng thời gian đã qua; giây lẻ được làm tròn lên phút kế tiếp. Một buổi không bị chia qua hai khoảng trống hoặc qua nửa đêm. Buổi cuối của từng nội dung có thể ngắn hơn.
- Preview trả các buổi, tổng phút yêu cầu/đã xếp/còn thiếu và cờ `complete`. `applyExam(plan, preview, now?)` chỉ chấp nhận preview đủ giờ, kiểm tra lại tuần đã kết thúc, lịch vừa phát sinh và thời gian đã qua.
- Mỗi tuần nhận một project của môn đó; mỗi buổi là một task có một subtask đặt giờ. Dùng lịch hiện có để chỉnh sau khi áp dụng.

## Lịch học lặp lại

- `previewRecurrence(plan, input, now?)` sinh toàn bộ buổi trong khoảng ngày ngay một lần. Khoảng mặc định 12 tuần, tối đa 26 tuần; không có tiến trình sinh thêm khi mở ứng dụng.
- Preview liệt kê buổi và khung giờ giao với lịch hiện có. `applyRecurrence(plan, preview, allowConflicts?, now?)` chỉ giữ giao lịch khi người dùng xác nhận, đồng thời kiểm tra lại thời gian trước khi ghi.
- `editOccurrence(plan, taskId, patch, scope, now?)` hỗ trợ `single`, `future`, `stop`. Patch `null` xóa một buổi; `stop` xóa các buổi tương lai còn có thể thay đổi.
- Sửa/dừng tương lai giữ buổi hoàn thành, buổi sửa riêng (`source.detached`), ngày đã qua và tuần đã kết thúc. Các thao tác chỉnh buổi qua lịch/board cũng phải đánh dấu detached.
- Chuyển nguyên tuần dời ngày nguồn tương ứng và đánh dấu buổi lặp đã tách riêng. Kết thúc tuần không carry buổi lặp sang tuần kế tiếp.

## Mẫu kế hoạch

- `builtInTemplates('vi' | 'en')` cung cấp mẫu ôn thi cuối kỳ, IELTS, học lập trình. Khách có thể xem preview mẫu.
- `captureTemplate(week, selectedProjectIds, name, templateId)` chỉ lấy nội dung project/task/subtask; thay ID, đặt lại hoàn thành và lịch sử missed, bỏ metadata nguồn. Không chứa Pomodoro hay billing.
- `previewTemplate(plan, template, targetWeek)` dịch deadline ngày và ngày-giờ theo chênh lệch tuần, giữ thứ và giờ buổi học. `applyTemplate(plan, preview, allowConflicts?)` ghép thêm vào tuần đang mở, yêu cầu xác nhận nếu trùng lịch.
- Mẫu riêng được lưu trong `Plan.pro.templates`; đổi tên/xóa mẫu hiện có vẫn được phép khi Pro hết hạn. Tạo mẫu và áp dụng mẫu cần quyền Pro còn hạn.

## Chống lặp, đồng bộ và Undo

Preview giữ `operationId` ổn định. Áp dụng ghi marker vào `Plan.pro.appliedOperations`; áp dụng lại cùng preview trả nguyên kế hoạch, kể cả sau khi buổi sinh ra đã bị xóa. Không xóa marker khi xóa task. Undo toàn bộ thao tác loại cả nội dung, rule và marker để có thể áp dụng sạch lần nữa.

Sync mã hóa template, rule, marker và cấu hình nhắc thành các record riêng. Xóa buổi tạo tombstone task/subtask, không gọi lại bộ sinh. Record tổng hợp của Pro chọn ID có hậu tố khi ID ưu tiên trùng entity trong backup cũ; nội dung/ID của entity cũ được giữ. Merge xử lý cả xung đột ID giữa entity kế hoạch, template và rule, và sửa lại liên kết series của nội dung vừa nhập nếu rule phải đổi ID.

Kiểm thử tự động liên quan:

```powershell
npm test -- src/pro/planning.test.ts src/proAudit.test.ts src/proData.test.ts src/domain.test.ts src/records.test.ts
npm run build
```

## Checklist nghiệm thu giao diện và đồng bộ thật

Đây là checklist phải chạy trên giao diện; việc unit test đạt không thay thế các bước này.

1. Ở chế độ khách, nhập môn/nội dung riêng hoặc chọn mẫu, bắt đầu thao tác, đăng nhập Google và dùng thử/nâng cấp. Kiểm tra tiếp tục đúng thao tác với dữ liệu đã nhập; đổi tài khoản phải hủy thao tác chờ của tài khoản cũ.
2. Chạy trên desktop và màn hình mobile; đổi Việt/Anh, sáng/tối; điều khiển bằng Tab, Enter, Space. Kiểm tra tên, nút, checkbox, preview và lỗi đều đọc được, không tràn ngang.
3. Xóa giá trị các ô ngày rồi nhập lại; giao diện không được văng lỗi. Thử ngày qua tháng/năm, 180 ngày ôn thi, 26 tuần lịch lặp và vượt giới hạn.
4. Tạo lịch bận và khoảng rảnh giao nhau; xem preview ôn thi không dùng giờ bận/giờ đã qua/ngày thi. Thiếu giờ phải khóa áp dụng. Để preview qua giờ bắt đầu rồi áp dụng phải yêu cầu tính lại.
5. Áp dụng preview hai lần nhanh; chỉ có một bộ dữ liệu. Undo một lần xóa toàn bộ bộ dữ liệu/rule/marker; áp dụng lại tạo đúng một bộ.
6. Tạo lịch lặp có trùng, xác nhận giữ trùng; sửa một buổi riêng rồi sửa tương lai. Hoàn thành một buổi và kết thúc một tuần, kiểm tra chúng được giữ nguyên.
7. Xóa một buổi, dừng từ một buổi khác, reload và mở thiết bị thứ hai. Các buổi bị xóa không quay lại; không tự sinh thêm khi mở ứng dụng hoặc kết thúc tuần.
8. Kéo một buổi lặp, chuyển nguyên tuần, rồi sửa tương lai từ buổi khác. Buổi đã di chuyển giữ đúng ngày/giờ và không bị ghi đè.
9. Lưu mẫu từ project có buổi hoàn thành và liên kết lịch lặp. Áp dụng vào tuần khác có dữ liệu sẵn; kiểm tra ID mới, reset tiến độ, giữ thứ/giờ, dịch deadline và ghép thêm. Đổi tên/xóa mẫu riêng sau khi Pro hết hạn.
10. Xuất backup, đăng nhập tài khoản thử nghiệm khác và nhập/merge; kiểm tra đủ template/rule/marker/cấu hình nhắc nhưng không mang quyền gói hoặc receipt. Nhập lại một backup v1 Free cũ.
11. Trên Firebase thử nghiệm thật, thực hiện Google login → nâng cấp mô phỏng → áp dụng công cụ → reload/đăng nhập thiết bị thứ hai. Đợi trạng thái đồng bộ và đối chiếu kế hoạch, dữ liệu Pro cùng quyền gói. Emulator không xác nhận thay bước Google login và sync cloud này.
