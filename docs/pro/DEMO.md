# weekdam Pro — hướng dẫn demo đồ án

Hướng dẫn thực hành mới: [Quay video và phỏng vấn từng bước](VIDEO-INTERVIEW-GUIDE.md), gồm dữ liệu chuẩn bị, lời dẫn, câu hỏi và checklist.

Đây là prototype với **thanh toán mô phỏng — không thu tiền**. Giá **29.000đ/tháng, 249.000đ/năm** là giả thuyết cần khảo sát. Không thu thập thông tin thẻ/ngân hàng, không tự gia hạn.

## Chuẩn bị chạy local

Theo [hướng dẫn Firebase sandbox](../pro-firebase-sandbox.md):

1. Có Node theo dự án và Java 21 trở lên. Chạy `npm ci`.
2. Sao chép `.env.example` thành `.env.local` (nếu đã có file thì lưu bản hiện tại trước). Giữ `VITE_USE_FIREBASE_EMULATORS=true`; để trống `VITE_FIREBASE_PROJECT_ID` hoặc đặt `demo-weekdam-pro`. Không dùng `weekdam-hieu-2026`.
3. Terminal thứ nhất:

   ```powershell
   npm run emulators
   ```

4. Terminal thứ hai:

   ```powershell
   npm run dev
   ```

5. Mở địa chỉ Vite in trong terminal; vào `/pricing`, rồi `/app#pro`. Auth Emulator mở giao diện Google giả lập; tạo/chọn tài khoản thử. Auth ở `127.0.0.1:9099`, Firestore ở `127.0.0.1:8080`.
6. Chạy kiểm tra trước khi quay: `npm test`, `npm run test:rules`, `npm run test:sync`, `npm run build`. Hai lệnh rules/sync tự khởi chạy Emulator và tự phát hiện Java portable trong `.tools/jdk/<ten-ban-java>/bin/java.exe` nếu chưa đặt `JAVA_HOME`. Dừng Emulator đang chạy trước khi dùng hai lệnh này để tránh trùng cổng.

Dữ liệu demo chỉ được thêm khi chủ động bấm **Thêm dữ liệu demo** trong Quản lý gói sau khi có quyền Pro. Dùng tài khoản thử sạch để quay; không xóa hoặc sửa dữ liệu tài khoản thật để dựng demo. Mở trước một cửa sổ thứ hai cùng tài khoản để kiểm tra reload/đồng bộ.

## Kịch bản video 2 phút 55 giây

Kịch bản nộp môn học dành 30 giây cho hai người phỏng vấn và một hành trình học tập cốt lõi. Xem [hướng dẫn chi tiết](VIDEO-INTERVIEW-GUIDE.md) để chuẩn bị dữ liệu, câu hỏi, lời dẫn và cách dựng.

| Thời gian | Nội dung cần quay |
| --- | --- |
| 0:00–0:20 | Vấn đề và dẫn chứng thật đã kiểm tra, tên dự án. |
| 0:20–0:50 | Hai người được phỏng vấn thật, mỗi người khoảng 15 giây; phụ đề giữ đúng ý. |
| 0:50–1:05 | Giới thiệu weekdam, Free/Pro và nhãn prototype. |
| 1:05–1:45 | Ôn thi: hai nội dung 50 phút, ngày bắt đầu sau ngày quay, ngày thi sau 7 ngày, giờ rảnh; tính, kiểm tra đủ 100 phút rồi áp dụng và mở đúng tuần. |
| 1:45–2:15 | Chỉ buổi trong lịch; mở Pomodoro, chọn công việc, bắt đầu. Cảnh ngắn không được mô tả là đã hoàn thành phiên 25 phút. |
| 2:15–2:40 | Báo cáo ví dụ IELTS; ghi rõ dữ liệu mẫu tách với kế hoạch ôn thi vừa tạo. Nút Thêm dữ liệu demo hiện tạo lịch 50 phút và phiên tập trung 22 phút; kiểm tra bộ lọc và số thực tế. |
| 2:40–2:55 | Bước kiểm chứng tiếp theo và link dùng thử/khảo sát đã mở được. |

Chuẩn bị tài khoản thử, quyền Pro và dữ liệu trước khi quay; cắt thời gian gõ và chờ tải. Dùng môi trường nhóm đã chạy thử. Khi dùng Emulator, ghi rõ **Prototype dùng Auth/Firestore Emulator**. Chỉ trình bày đăng nhập Google và đồng bộ hai thiết bị như kết quả thật khi đã kiểm chứng. Nếu mới dùng giao diện mẫu, gọi đúng là minh họa/mockup và quay thêm luồng Free đã chạy được.

## Phỏng vấn và khảo sát

Thực hiện **ít nhất 2 cuộc phỏng vấn thật** để khớp mẫu báo cáo; video có thể dùng 2 người, nằm trong yêu cầu 1–3 người. Thu thập bằng chứng trước khi chốt phát biểu về vấn đề. Xin đồng ý ghi nhận, ẩn danh, lưu ngày/bối cảnh, trích dẫn nguyên văn ngắn và quan sát thao tác. Mẫu ghi: mã người tham gia → tình huống gần nhất → cách xử lý hiện tại → khó khăn → công cụ đang dùng → tính năng muốn thử → bằng chứng hoặc trích dẫn. Không suy rộng tỷ lệ từ mẫu nhỏ.

Các câu hỏi phỏng vấn:

1. Trong lần ôn thi gần nhất, bạn lập kế hoạch như thế nào? Hãy kể một lần lịch không theo được và hậu quả cụ thể.
2. Bạn mất bao lâu mỗi tuần để chia nội dung, thêm lịch lặp hoặc chuyển việc? Có thể cho xem một ví dụ đã ẩn thông tin riêng không?
3. Bạn đang dùng giải pháp nào, phần nào hiệu quả, phần nào khiến bạn bỏ dùng?
4. Trong năm công cụ Pro, công cụ nào có ích nhất/ít nhất cho tình huống đó? Sau khi thử, bạn có hoàn thành được việc bạn mong muốn không?

Khảo sát sau khi thử prototype (ghi rõ không thu tiền):

1. Bạn học/lập lịch bao nhiêu buổi mỗi tuần? Tần suất trễ deadline hoặc bỏ kế hoạch trong 30 ngày qua?
2. Chọn tối đa hai nhu cầu: chia kế hoạch ôn thi, lịch lặp, mẫu tái sử dụng, báo cáo, nhắc deadline; thêm “không có nhu cầu”.
3. Với mỗi nhu cầu đã chọn, mức hữu ích 1–5 và giải pháp hiện tại là gì?
4. Bạn có thử Pro 7 ngày không? Sau demo, điều gì khiến bạn quyết định dùng hoặc không dùng?
5. Với **29.000đ/tháng**, bạn: chắc chắn mua / có thể mua / chưa chắc / có thể không / chắc chắn không? Vì sao?
6. Với **249.000đ/năm**, hỏi cùng thang đo. Sau đó hỏi chọn Free / tháng / năm / không dùng. Đảo thứ tự hai câu giá giữa các người trả lời để giảm ảnh hưởng thứ tự.
7. Mức giá tháng tối đa bạn tự nguyện trả là bao nhiêu? Giá nào khiến bạn cảm thấy quá đắt, hoặc nghi ngờ chất lượng vì quá rẻ?
8. Bạn cần bằng chứng hoặc thay đổi nào trước khi trả tiền? Có đồng ý tham gia một buổi thử tiếp theo không? Chỉ thu liên hệ khi người tham gia chủ động đồng ý.

Báo cáo **ý định mua**, chưa gọi là doanh thu, khách trả tiền hay tỷ lệ chuyển đổi thực tế. Ghi cỡ mẫu, phương pháp chọn mẫu, ngày thu thập và giới hạn khảo sát.

## Đầu vào cho mô hình kinh doanh và kế hoạch hành động

| Phần Business Model Canvas | Giả thuyết cần điền và cách kiểm chứng |
| --- | --- |
| Phân khúc | Sinh viên tự lập kế hoạch ôn thi/học ngoại ngữ/lập trình; chọn phân khúc chính từ phỏng vấn. |
| Giá trị | Giảm thao tác lập lịch và giúp đối chiếu kế hoạch với học thực tế; đo thời gian hoàn thành tác vụ và tỷ lệ hoàn thành trong buổi thử. |
| Kênh | Nhóm lớp, cộng đồng sinh viên, giới thiệu bạn; ghi chi phí và số người đến thử theo từng kênh. |
| Quan hệ | Hướng dẫn ban đầu, dùng thử 7 ngày, phản hồi trong app; đo tỷ lệ quay lại và lý do rời bỏ. |
| Doanh thu | Free → Pro tháng/năm; giá 29.000đ/249.000đ chỉ là giả thuyết. Không gộp giao dịch mô phỏng vào doanh thu. |
| Nguồn lực | Nhóm phát triển, mã nguồn, Firebase sandbox, dữ liệu phỏng vấn đã đồng ý sử dụng. |
| Hoạt động | Bảo trì lịch/đồng bộ, hỗ trợ, thử nghiệm UX, đo nhu cầu và giữ chân. |
| Đối tác | Cộng đồng/lớp học và nhà cung cấp hạ tầng; chỉ ghi đối tác thật nếu đã có thỏa thuận. |
| Chi phí | Hạ tầng, domain, hỗ trợ, nghiên cứu, quảng bá, công phát triển; phân biệt chi tiền và thời gian tự đóng góp. |

Đầu vào tài chính phải có nguồn hoặc nhãn “giả định”: người dùng hoạt động/tháng `A`; tỷ lệ chuyển Pro `c`; tỷ trọng gói năm `y`; số người mua mới/gia hạn/hủy; chi phí cố định `F`; chi phí biến đổi bình quân `v`; chi phí thu hút một người dùng `CAC`; thời gian hỗ trợ và công phát triển. Làm ba kịch bản thận trọng/cơ sở/tích cực, không tự điền thành kết quả thật.

- Người dùng Pro giả định: `P = A × c`.
- Doanh thu quy đổi theo tháng để so sánh: `P × [(1−y) × 29.000 + y × (249.000/12)]`. Tách **tiền thu gói năm** khỏi doanh thu phân bổ theo tháng; mô hình thực tế cần theo cohort/gia hạn.
- Lãi góp giả định/tháng: doanh thu quy đổi − `P × v`; kết quả vận hành giả định: lãi góp − `F`.
- Điểm hòa vốn đơn giản: `F / (giá thu bình quân tháng − v)` nếu mẫu số dương; chưa bao gồm thuế/phí thực tế nếu chưa có dữ liệu. Các khoản thuế, phí và chính sách hoàn tiền chỉ chốt khi nghiên cứu triển khai có thu tiền.

Kế hoạch hành động đề xuất: tuần 1 thực hiện ít nhất 2 cuộc phỏng vấn và xác định giả thuyết ưu tiên; tuần 2 thử năm tác vụ với prototype, ghi thời gian/lỗi/điểm vướng; tuần 3 khảo sát giá và thử kênh tiếp cận; tuần 4 sửa theo bằng chứng, cập nhật BMC và ba kịch bản tài chính. Mỗi việc có người phụ trách, hạn, đầu ra và tiêu chí quyết định tiếp tục/sửa/dừng; nhóm tự điền tên và mốc thật.

## Điều kiện nghiệm thu còn cần môi trường bên ngoài

Emulator không thay thế Google provider hoặc đồng bộ cloud thật. Chỉ triển khai sau khi có **Firebase project thử nghiệm mới** với Web app, Firestore, Google provider và authorized domains; cấu hình `VITE_USE_FIREBASE_EMULATORS=false`, `VITE_FIREBASE_PRO_SANDBOX=true`, bốn biến Web app và CLI project khớp nhau. Xem đầy đủ các bước/guard trong [hướng dẫn sandbox](../pro-firebase-sandbox.md).

Nghiệm thu cuối trên hai thiết bị: **Google login thật → nâng cấp mô phỏng được Firestore xác nhận → sử dụng đủ năm công cụ → reload/đăng nhập thiết bị khác vẫn giữ đúng dữ liệu và Pro**. Thử thêm thất bại/hủy/retry, đổi tài khoản giữa checkout, offline/reconnect và hết hạn/gia hạn. Ghi rõ phần chưa chạy; không suy ra đạt cloud từ test local. Checklist chi tiết báo cáo/nhắc việc ở [REPORTS-REMINDERS.md](REPORTS-REMINDERS.md). Phỏng vấn và kết quả khảo sát phải do nhóm thu thập; tài liệu này không cung cấp kết quả giả.
