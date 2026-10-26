# Hướng dẫn quay video demo và phỏng vấn weekdam

Tài liệu thao tác dành cho nhóm thực hiện đồ án. Ngày biên soạn: 24/10/2026.

## 1 Đầu ra cần chuẩn bị

Video thành phẩm dài tối đa 3 phút; kịch bản dưới đây dài 2 phút 55 giây, chừa 5 giây dự phòng. Video cần thể hiện vấn đề có dẫn chứng thực tế, giao diện hoặc prototype và cách khách hàng sử dụng. Thu hai cuộc phỏng vấn thật để làm căn cứ cho báo cáo; đưa hai người vào video, mỗi người khoảng 15 giây.

Phỏng vấn và khảo sát là hai hoạt động khác nhau. Báo cáo cần ít nhất 15 phản hồi khảo sát hợp lệ, hai cuộc phỏng vấn và ít nhất hai insight từ dữ liệu. Có thể mời hai người được phỏng vấn tự trả lời thêm biểu mẫu; chỉ tính vào số khảo sát khi thực tế họ đã trả lời và phản hồi hợp lệ.

| Vai trò | Việc cần làm |
| --- | --- |
| Điều phối và người hỏi | Hẹn người tham gia, xin phép ghi hình, đặt câu hỏi, chọn phát biểu đúng bối cảnh. |
| Người quay và thao tác | Kiểm tra tiếng, quay phỏng vấn, ghi màn hình, chuẩn bị dữ liệu và chạy thử luồng. |
| Người ghi nhận và dựng | Ghi mã PV01/PV02, mốc thời gian, tổng hợp bằng chứng; ghép cảnh, lời dẫn và phụ đề. |

Nhóm ít người có thể kiêm nhiệm vai trò. Lưu tệp theo tên dễ tìm: PV01_goc, PV02_goc, demo_onthi, demo_lich, demo_pomodoro, demo_baocao, loi_dan và video_nop. Giữ bản quay gốc để đối chiếu khi chọn trích đoạn.

## 2 Chuẩn bị môi trường và dữ liệu

Mở ứng dụng, chọn tiếng Việt và giao diện sáng hoặc tối nhất quán. Dùng tài khoản thử riêng; đăng nhập và kích hoạt quyền Pro trước buổi quay. Chạy thử việc tính kế hoạch, áp dụng và mở báo cáo ngay trên môi trường sẽ ghi hình. Không cần đưa quá trình đăng nhập vào video 3 phút.

Nếu bản cloud chưa chạy trọn luồng, dùng Auth/Firestore Emulator theo mục Chuẩn bị chạy local trong docs/pro/DEMO.md. Khi quay local, gắn nhãn “Prototype dùng Auth/Firestore Emulator”. Đề môn học cũng chấp nhận mockup; nếu chỉ quay giao diện mẫu thì gọi rõ là minh họa và hướng dẫn phần sử dụng đã chạy được. Việc kiểm tra đăng nhập Google và hai thiết bị thật là một công việc kỹ thuật riêng.

### Dữ liệu cho cảnh ôn thi

D là ngày quay, tính theo giờ Việt Nam. Điền trước các trường để dành thời gian quay cho kết quả và thao tác chính.

| Trường | Giá trị chuẩn bị |
| --- | --- |
| Môn học hoặc kỳ thi | Ôn cuối kỳ Kỹ năng nghề nghiệp |
| Ngày bắt đầu | D cộng 1 ngày; tránh chọn ngày đã qua. |
| Ngày thi | D cộng 7 ngày. |
| Số phút mỗi buổi | 50 phút. |
| Nội dung 1 | Tổng hợp kiến thức, 50 phút. |
| Nội dung 2 | Luyện tình huống, 50 phút. |
| Giờ rảnh | Chọn các thứ xuất hiện trong khoảng ngày trên, 19:00-21:00. Với tài khoản thử trống có thể chọn cả bảy thứ để dễ chạy thử. |
| Điều kiện trước khi áp dụng | Tổng yêu cầu 100 phút, đã xếp đủ 100 phút, còn thiếu 0; kế hoạch không có tuần đã kết thúc hoặc lịch bận chặn hết giờ. |

Hai nội dung đều 50 phút giúp có hai buổi 50 phút nếu đủ giờ. Ngày và giờ cụ thể do ứng dụng tính theo dữ liệu đang có. Sau khi áp dụng, mở đúng tuần chứa các buổi vừa tạo; chúng có thể nằm ở tuần kế tiếp so với ngày quay.

### Dữ liệu cho cảnh báo cáo

Cách nhanh là dùng nút “Thêm dữ liệu demo” trong Pro → Quản lý gói sau khi có quyền Pro. Dữ liệu hiện tại tạo ví dụ IELTS với lịch 50 phút và một phiên Pomodoro dừng sớm có 22 phút tập trung. Chỉ bấm khi muốn thêm dữ liệu mẫu vào tài khoản thử. Khi quay báo cáo, chọn môn IELTS và khoảng ngày chứa ngày quay; xem lại các số thực tế trên màn hình.

Đặt nhãn “Dữ liệu mẫu” cho cảnh này. Đây là ví dụ báo cáo riêng, không phải kết quả học của hai buổi ôn thi vừa tạo. Lời dẫn chuyển cảnh có thể nói: “Ở một ví dụ IELTS đã chuẩn bị, báo cáo đối chiếu thời gian lên lịch với thời gian tập trung.” Nếu dùng dữ liệu của một phiên thử thật thay thế, nêu đúng thời lượng thực tế đã lưu.

## 3 Các cảnh màn hình cần quay

### Cảnh A Giới thiệu sản phẩm

Mở trang giới thiệu hoặc bảng giá. Quay 3-5 giây tên weekdam và một màn hình kế hoạch. Nêu ngắn giá trị là lập kế hoạch học tập theo tuần. Nếu hiện bảng giá, ghi “Giá giả thuyết để khảo sát”; nếu hiện checkout, giữ nhãn “Thanh toán mô phỏng - không thu tiền”.

### Cảnh B Tạo kế hoạch ôn thi

1. Vào Pro → Ôn thi tự động.
2. Nhập bộ dữ liệu ở mục 2; quay lướt các trường hoặc cắt bớt thời gian gõ.
3. Bấm “Tính kế hoạch”. Dừng vài giây ở phần xem trước, cho thấy đủ 100 phút và các buổi dự kiến.
4. Bấm nút áp dụng kế hoạch một lần. Mở lịch tuần tương ứng và chỉ ra hai buổi vừa được thêm.
5. Nếu thiếu phút hoặc có lỗi, điều chỉnh dữ liệu rồi tính lại trước khi quay bản chính. Mọi thông báo thành công trong video phải đến từ thao tác thực tế hoặc được ghi rõ là mockup.

### Cảnh C Tập trung bằng Pomodoro

Mở Pomodoro, chọn công việc nếu cần rồi bấm bắt đầu. Quay 5-8 giây cho thấy bộ đếm đang chạy, sau đó có thể chuyển sang cảnh khác. Không cần chờ 25 phút trong buổi quay. Nếu dừng sớm, gọi đúng là phiên dừng sớm; việc mở Pomodoro không tự đánh dấu công việc hoàn thành. Không gắn thời gian mẫu của cảnh báo cáo vào phiên ngắn vừa quay.

### Cảnh D Xem báo cáo học tập

Vào Pro → Báo cáo học tập, chọn khoảng ngày và môn của dữ liệu định trình bày, rồi bấm “Tạo báo cáo”. Chỉ ra “Phút đã lên lịch”, “Phút tập trung” và “Chênh lệch”. Dữ liệu mẫu IELTS mặc định là 50 phút kế hoạch và 22 phút tập trung nếu tài khoản thử chưa có dữ liệu trùng hoặc bổ sung. Nếu số thực tế khác, đọc số đang hiển thị và kiểm tra bộ lọc; không sửa hình để khớp lời dẫn.

Chỉ buổi có giờ được tính vào phút kế hoạch; thời gian nghỉ không phải phút tập trung. Có thể quay thêm thao tác Xuất CSV hoặc In/Lưu PDF nếu còn thời gian. Báo cáo thời gian không được diễn giải thành bằng chứng tăng điểm thi.

### Cảnh dự phòng khi chưa có quyền Pro

Quay một luồng Free đã chạy được: tạo công việc → đặt giờ → mở Pomodoro → xem tiến độ. Sau đó giới thiệu hình hoặc giao diện mẫu Ôn thi tự động và Báo cáo Pro, ghi rõ “Minh họa prototype”. Lời dẫn nói công cụ “được đề xuất” hoặc “được minh họa” nếu chưa chạy được; không dựng thao tác áp dụng hoặc thanh toán thành công. Giữ hai đoạn phỏng vấn và tổng thời lượng như kịch bản bên dưới.

## 4 Kịch bản dựng video 2 phút 55 giây

Lời dẫn là mẫu để nhóm điều chỉnh. Các ô trong dấu ngoặc vuông chỉ được thay bằng thông tin thực đã thu; không đọc nguyên placeholder trong bản nộp.

| Thời gian | Hình và thao tác | Lời dẫn hoặc âm thanh |
| --- | --- | --- |
| 0:00-0:20 | Tên dự án, tình huống học tập; hiện một dẫn chứng có nguồn hoặc kết quả nhóm đã kiểm tra. | “Khi phải phối hợp nhiều môn học và deadline, sinh viên lập kế hoạch thế nào? Từ [dẫn chứng thật, ngày hoặc nguồn], nhóm nghiên cứu weekdam, công cụ lập kế hoạch học tập theo tuần.” |
| 0:20-0:50 | PV01 khoảng 15 giây, PV02 khoảng 15 giây; có phụ đề và mã người tham gia. | Dùng phát biểu thật về vấn đề hoặc trải nghiệm. Giữ ý nghĩa và bối cảnh; không viết sẵn câu trả lời để người tham gia đọc. |
| 0:50-1:05 | Tên weekdam, bảng tuần hoặc bảng giá, chuyển sang Pro. | “weekdam kết nối việc cần học, thời gian thực hiện và tiến độ. Bản Free có kế hoạch tuần và Pomodoro; Pro bổ sung các công cụ lập kế hoạch và báo cáo. Đây là prototype.” |
| 1:05-1:45 | Dữ liệu ôn thi đã điền; tính; xem đủ 100 phút; áp dụng; mở tuần có hai buổi. | “Tôi nhập hai nội dung, mỗi nội dung 50 phút, ngày thi và giờ rảnh. Ứng dụng tạo bản xem trước để kiểm tra trước khi áp dụng. Hai buổi sau đó xuất hiện trong lịch tuần.” |
| 1:45-2:15 | Chỉ một buổi trong lịch; mở Pomodoro, chọn việc và bắt đầu. | “Khi học, người dùng chọn công việc và bắt đầu Pomodoro. Bộ đếm ghi nhận thời gian tập trung; người dùng tự cập nhật việc đã hoàn thành. Cảnh quay chỉ minh họa thao tác bắt đầu.” |
| 2:15-2:40 | Báo cáo ví dụ IELTS; nhãn dữ liệu mẫu; chỉ hai chỉ số và chênh lệch. | “Ở ví dụ IELTS với dữ liệu mẫu, báo cáo đối chiếu phút đã lên lịch và phút tập trung. Người dùng nhìn lại mức thực hiện để điều chỉnh kế hoạch. Đây không phải kết quả thử nghiệm hiệu quả học tập.” |
| 2:40-2:55 | Màn hình kết, link dùng thử hoặc khảo sát đã mở được. | “Bước tiếp theo của nhóm là kiểm chứng nhu cầu và mức sẵn sàng trả tiền. Bạn có thể xem prototype và góp ý qua [liên kết thật]. Cảm ơn bạn đã theo dõi.” |

Không cần đọc hết lời dẫn nếu nói tự nhiên không kịp. Rút gọn câu, giữ ý chính và chừa 1-2 giây cho người xem nhìn kết quả. Phần trống, nhập liệu và chờ tải có thể cắt; giữ diễn biến thao tác dễ hiểu. Nếu dùng cảnh tăng tốc, ghi “Tua nhanh” và giữ âm thanh rõ.

## 5 Cách thực hiện hai cuộc phỏng vấn

Mời hai sinh viên phù hợp với phân khúc nhóm chọn. Mỗi buổi khoảng 8-10 phút; bản nộp chỉ lấy khoảng 15 giây mỗi người. Có thể cùng một người hỏi cả hai buổi để cách giới thiệu nhất quán.

### Xin phép trước khi quay

Lời nói gợi ý: “Nhóm đang làm đồ án về cách sinh viên lập kế hoạch học tập. Bạn có đồng ý ghi hình, ghi âm và cho nhóm dùng một trích đoạn trong video nộp môn học không? Bạn có thể bỏ qua câu hỏi hoặc dừng bất cứ lúc nào. Bạn muốn xuất hiện bằng tên, tên viết tắt hay mã người tham gia?”

Ghi lại phạm vi đồng ý: thu âm, thu hình, bài nộp môn học và việc đăng công khai nếu có. Nếu người tham gia không đồng ý xuất hiện trong video, nhóm cần tư liệu phỏng vấn khác có sự đồng ý phù hợp; không quay hoặc đăng vượt phạm vi đã thống nhất.

| Thời gian buổi phỏng vấn | Việc thực hiện |
| --- | --- |
| 0:00-0:40 | Giới thiệu, xin đồng ý, kiểm tra tiếng. |
| 0:40-3:00 | Hỏi tình huống và cách xử lý hiện tại trước khi giới thiệu lợi ích sản phẩm. |
| 3:00-6:00 | Giới thiệu prototype ngắn, giao một tác vụ, quan sát người tham gia thao tác. |
| 6:00-8:40 | Hỏi phản hồi, ý định sử dụng và giá giả thuyết. |
| 8:40-9:30 | Xác nhận ý hiểu; xin một câu tóm tắt bằng lời người tham gia; cảm ơn. |

### Câu hỏi trước khi giới thiệu sản phẩm

1. “Lần gần nhất bạn chuẩn bị cho một kỳ thi hoặc tuần nhiều deadline, bạn lập kế hoạch thế nào?”
2. “Lần gần nhất kế hoạch của bạn có thay đổi hoặc không thực hiện được không? Nếu có, hãy kể lại cách bạn xử lý; nếu không, cách nào đang giúp kế hoạch ổn định?”
3. “Bạn đang dùng công cụ nào? Phần nào hữu ích, phần nào khiến bạn mất công?”

Hỏi thêm khi câu trả lời quá chung: “Bạn kể một ví dụ cụ thể được không?” hoặc “Lần gần nhất chuyện đó xảy ra là khi nào?”. Đừng bắt đầu bằng câu như “Bạn có thấy lập kế hoạch rất khó không?”, vì câu đó gợi sẵn câu trả lời.

### Cho người tham gia thử một tác vụ

Nói: “Đây là prototype, các thao tác thanh toán là mô phỏng và không thu tiền. Bạn hãy nhập một môn học, hai nội dung cần ôn, ngày thi và giờ rảnh; xem phương án trước khi áp dụng.” Nếu chỉ dùng Free, giao tác vụ tạo một việc và đặt nó vào lịch.

Để người tham gia tự thao tác trước. Ghi lại chỗ họ dừng, câu hỏi, lỗi và hỗ trợ đã cung cấp. Nếu người hỏi phải hướng dẫn, ghi “hoàn thành có hỗ trợ”, không báo cáo thành thao tác độc lập. Có thể gợi mở: “Bạn đang tìm gì ở bước này?” thay vì chỉ ngay nút cần bấm.

### Câu hỏi sau khi dùng thử

4. “Bước nào bạn làm dễ dàng, bước nào chưa hiểu hoặc gặp vướng?”
5. “Trong tình huống thực tế của bạn, bạn sẽ dùng hoặc không dùng công cụ này vì sao?”
6. “Với giá giả thuyết 29.000 đồng/tháng, bạn có cân nhắc Pro không? Vì sao?”
7. “Nếu là 249.000 đồng/năm, lựa chọn của bạn thay đổi thế nào?”
8. “Bạn chọn Free, Pro tháng, Pro năm hay không dùng? Điều gì cần thay đổi trước khi quyết định?”

Hỏi giá sau khi người tham gia hiểu sản phẩm; nêu hai mức giá là giả thuyết. Có thể đổi thứ tự hỏi tháng và năm giữa hai buổi. Ghi cả ý kiến không thích, không muốn dùng hoặc không muốn trả tiền.

### Chọn đoạn phỏng vấn để đưa vào video

Chọn mỗi người một ý cụ thể dài khoảng 12-15 giây, ưu tiên tình huống thật hoặc phản ứng có lý do sau khi thử. Nếu câu trả lời dài, hỏi “Bạn có thể tóm tắt ý vừa nói trong một câu theo cách của bạn không?”. Không đưa lời đáp mẫu, không yêu cầu khen sản phẩm. Có thể cắt khoảng lặng và từ đệm, giữ phát biểu đúng ý; thêm nhãn PV01/PV02 và phụ đề khớp lời nói.

## 6 Ghi nhận và chuyển thành nội dung báo cáo

Mẫu biên bản cho từng người: Mã PV [điền]; ngày và bối cảnh [điền]; đối tượng [điền]; phạm vi đồng ý [điền]; cách lập kế hoạch hiện tại [điền]; tình huống cụ thể [điền]; trích dẫn nguyên văn [điền]; thao tác quan sát [điền]; hỗ trợ đã cung cấp [điền]; mốc trong tệp gốc [phút:giây]; điều nhóm cần kiểm tra lại [điền].

| Cột phân tích | Cách điền |
| --- | --- |
| Bằng chứng | Ghi mã PV và phát biểu hoặc hành vi; với khảo sát ghi câu hỏi, số người và mẫu số. |
| Insight | Giải thích nhu cầu hoặc nguyên nhân được bằng chứng gợi ra. Chỉ rõ giới hạn của nhận định. |
| Điều chỉnh | Nêu nhóm thay đổi màn hình, luồng, tính năng, phân khúc hoặc giả thuyết giá ở điểm nào. |
| Kiểm tra lại | Giao tác vụ hoặc hỏi bổ sung để xem thay đổi có giải quyết vấn đề không. |

Hoàn thiện ít nhất hai insight dựa trên dữ liệu thật. Không biến ý kiến của hai người thành tỷ lệ đại diện cho toàn bộ sinh viên. Với khảo sát, lưu tổng số nhận được, số bị loại, lý do loại và số hợp lệ; chỉ công bố phần trăm sau khi xác định đúng mẫu số.

## 7 Quay và dựng bản cuối

Quay ngang 16:9; nếu thiết bị cho phép, xuất 1920×1080. Trước buổi chính, quay thử 10 giây và nghe lại tiếng. Chọn nơi yên, ánh sáng đủ, giữ máy cố định. Khi ghi màn hình, đóng thông báo và các tab không phục vụ demo; tránh hiện mật khẩu hoặc thông tin riêng của tài khoản thử.

Quay màn hình thành từng đoạn riêng rồi thu lời dẫn; không cần vừa bấm vừa đọc tất cả. Dừng 1-2 giây trước và sau mỗi thao tác chính để dễ cắt. Với phỏng vấn, giọng người tham gia cần rõ; nhạc nếu dùng phải đủ nhỏ để nghe được lời nói và là nguồn nhóm có quyền sử dụng.

Ghép theo timeline mục 4. Đặt phụ đề ngắn, tương phản, không che nút hoặc thông tin cần xem. Gắn nhãn “Dữ liệu mẫu”, “Prototype” và môi trường Emulator đúng cảnh. Xem lại bản xuất hoàn chỉnh, không chỉ bản trong công cụ dựng.

### Checklist trước khi nộp

- [ ] Video không quá 180 giây, kể cả mở đầu và màn hình kết.
- [ ] Có vấn đề và dẫn chứng đã kiểm tra; có giao diện hoặc prototype; có cách khách hàng dùng.
- [ ] Có hai người được phỏng vấn thật trong video và biên bản hai cuộc phỏng vấn cho báo cáo.
- [ ] Tiếng nghe rõ, phụ đề đúng, cắt ghép giữ đúng ý người nói.
- [ ] Đã xóa placeholder; số liệu và lời dẫn khớp màn hình hoặc được ghi rõ là minh họa.
- [ ] Giá là giả thuyết; thanh toán mô phỏng; dữ liệu mẫu và môi trường thử được ghi nhãn.
- [ ] Link video và khảo sát mở được với tài khoản khác hoặc cửa sổ chưa đăng nhập.
- [ ] Báo cáo có link video, ngày thực hiện, mã PV và nguồn dữ liệu liên quan.

Nguồn đối chiếu nội bộ: hai PDF yêu cầu học phần; báo cáo weekdam đã soạn; docs/pro/DEMO.md; src/pro/ExamTool.tsx; src/pro/ReportsTool.tsx; src/pro/demoData.ts; docs/pro/ACCEPTANCE.md. Hướng dẫn dựa trên mã nguồn và tài liệu hiện có; nhóm chạy thử lại luồng trước ngày quay để phù hợp môi trường thực tế.
