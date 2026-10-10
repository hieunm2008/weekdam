# Thiết kế lại weekdam: kính mờ, nền kem, kéo thả tự do

## 1. Hướng thiết kế và bước duyệt

Thiết kế lại toàn bộ app theo hướng tinh gọn, dễ đọc: nền kem/xám ấm, chữ than đen, thẻ glassmorphism vừa phải, mật độ cân bằng. Ưu tiên theme sáng; hoàn thiện theme tối tương ứng. Desktop và Android được chăm chút ngang nhau.

- Giữ tên weekdam, hình dạng icon và toàn bộ chức năng hiện có. Điều chỉnh màu icon theo bảng màu mới.
- Tạo mockup riêng, đủ lớn để đọc: bảng tuần desktop, ngày trên Android, editor công việc, Thống kê và Lịch tuần; thêm một bản dark mode cho bảng kế hoạch.
- Dùng dữ liệu mẫu tiếng Việt, gồm tên dài, nhiều thẻ trong một ngày, việc hoàn thành và deadline quá hạn.
- **Dừng để bạn duyệt mockup trước khi sửa giao diện app.** Mockup đã duyệt trở thành chuẩn triển khai; chưa deploy thay đổi ở bước này.

## 2. Giao diện và bố cục

- Bảng màu khởi đầu: nền `#F4F0E8`, chữ `#252521`, chữ phụ `#69675F`. Nền chuyển sắc kem/xám rất nhẹ, không có chuyển động nền liên tục.
- Thẻ kính dùng nền trắng bán trong suốt, blur 14px trên desktop và 10px trên Android, viền sáng mảnh, bóng mềm, bo góc 14px. Cột ngày giữ nền thoáng để tránh nhiều lớp kính lồng nhau.
- Theme tối dùng nền than ấm, thẻ kính tối và chữ ngà; thiết kế riêng độ tương phản. Có nền đặc thay thế khi trình duyệt không hỗ trợ [`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter).
- Dùng [Inter](https://fontsource.org/fonts/inter/about), lưu font cục bộ và cache offline, hỗ trợ tiếng Việt. Tên việc 14–15px trên desktop, 16px trên Android; thông tin phụ tối thiểu 12px, căn trái.
- Desktop giữ 7 cột, chiều rộng tối thiểu 168px/cột, khoảng cách 12px. Khi thiếu chỗ, chỉ bảng tuần cuộn ngang; trang và toolbar không tràn ngang.
- Sidebar mặc định là rail 64px, có tooltip và nút mở panel tên mục/project; panel không làm co bảng tuần. Chọn project sẽ đóng panel.
- Android giữ một ngày với tab tuần, thanh điều hướng dưới và vùng chạm tối thiểu 44px. Tab ngày có thể cuộn riêng trên màn hình rất hẹp.
- Thu gọn header, điều hướng tuần và thanh tiến độ. Các thao tác dùng thường xuyên dễ thấy; thao tác phụ nằm trong menu có nhãn rõ.
- Thẻ hiển thị tên, project, độ khó và deadline khi có; ghi chú mở trong editor. Các subtasks trùng tên có nhãn bước ngắn để phân biệt.
- Thẻ đã hoàn thành giảm độ nổi bật và gạch tên nhưng **giữ nguyên vị trí**.
- Áp dụng cùng hệ thiết kế cho Thống kê, Lịch tuần, Cài đặt, quản lý project, empty state và mọi dialog.

## 3. Kéo thả và animation

- Kéo một thẻ chỉ chuyển subtask thể hiện trên thẻ đó; các phần khác của task giữ nguyên ngày và project.
- Cho phép sắp xếp tự do trong một ngày, kể cả các thẻ thuộc project/task khác nhau; thứ tự được lưu và đồng bộ.
- Desktop nhấc từ vùng thân thẻ không phải nút/checkbox sau khi di chuyển 8px. Android nhấn giữ 250ms, dung sai 8px; thao tác cuộn bình thường không nhấc thẻ.
- Giữ tay nắm riêng cho bàn phím: Space nhấc/thả, mũi tên chọn vị trí/ngày, Esc hủy. Menu chuyển ngày tiếp tục hoạt động.
- Khi kéo: có thẻ nổi, vị trí nguồn mờ và chỉ báo điểm chèn trước/sau. Thả vào tab ngày trên Android sẽ chuyển thẻ và mở ngày đích.
- Thả ngoài vùng hợp lệ hoặc hủy không ghi dữ liệu. Tuần đã kết thúc và thẻ lịch sử missed tiếp tục không kéo được.
- Animation: phản hồi nút 120ms, dialog/sidebar 180ms, sắp xếp và thả 180ms. Chỉ chuyển động bằng transform/opacity; không animate blur.
- `prefers-reduced-motion` tắt chuyển động không cần thiết; kéo bằng bàn phím phản hồi ngay.

## 4. Thứ tự thẻ, dữ liệu và tương thích

Thứ tự bảng ngày độc lập với thứ tự task trong project/editor.

- Thêm `Subtask.dayOrder?: number`: số hữu hạn từ 0 đến `1_000_000_000`. Giữ backup version 1 và cấu trúc IndexedDB hiện tại.
- Dữ liệu cũ thiếu trường này vẫn hiển thị theo thứ tự project/task/subtask hiện có. Khởi tạo thứ tự cho ngày liên quan khi lần đầu thêm, chuyển hoặc sắp xếp thẻ; không migration toàn bộ tài khoản.
- Dùng khoảng cách 1024 giữa các vị trí, chèn bằng giá trị giữa hai thẻ. Chuẩn hóa lại riêng ngày khi khoảng cách quá nhỏ hoặc chạm giới hạn. Rank trùng được phân xử bằng ID để mọi thiết bị hiển thị nhất quán.
- Drop truyền ngày đích cùng ID thẻ neo và vị trí trước/sau. Khi đang lọc project, vị trí chèn dựa trên thẻ nhìn thấy; thứ tự tương đối của các thẻ bị ẩn được giữ.
- Thêm mới và menu chuyển ngày đặt thẻ cuối ngày đích. Copy/paste/carry giữ thứ tự nội bộ của phần được sao chép rồi nối sau dữ liệu đích; Move whole week giữ thứ tự.
- Backup/import/undo giữ trường mới. Khi dedup backup, khác biệt chỉ về thứ tự không tạo bản sao nội dung; diff đồng bộ vẫn coi thay đổi thứ tự là thay đổi cần ghi.
- Firestore rules chấp nhận và kiểm tra trường tùy chọn mới, tiếp tục khóa theo UID. Giữ last-write-wins theo document; không thay đổi Auth hoặc dịch vụ backend.
- Deploy rules bổ sung trước bản frontend mới. Nếu rollback giao diện, giữ rules tương thích với trường thứ tự đã ghi.

## 5. Kiểm thử và triển khai

- Unit tests: thứ tự dữ liệu cũ, kéo khác project, chuyển ngày, rank trùng/chuẩn hóa, copy/carry/import và undo.
- E2E desktop/Android: kéo thân thẻ, phân biệt kéo với click/cuộn, thả trước/sau, tab ngày, filter, bàn phím, hủy và tuần đã kết thúc.
- Sync tests: thứ tự còn sau reload, chỉnh offline rồi reconnect, đồng bộ hai thiết bị và chỉnh đồng thời theo chính sách hiện có.
- Kiểm tra hình ảnh tại 1440×900, 1366×768, 390×844 và 320px; cả theme sáng/tối, tiếng Việt/English, nội dung ít/nhiều và tên dài.
- Kiểm tra WCAG AA, focus, screen reader, reduced motion và fallback không blur. Chạy lại toàn bộ bộ test hiện có; Lighthouse mobile đạt tối thiểu 90 performance và 100 accessibility.
- Sau khi mockup được duyệt, triển khai và kiểm tra preview; deploy lên Firebase project hiện tại khi các kiểm tra pass. Giữ Spark, billing tắt và dữ liệu người dùng.
- Nghiệm thu lại trên Android thật: cài/mở PWA, kéo thẻ, đổi thứ tự offline, đóng/mở lại và reconnect để desktop nhận đúng thứ tự.

Không bổ sung kéo cả task nhiều ngày, kéo xuyên tuần, calendar integration hay các chức năng ngoài thiết kế và thứ tự thẻ đã thống nhất.