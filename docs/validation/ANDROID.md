# Nghiệm thu Android thật

Trạng thái: chưa thực hiện trên thiết bị vật lý. Hosting đã deploy tại https://weekdam-hieu-2026.web.app; browser smoke không chứng minh cài PWA hay sync thật trên Android.

## Chuẩn bị

1. Trong Firebase Console của `weekdam-hieu-2026`, mở Authentication → Get started nếu có → Sign-in method → Google → Enable, chọn email hỗ trợ và Save. Giữ Spark, không bật billing.
2. Mở URL trên desktop, đăng nhập Google. Sao lưu Guest qua Cài đặt → Xuất JSON trước khi chọn gộp hoặc dùng cloud nếu app hỏi.
3. Trên Android dùng Chrome, mở cùng URL và đăng nhập cùng Google account. Đợi trạng thái “Đã đồng bộ”.

## Cài đặt và tương tác

1. Chọn Cài ứng dụng trong app nếu xuất hiện, hoặc menu Chrome → Cài ứng dụng/Thêm vào màn hình chính. Mở từ icon mới và xác nhận giao diện standalone.
2. Đổi vi/en và sáng/tối/theo hệ thống. Đóng, mở lại; lựa chọn và tuần đang xem phải được giữ.
3. Trên desktop, tạo project `Android acceptance` và task nhỏ với hai subtasks ở hai ngày, độ khó 1 và 3. Android phải nhận cùng dữ liệu và tải 4 đơn vị sau khi đồng bộ.
4. Trên Android, đánh dấu subtask trọng số 1; desktop phải hiện 1/4 và 25%. Thử kéo subtask sang tab ngày và menu chuyển ngày, kiểm tra desktop nhận thay đổi. Đánh dấu lại để bỏ hoàn thành nếu cần; đây là dữ liệu kiểm thử riêng.

## Offline và reconnect

1. Mở app online ít nhất một lần. Tắt Wi-Fi và dữ liệu di động trên Android.
2. Sửa ghi chú subtask và đánh dấu hoàn thành khi offline. UI phải báo offline/lưu cục bộ.
3. Đóng app, mở lại từ icon trong lúc vẫn offline. Giao diện và thay đổi vừa lưu phải còn.
4. Bật lại mạng. Chờ “Đã đồng bộ”; desktop phải nhận cùng ghi chú và trạng thái, không nhân đôi task. Không coi biểu tượng có mạng là bằng chứng server đã nhận.
5. Đăng xuất trên Android. Guest không được hiển thị dữ liệu chỉ thuộc account. Đăng nhập lại, dữ liệu cloud phải trở lại.

## Ghi nhận kết quả

Ghi model điện thoại, Android/Chrome version, thời gian thử, từng bước đạt/chưa đạt và lỗi quan sát. Bằng chứng cần có: app mở standalone, thay đổi còn sau offline restart, và desktop nhận thay đổi sau reconnect. Không ghi mật khẩu, token hay mã xác thực. Chỉ chuyển acceptance sang hoàn tất sau khi có kết quả thực tế.
