# Checkpoint Phase 0 — các quyết định cần Hieu duyệt

Trạng thái lịch sử: các mặc định Q1–Q9 và U3 đã được áp dụng theo chỉ thị tiếp tục toàn bộ phase ngày 09/10/2026. Nội dung dưới lưu câu hỏi/đề xuất ở checkpoint để truy vết; không còn là cổng chặn triển khai. [DECISIONS.md](../DECISIONS.md) ghi quyết định hiện tại, [PROGRESS.md](../PROGRESS.md) ghi kết quả nghiệm thu production/Android đã được Hieu xác nhận.

## Quyết định sản phẩm

| ID | Cần duyệt | Bằng chứng / khác biệt so với brief | Đề xuất mặc định |
|---|---|---|---|
| Q1 | Tiến độ có trọng số hay chỉ đếm việc? | Bản gốc Easy/Medium/Hard = 1/2/3; ba subtask = 6 units. Khác mặc định “chỉ phân loại” trong brief. | Giữ 1/2/3 cho tiến độ tuần/task và Stats; view ngày thêm số subtask thực tế, ghi rõ nhãn units. |
| Q2 | Move work chuyển cả plan hay chỉ việc chưa xong? | Bản gốc chuyển toàn bộ cây sang tuần trống và giữ tiến độ/ID; không chọn từng việc. | Làm Move whole week P1 theo bản gốc. Menu chuyển ngày riêng cho subtask vẫn P0 theo yêu cầu. Chọn nhiều việc chưa xong để chuyển tuần chưa đưa vào phạm vi. |
| Q3 | End week và Reopen | Đã xác minh carry pending / không carry; giữ lịch sử cả hai nhánh. Không có lựa chọn “giữ tuần đang mở nhưng chốt”. Reopen không thu hồi các bản đã carry. | Giữ hai hành vi, đặt nhãn “Chuyển việc chưa xong sang tuần sau” / “Kết thúc, không chuyển việc”; có Cancel. Đề xuất thêm Reopen P1; giải thích việc carry cũ không tự thu hồi, có undo cho thao tác phá hủy của app mới. |
| Q4 | Chức năng mới ngoài 15 mục | Weeks, Reopen, deadline project, overdue/missed, font đã phát hiện. Bạn đã chọn đề xuất tại checkpoint, chưa tự động bao gồm. | Thêm Weeks, Reopen, deadline project, overdue/missed ở P1; hoãn font P2. Theme/vi/en đã yêu cầu nên giữ P0. |
| Q5 | Deadline khi copy/move/carry | Bản gốc giữ ngày tuyệt đối; paste kế hoạch tuần sau có thể chứa deadline của tuần trước. | Giữ deadline tuyệt đối và cảnh báo ngày cũ trong preview; không tự cộng 7 ngày. Nếu muốn dịch deadline theo tuần, cần đổi spec trước code. |
| Q6 | Kéo thả đổi ngày | Bản gốc đã xác minh reorder project/task/subtask trong editor. Chưa thấy calendar drag giữa ngày; menu Move chỉ xuất hiện trên overdue trong mẫu. | weekdam hỗ trợ reorder và kéo subtask sang ngày khác trong tuần bằng chuột/cảm ứng/bàn phím, cùng menu chuyển ngày cho mọi subtask; ghi đây là phần mở rộng, không phải hành vi bản gốc đã xác minh. Không kéo task giữa project trong v1. |

## Mặc định kỹ thuật cần khóa trước các phase liên quan

| ID | Cần duyệt | Đề xuất mặc định |
|---|---|---|
| Q7 | Timezone giữa máy tính và Android | Một timezone kế hoạch `Asia/Ho_Chi_Minh` để cùng instant không đổi tuần giữa thiết bị; lưu ngày lịch dạng YYYY-MM-DD, timestamp sync ở UTC. Bản gốc theo timezone trình duyệt. |
| Q8 | Guest local và dữ liệu cloud đã tồn tại khi đăng nhập lần đầu | Chỉ Google. Cloud trống: upload giữ IDs. Cloud có dữ liệu: dialog gộp hoặc dùng cloud; giữ bản local để backup, không ghi đè tự động. Gộp dựa ID, không tên; import ID trùng nhưng khác dữ liệu tạo ID mới và remap cây. Nhớ migration để retry không nhân bản. |
| Q9 | Hosting và tiêu chí PWA | Firebase Hosting + Auth Google + Firestore Standard Spark, không billing, domain miễn phí của nhà cung cấp. Kiểm tra cài PWA và offline bằng Chrome/Android thật; Lighthouse cho performance/accessibility/best practices, không dùng badge PWA deprecated. |

## Chưa xác minh ở bản gốc

| ID | Giới hạn / chưa chắc | Đề xuất xử lý |
|---|---|---|
| U1 | Authenticated sync, first-login merge, conflict resolution sau đăng nhập | Không tạo tài khoản theo yêu cầu. Thiết kế của app mới dựa yêu cầu riêng, không gán kết quả cho bản gốc. |
| U2 | Android thật, touch task/subtask và kéo giữa ngày | Chỉ mô phỏng touch reorder project thành công. Test Android thật trong các phase tương tác/PWA; chưa báo đạt. |
| U3 | Streak khi thiếu tuần, tuần trống; tie Best week; phạm vi heatmap biên năm | Streak threshold 50% đã thấy trong UI, nhưng chưa phủ các ca biên. Đề xuất streak chỉ tính chuỗi tuần lịch liền nhau ended, total>0, rate≥50%; thiếu/trống ngắt chuỗi. Best week hòa chọn tuần mới nhất; heatmap 365 ngày lịch, chỉ scheduled completed units của tuần ended. Cần duyệt các mặc định này, không coi là bản gốc đã chứng minh. |
| U4 | Deadline đổi timezone và edit lịch sử sau reopening | Chỉ xác minh chuỗi deadline local và UI; cần unit/e2e của app mới cho timezone và cập nhật Stats. |
| U5 | Project màu, stats theo difficulty/project riêng | Không thấy trong UI Guest; không bổ sung riêng ngoài progress project đã xác minh nếu chưa có yêu cầu. |

## Điều kiện để qua checkpoint

Hieu duyệt ưu tiên/phạm vi trong [FEATURES.md](FEATURES.md) và trả lời Q1–Q9 (có thể chấp nhận toàn bộ đề xuất, hoặc chỉ rõ ID cần đổi). Các mục U ghi giới hạn, không bắt buộc đăng nhập bản gốc để tiếp tục. Phase 1 chỉ bắt đầu sau xác nhận này; schema/app/API/deploy chưa được thực hiện.
