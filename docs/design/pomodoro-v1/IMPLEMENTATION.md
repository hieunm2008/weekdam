# Pomodoro

## Hành vi

Mục Pomodoro và thanh đếm nhỏ dùng giao diện hiện có, Việt/Anh, sáng/tối. Có thể chọn Task từ tuần đang xem hoặc tập trung tự do. Thao tác trên thẻ Subtask mở Task cha; không thay trạng thái hoàn thành công việc.

Chu kỳ mặc định 25/5/15 phút, nghỉ dài sau 4 phiên hoàn thành. Giới hạn tùy chỉnh: tập trung 1–120, nghỉ ngắn 1–30, nghỉ dài 1–60 phút; chu kỳ 2–12 phiên. Hết giờ dừng ở trạng thái chờ, bấm bước tiếp theo mới chạy. Phiên dừng/đặt lại sớm có lưu thời gian thực, không gồm pause; chỉ phiên đủ giờ tăng chu kỳ. Thời lượng mới áp dụng cho giai đoạn chưa chạy.

## Dữ liệu

- `Plan.pomodoroSessions` tùy chọn; backup vẫn version 1, IndexedDB vẫn version 2.
- Mỗi phiên là một cloud record `pomodoroSession` độc lập; ID cấp khi bắt đầu và giữ qua retry/reload.
- Runtime/cấu hình lưu tại `meta["pomodoro:" + scope]`, tách Guest/account. Mốc thời gian dùng epoch milliseconds; nhóm thống kê theo ngày kết thúc ở Asia/Ho_Chi_Minh.
- Finalization ghi runtime, lịch sử và account outbox trong cùng transaction; lỗi ghi rollback. Lưu kế hoạch từ tab cũ phải hợp lịch sử trên đĩa trước khi ghi.
- BroadcastChannel chỉ báo invalidation; nguồn dữ liệu là IndexedDB. Visibility/reload đọc lại trạng thái và outbox; fallback storage event không chứa nội dung công việc.
- Lịch sử chỉ bổ sung trong bản này, nằm ngoài Undo kế hoạch. Copy/carry không nhân bản lịch sử; snapshot giữ tên công việc đã xóa/đổi tên. Import hợp theo ID và remap liên kết Task nếu cần.

## Thông báo

Chuông được mở bằng thao tác người dùng. Completion marker trong runtime và một claim nguyên tử trong `meta` cho phép tab đã mở AudioContext nhận chuông đúng một lần, kể cả khi một tab chưa mở âm thanh thắng thao tác kết thúc. Reload/invalidation không phát lại chuông cũ. Quyền thông báo chỉ được hỏi khi bật tùy chọn; denied/unsupported vẫn có phản hồi trên giao diện. Service worker xử lý notification click và mở `/app#pomodoro`. Đây là thông báo từ ứng dụng đang được trình duyệt thực thi, không phải cơ chế báo thức độc lập khi hệ điều hành dừng ứng dụng.

## Nghiệm thu

Nghiệm thu phần mềm ngày 12/10/2026:

| Kiểm tra                          | Kết quả                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm test`                        | 105 ca, 12 file, đạt                                                                            |
| `npm run test:e2e -- --workers=1` | 122 ca đạt; 10 ca được bỏ qua trên loại thiết bị không phù hợp; không có failure                |
| `npm run test:rules`              | 9 ca Firestore Emulator đạt                                                                     |
| `npm run test:sync`               | 14 ca Auth/Firestore Emulator đạt                                                               |
| `npm run build`                   | TypeScript, bundle production và PWA đạt                                                        |
| QA giao diện                      | 60 ảnh, 3 viewport × 2 theme × 2 ngôn ngữ; không lỗi axe, tràn ngang hoặc nút bị navigation che |

Đồng bộ đã được xác nhận trên bản mã cuối cho offline/reload/reconnect, history-only Guest, phiên Guest vừa lưu chưa broadcast và paused runtime khi đổi tài khoản. Tổng cộng 250 ca kiểm thử tự động đạt. Xem [ảnh và số đo](README.md). `tools/inspect-pomodoro.cjs` tạo ảnh và báo cáo QA trong thư mục này; dữ liệu thử chỉ nằm trong browser context tạm.

Bản Pomodoro đã deploy lên project `weekdam-hieu-2026` ngày 12/10/2026 theo yêu cầu của người dùng. Firestore rules/indexes được phát hành thành công trước Firebase Hosting. HTML, service worker, notification worker và manifest trên website public khớp từng byte với bundle production. Mở [Pomodoro](https://weekdam-hieu-2026.web.app/app#pomodoro); xem [bằng chứng phát hành](DEPLOYMENT.md).

Các hồi quy bổ sung xác nhận một completion chỉ lưu một phiên, rollback khi ghi outbox thất bại, phiên dừng sớm không tính thời gian pause, Undo/import/copy giữ đúng lịch sử, timestamp ngoài miền Date bị từ chối, và tab có AudioContext phát đúng một chuông ngay cả khi nhận completion từ tab khác qua invalidation hoặc một thao tác stale. Reload không phát lại chuông đã nhận.

Khi phát hành, deploy Firestore rules mới trước frontend. Giao diện cũ không cung cấp Pomodoro nhưng rules mới vẫn nhận các record planner hiện có. Việc cài PWA và âm thanh/thông báo khi khóa màn hình trên Android vật lý cần nghiệm thu trên thiết bị thật.
