# Mô hình dữ liệu suy ra trong Phase 0

Đây là **quan sát dữ liệu do mình tạo trong Guest**, không phải schema của weekdam và không phải mã nguồn tham khảo. Không đọc bundle JS, source map hoặc API riêng của trang.

## Quan sát trực tiếp

localStorage có một khóa state version 1 chứa cây `weeks → projects → tasks → subtasks`, cùng các khóa lựa chọn font/locale/guide/theme. Tên khóa của bản gốc chỉ giữ trong bằng chứng; app mới phải dùng namespace riêng. Không có bản schema cloud hoặc dữ liệu sau đăng nhập trong khảo sát này. Chưa cần đọc IndexedDB vì dữ liệu Guest đã đủ trong localStorage.

| Thực thể | Trường quan sát được | Ý nghĩa xác minh |
|---|---|---|
| State | `weeks: Week[]` | Các tuần có dữ liệu; tuần đang xem không nằm trong state lưu này |
| Week | `weekStart: YYYY-MM-DD`, `ended: boolean`, `projects[]` | Ngày Thứ Hai địa phương; thứ tự tuần trong mảng khác thứ tự sắp xếp của màn Weeks |
| Project | `id`, `name`, `tasks[]`, `deadline?` | ID dạng UUID; project lồng trong một tuần; deadline ngày hoặc ngày + giờ, không thấy color/isDone |
| Task | `id`, `name`, `subtasks[]`, `deadline?`, `description?`, `isDone?` | `description` là ghi chú chung; task không có subtask dùng `isDone` riêng |
| Subtask | `id`, `isDone`, `assignedDay`, `missedDays[]`, `weight`, `description?` | Một weekday `mon..sun`; missed là lịch sử weekday; weight 1/2/3; description là ghi chú của dòng |

Deadline đã quan sát dạng `2026-10-11` và `2026-10-10T17:30`: không có offset timezone trong chuỗi. Chưa đủ bằng chứng để khẳng định cách deadline cloud xử lý khi đổi timezone.

Bằng chứng: [state ban đầu](evidence/guest-state-01.json), [hai project](evidence/guest-state-02.json), [task không subtask](evidence/mobile-unscheduled.json).

## Quy tắc suy ra và đối chiếu bằng UI

- Thứ tự project/task/subtask được biểu diễn bằng thứ tự mảng. Kéo thả không tạo ID mới.
- Một dòng to-do dùng tên task cha + ghi chú subtask. Một task nhiều ngày là nhiều subtask khác ID, không phải cùng subtask được lên lịch nhiều ngày.
- Task có subtask hoàn thành khi tất cả subtask `isDone=true`; checkbox task cập nhật toàn bộ con. Project không có trạng thái hoàn thành riêng trong snapshot đã đọc.
- Planned units của task có subtask = tổng weight; done units = tổng weight của những subtask đã xong. Task không có subtask có planned units 1, done units theo `isDone`. UI hiển thị phần trăm làm tròn.
- Missed ở ngày cũ có thể tạo một dòng lịch sử bị disabled; nó không cộng thêm planned units của tuần. Ví dụ move Wed → Fri: tổng tuần vẫn 9, dù Wednesday có một missed row và Friday có subtask đó.
- Week/day overview tính tải bằng units; day focus đếm dòng thực tế. Stats tổng tuần tính cả task chưa gán ngày, còn Activity/weekday stats chỉ có dữ liệu đã gán ngày.

## Chuyển đổi dữ liệu đã quan sát

| Thao tác | Kết quả |
|---|---|
| Copy | JSON có format version, weekStart nguồn và những project đã chọn; chứa IDs, deadlines, completion và missed của nguồn. [Payload do phiên thử tạo](evidence/copied-plan.json) |
| Paste mặc định | Append project vào tuần đích, IDs mới cho toàn bộ cây, completion=false, missed=[]; giữ deadline tuyệt đối, weekday, trọng số, ghi chú. [Snapshot](evidence/guest-paste-default.json) |
| Paste giữ tiến độ | Append cây mới, giữ completions và missed; tên trùng không merge. [Dán lặp](evidence/guest-paste-repeated.json), [cùng tuần](evidence/mobile-paste-same-week.json) |
| Move whole week | Chỉ đổi weekStart trong state quan sát; giữ cả cây và IDs. Không merge vào tuần có việc. Deadline không đổi. [Snapshot](evidence/guest-move-work.json) |
| Move overdue subtask | Đổi assignedDay; optional thêm weekday cũ vào missedDays; giữ ID, trọng số và ghi chú. |
| End + carry | Week nguồn ended=true và giữ cây lịch sử. Tuần sau nhận bản clone của phần chưa hoàn thành, bỏ subtask đã hoàn thành, reset missed, giữ weekday/deadline; project trùng tên vẫn tạo mới. [Snapshot](evidence/guest-ended-carried.json) |
| End + Clear all | Week nguồn ended=true, giữ lịch sử và stats, không append thêm vào tuần sau. Không xóa những bản carry từ lần chốt trước. [Snapshot](evidence/guest-end-clear-all.json) |
| Reopen | ended=false; UI lại cho làm việc. Không thấy quá trình rollback dữ liệu đã carry trong lần chốt cũ. |
| Clear this board | Xóa tuần đang xem khỏi state thay vì tạo archive. Hai tuần ended khác giữ nguyên. [Snapshot](evidence/mobile-clear-board.json), [UI](screens/mobile-36-board-cleared.png) |

## Stats và thời gian

- Avg completion: aggregate weighted units của tuần ended. Hai tuần 4/8 và 4/4 → 8/12 → 67%. [State](evidence/mobile-stats-two-weeks.json), [UI](screens/mobile-30-stats-two-weeks.png).
- Follow-through theo weekday: done scheduled units / planned scheduled units ở weekday đó; Thursday trong mẫu = 5/7 = 71%.
- Distribution: done units của weekday / tổng done scheduled units; Thursday mẫu = 5/7, Tue/Fri mỗi ngày 1/7.
- Streak: UI ghi ngưỡng 50%+; hai tuần liên tiếp 50%, 100% cho 2. Cách xử lý tuần thiếu/trống chưa xác minh.
- Tuần/current day dùng timezone trình duyệt, không phải cố định UTC. [Cùng instant, khác timezone](evidence/timezone-cases.json).
- `ended` không có timestamp riêng trong state; UI hiện “Ended Oct 11” dù chốt ngày Thứ Năm. Không nên suy ra ngày chốt thật từ nhãn cuối tuần.

## Định hướng riêng cho weekdam — chưa chốt schema

Mô hình nghiệp vụ nên giữ quan hệ tuần/project/task/subtask, tách ngày lịch khỏi timestamp đồng bộ, IDs ổn định, và version cho backup. Không bê cây localStorage hoặc format mang thương hiệu bản gốc sang app mới. Sync cần granularity theo thực thể để tránh ghi đè cả tuần khi hai thiết bị sửa những task khác nhau; quyết định schema/merge cụ thể sẽ thực hiện sau checkpoint. Xem [DECISIONS.md](../DECISIONS.md).
