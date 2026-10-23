# Nghiệm thu Android — giao diện kính mờ

Trạng thái: **chờ kết quả từ thiết bị thật**. Ngày 10/10/2026 Hieu trả lời **“Chưa thử”** cho chuỗi nghiệm thu bản mới. Xác nhận Android của bản trước ngày 09/10/2026 không được dùng để nghiệm thu thứ tự thẻ mới.

1. Mở PWA weekdam đang cài, có mạng. Bấm **Cập nhật** nếu có thông báo. Xác nhận thẻ kính mờ, tab ngày và thanh điều hướng dưới. Trên desktop và Android đăng nhập cùng Google account, đợi **Đã đồng bộ**.
2. Chọn tuần đang mở và một n0gày có ít nhất ba thẻ; có thể dùng thẻ thử thuộc hai project. Nhấn giữ vùng project/metadata của thẻ khoảng 250ms, kéo trước/sau thẻ khác. Kiểm tra thẻ nguồn mờ, điểm chèn, thứ tự mới và desktop nhận đúng thứ tự. Vuốt nhanh vẫn cuộn bình thường.
3. Tắt Wi-Fi và dữ liệu di động. Đổi thứ tự hai thẻ khi offline, đợi thông báo **Đã lưu thay đổi**. Đóng PWA, mở lại từ icon trong lúc vẫn offline; thứ tự vừa đổi phải còn.
4. Bật mạng và đợi **Đã đồng bộ**. Desktop phải nhận đúng thứ tự, không nhân đôi thẻ và không thay đổi project của thẻ.

Chỉ xác nhận hoàn tất sau khi thực hiện đủ chuỗi này trên Android thật. Có thể trả lời ngắn “Đã thử và thành công”; nếu có lỗi, ghi bước lỗi và kết quả quan sát. Model điện thoại và Android/Chrome version hữu ích khi cần debug nhưng không bắt buộc để ghi nhận một ca thành công. Không cần cung cấp mật khẩu hoặc token.

Kiểm thử Chrome mobile emulation và Auth/Firestore Emulator đã cung cấp bằng chứng phần mềm riêng; chúng không phải bằng chứng thiết bị thật.
