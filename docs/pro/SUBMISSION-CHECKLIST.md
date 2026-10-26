# Đối chiếu yêu cầu nộp đồ án weekdam

Ngày rà soát: 24/10/2026, giờ Việt Nam.

Đây là danh sách việc cần hoàn thiện để nộp đồ án môn Kỹ năng nghề nghiệp. Không phải báo cáo kinh doanh hoàn chỉnh hoặc xác nhận sản phẩm đã nghiệm thu. Kết quả dựa trên hai PDF và các tệp trong workspace, không bao gồm tài liệu nhóm có thể đang giữ ở nơi khác.

## 1. Kết luận chính

weekdam đã có ứng dụng, ảnh giao diện, logo, màu và font để làm nguyên liệu mô tả/demo. Tài liệu hiện tại cũng có kịch bản video, bộ câu hỏi khảo sát, bản nháp BMC và công thức tài chính. Phần cần ưu tiên là thu bằng chứng người dùng và chuyển các khung này thành báo cáo kinh doanh có dữ liệu, kế hoạch cụ thể, dự toán và video nộp được.

Hai PDF đều là tài liệu yêu cầu; `Project Report.pdf` là quy định và mẫu bìa, không phải báo cáo nhóm đã viết. Chưa tìm thấy bản báo cáo hoàn chỉnh hoặc video nộp bài trong phạm vi rà soát.

Đề môn học chấp nhận mockup/prototype, không bắt buộc lập trình hoàn chỉnh sản phẩm hoặc thành lập doanh nghiệp. Các gate kiểm thử kỹ thuật nội bộ của weekdam không tự trở thành điều kiện nộp môn học.

Quy ước trạng thái:

- **Có nguyên liệu:** có tệp/ảnh/nội dung sử dụng được, còn cần đưa vào hồ sơ nộp.
- **Có khung:** đã có hướng dẫn hoặc giả thuyết, chưa có dữ liệu hoặc bản hoàn thiện.
- **Chưa thấy:** không tìm thấy bằng chứng đáp ứng trong các tệp đã rà; không có nghĩa nhóm chưa làm ở nơi khác.
- **Cần làm rõ:** hai tài liệu ghi khác nhau hoặc thông tin chưa được cung cấp.

## 2. Bảng đối chiếu chi tiết

Mã nguồn yêu cầu: **ĐA** = [đề đồ án][DA], **BC** = [quy định báo cáo][BC]. Số trang là số trang PDF, tính từ 1.

| Mã | Yêu cầu từ tài liệu | Hiện trạng và bằng chứng | Việc cần bổ sung / đầu ra để kiểm tra |
| --- | --- | --- | --- |
| A01 | Thông tin nhóm: MSSV, họ tên, điểm mạnh/yếu, vai trò, phần việc (BC tr.1) | **Chưa thấy** bảng thông tin nhóm. Tài liệu đóng góp mã nguồn không thay phần này. | Bảng thành viên với thông tin thật và phần việc cụ thể. |
| A02 | Đánh giá % công việc được giao/toàn bộ, % hoàn thành tốt, nhận xét (BC tr.1) | **Chưa thấy**. | Bảng đánh giá từng thành viên theo các cột mẫu; thống nhất trong nhóm. |
| A03 | Kinh nghiệm rút ra khi làm việc nhóm (BC tr.1) | **Chưa thấy** bản tổng kết của nhóm. | Viết từ quá trình thật: cách phối hợp, vướng mắc, cách giải quyết và bài học. |
| B01 | Tên dự án, lĩnh vực, mục tiêu (BC tr.1) | **Có nguyên liệu:** tên weekdam và mô tả weekly planner trong [README][R]. | Chốt tên đề tài, phạm vi khách hàng và mục tiêu kinh doanh cho mục B.I của báo cáo. |
| B02 | Vấn đề thực tế, giải pháp hiện có, lý do chọn ý tưởng (BC tr.1) | **Có khung:** [kịch bản video][D] còn để chỗ điền dẫn chứng tại dòng 32. | Viết vấn đề cụ thể của phân khúc đã chọn và lý do giải pháp hiện tại chưa đáp ứng. |
| B03 | Ít nhất 3 bằng chứng về vấn đề (BC tr.1) | **Chưa thấy** bộ 3 dẫn chứng có nguồn. Tài liệu nghiên cứu UI không chứng minh nhu cầu khách hàng. | Tập hợp ít nhất 3 bằng chứng có nguồn/ngày/bối cảnh: kết quả khảo sát, trích dẫn phỏng vấn, tình huống quan sát hoặc số liệu có nguồn. |
| B04 | Sản phẩm, tính năng/quy trình cốt lõi, lợi ích, điểm khác biệt (BC tr.1) | **Có nguyên liệu:** [README][R], [yêu cầu Pro][REQ] và [khung demo][D]. | Viết theo lợi ích khách hàng và một luồng sử dụng rõ ràng; chọn tính năng phục vụ vấn đề đã có bằng chứng. |
| B05 | Tên sản phẩm + tagline không quá 10 từ (BC tr.1) | **Có nguyên liệu:** weekdam; UI có câu “Một tuần rõ ràng. Một ngày nhẹ hơn.”, 8 từ theo khoảng trắng ([LandingPage][LP], dòng 358-359). | Chọn tagline chính thức và trình bày nhất quán trong báo cáo, cover, video. |
| B06 | Màu chủ đạo (BC tr.1) | **Có nguyên liệu:** nền `#F4F0E8`, chữ `#252521`, màu phụ trong [glass.css][CSS], dòng 4-9. | Đưa bảng màu có mã HEX vào mục bộ nhận diện, dựa trên giao diện đang dùng. |
| B07 | Logo hoàn thiện và bảng màu logo (BC tr.1) | **Có nguyên liệu:** [icon vector][ICON] và PNG 192/512; biểu tượng W trắng trên nền `#252521`. | Trình bày logo/wordmark và bảng màu logo trong báo cáo. Chưa thấy trang nhận diện được đóng gói riêng. |
| B08 | Font sản phẩm (BC tr.2) | **Có nguyên liệu:** Inter Variable trong [fonts.css][FONT], dòng 3. | Ghi tên font, minh họa cách dùng trong bộ nhận diện. Font báo cáo vẫn theo quy định Times New Roman. |
| B09 | 1 cover Facebook dùng bộ nhận diện (BC tr.2) | **Chưa thấy** tệp cover Facebook. | Tạo một ảnh cover giới thiệu dự án, dùng logo, màu, font và tagline đã chốt. |
| B10 | Ít nhất 3 hình mockup hoặc sơ đồ các bước sử dụng (BC tr.2) | **Có nguyên liệu:** nhiều mockup weekdam trong [thiết kế giao diện][DESIGN] và ảnh ứng dụng thật; ba ví dụ đã xem trực tiếp ở mục 3. | Chọn ít nhất 3 hình rõ, đặt số hình/chú thích và giải thích luồng. Nếu tập trung Pro, ưu tiên hình Pro hiện tại. |
| B11 | So sánh ít nhất 2 đối thủ/giải pháp thay thế, khác biệt có căn cứ (BC tr.2) | **Có một phần:** nghiên cứu một đối thủ Beaverplans trong [SESSION][SESSION] và [FEATURES][FEATURES]. | Bổ sung ít nhất một giải pháp thay thế nữa; lập bảng so sánh cùng tiêu chí, có nguồn và thời điểm. |
| C01 | Phân khúc khách hàng mục tiêu (BC tr.2) | **Có khung:** [DEMO][D], dòng 72 nêu sinh viên ôn thi/ngoại ngữ/lập trình. | Chọn phân khúc chính, mô tả phạm vi, bối cảnh và nhu cầu; giải thích bằng dữ liệu thu được. |
| C02 | 1 user persona có tuổi, nhu cầu, hành vi, pain points (BC tr.2) | **Chưa thấy** persona đầy đủ. | Một persona tổng hợp dựa trên dữ liệu; nêu rõ phần còn là giả định. |
| C03 | Bộ câu hỏi khảo sát (BC tr.2) | **Có khung:** [DEMO][D], dòng 55-64 có câu hỏi nhu cầu, công cụ và mức sẵn sàng trả tiền. | Chốt biểu mẫu thu thập, thêm câu sàng lọc phù hợp và lưu bản câu hỏi vào phụ lục. |
| C04 | Tối thiểu 15 phản hồi khảo sát hợp lệ (BC tr.2) | **Chưa có bằng chứng kết quả:** [ACCEPTANCE][ACC], dòng 38 và 42 ghi chưa thu khảo sát/phỏng vấn. | Thu ít nhất 15 phản hồi hợp lệ; giữ dữ liệu gốc, ngày/phương pháp chọn mẫu, tiêu chí loại phản hồi trùng/không phù hợp. |
| C05 | 02 cuộc phỏng vấn ngắn cho báo cáo (BC tr.2) | **Có khung câu hỏi, chưa có kết quả:** [DEMO][D], dòng 46-53; [ACCEPTANCE][ACC], dòng 42. | Thực hiện ít nhất 2 cuộc phỏng vấn thật; giữ biên bản, ngày/bối cảnh và trích dẫn. Hướng dẫn hiện tại nói 1-3 người nên cần chốt mức tối thiểu 2 cho đồ án. |
| C06 | Bảng phân tích kết quả; ít nhất 2 insight và cách điều chỉnh ý tưởng (BC tr.2) | **Chưa thấy** bảng kết quả hoặc quyết định dựa trên dữ liệu. | Bảng tổng hợp câu hỏi, số lượng/tỷ lệ trên mẫu hợp lệ; ít nhất 2 nhận định có căn cứ và bảng bằng chứng → insight → điều chỉnh. |
| D01 | BMC đủ 9 ô (BC tr.2) | **Có bản nháp đủ 9 ô:** [DEMO][D], dòng 70-80, nội dung ở mức giả thuyết. | Hoàn thiện BMC để đưa vào báo cáo; đánh dấu giả thuyết và điều chỉnh theo khảo sát. Có thể trình bày bằng bảng hoặc canvas dễ đọc. |
| D02 | Giải thích liên hệ khách hàng - giá trị - doanh thu - chi phí (BC tr.2) | **Có một phần** qua các ô trong [DEMO][D]; chưa thấy đoạn giải thích tổng hợp. | Viết ngắn logic ai dùng, giá trị họ nhận, ai trả tiền và chi phí để cung cấp. Được ghi chưa có doanh thu trong thử nghiệm nếu đúng thực tế. |
| D03 | Kế hoạch từng giai đoạn: mục tiêu, việc, người phụ trách, hạn, nguồn lực, đầu ra, KPI, rủi ro (BC tr.2) | **Có khung:** [DEMO][D], dòng 89 đề xuất 4 tuần, còn yêu cầu nhóm điền tên và mốc thật. | Lập bảng đủ các trường nêu trên với người và ngày cụ thể. Tiến độ lập trình lịch sử không thay kế hoạch kinh doanh. |
| D04 | Ít nhất 3 rủi ro và biện pháp ứng phó (BC tr.2) | **Có nguyên liệu kỹ thuật** rải rác, chưa thấy bảng rủi ro dự án đáp ứng mẫu. | Bảng ít nhất 3 rủi ro và cách ứng phó; có thể bổ sung cột tác động, người theo dõi. Gắn với khảo sát, thị trường, thực thi hoặc nguồn lực thực tế. |
| D05 | Chi phí đầu tư ban đầu (nếu có), vận hành tháng, giả định giá/số khách/doanh thu (BC tr.2) | **Có khung:** [DEMO][D], dòng 3 có giá giả thuyết; dòng 82-87 có biến và công thức. | Điền giá trị giả định có giải thích/nguồn, chi phí khởi tạo (ghi 0 nếu không phát sinh) và vận hành. Phân biệt tiền chi thực tế với công sức tự đóng góp. |
| D06 | Bảng dự kiến 6-12 tháng, lãi/lỗ đơn giản, nhu cầu vốn (BC tr.2) | **Chưa thấy** bảng theo tháng hoặc con số nhu cầu vốn. | Lập bảng tối thiểu 6 tháng: khách hàng, doanh thu giả định, chi phí, lãi/lỗ và vốn cần; kiểm tra phép tính. Dòng tiền và ba kịch bản là gợi ý bổ sung, không phải yêu cầu tối thiểu của PDF. |
| E01 | Video tối đa 03 phút (ĐA tr.1) | **Có kịch bản 2:55**, [DEMO][D], dòng 28-40; **chưa thấy** video thành phẩm. | Quay, dựng, xuất và kiểm tra tổng thời lượng không quá 180 giây. Kịch bản đúng thời lượng chưa chứng minh video đạt. |
| E02 | Video có vấn đề với dẫn chứng thực tế, giao diện/demo, cách khách hàng dùng (ĐA tr.1-2) | **Có khung:** timeline đã bao phủ, nhưng dẫn chứng còn placeholder tại dòng 32. | Điền bằng chứng thật, quay một hành trình dễ hiểu và giữ rõ ba nội dung sau khi dựng. |
| E03 | Phỏng vấn nhanh 1-3 người trong video (ĐA tr.1) | **Chưa có bằng chứng thực hiện:** [ACCEPTANCE][ACC], dòng 42. | Dùng các cuộc phỏng vấn thật với ít nhất 2 người để đồng thời khớp BC; chèn phần phỏng vấn vào video, không chỉ để đường dẫn ngoài. Điều chỉnh timeline vì hiện chỉ dành 20 giây cho vấn đề và phỏng vấn. |
| F01 | Báo cáo theo mẫu, bìa, mục lục tự động; phần A và B đúng cấu trúc (ĐA tr.2; BC tr.1,4) | **Chưa thấy** bản báo cáo hoàn chỉnh. Hai PDF là tài liệu yêu cầu. | Soạn báo cáo có bìa đúng mẫu, thông tin nhóm, mục lục tự động và nội dung B.I-IV; thêm phụ lục khi cần. |
| F02 | Tiếng Việt hoặc Anh; TNR Unicode 13 pt, giãn dòng 1.5; lề trên 3, dưới 3.5, trái 3.5, phải 2 cm (BC tr.3; ĐA tr.2) | **Chưa thể kiểm** khi chưa có báo cáo nhóm. | Kiểm tra định dạng trên bản soạn và bản xuất cuối; bìa A4 theo mẫu. |
| F03 | Vị trí số trang (ĐA tr.2; BC tr.3) | **Cần làm rõ:** ĐA ghi giữa trên, BC ghi giữa dưới. Không có căn cứ trong hai tệp để xác định tệp nào được ưu tiên. | Kiểm tra thông báo mới nhất trên website môn học hoặc xác nhận với giảng viên trước khi chốt định dạng. |
| F04 | Nộp báo cáo và video trên website môn học (ĐA tr.1) | **Chưa thấy** gói nộp hoặc xác nhận nộp trong workspace; hai PDF không ghi hạn nộp. | Kiểm tra hạn, loại tệp, quyền truy cập link video trên website môn học; nộp và giữ xác nhận. |

## 3. Nguyên liệu có thể dùng ngay

| Nội dung | Tệp đã kiểm tra | Cách dùng |
| --- | --- | --- |
| Mô tả sản phẩm Free/Pro | [README][R], [yêu cầu Pro][REQ] | Viết mục mô tả dự án và chọn tính năng cốt lõi. Các kết quả kiểm thử trong tài liệu là lịch sử, không phải kiểm thử mới của lần rà soát này. |
| Logo | [icon.svg][ICON], [icon-512.png][ICON512] | Dùng asset sẵn có cho bộ nhận diện; bảng màu logo trắng/than. |
| Màu và font | [glass.css][CSS], [fonts.css][FONT] | Trích bảng màu và tên font vào báo cáo. |
| Hình 1: trang giới thiệu weekdam | [ảnh landing tiếng Việt][IMG1] | Minh họa nhận diện, giá trị và tổng quan sản phẩm. |
| Hình 2: lịch theo giờ | [ảnh lịch desktop][IMG2] | Minh họa bước xếp giờ; khi đóng gói, nên thay dữ liệu kiểm thử trong ảnh bằng tình huống học tập dễ hiểu. |
| Hình 3: Pomodoro | [ảnh Pomodoro][IMG3] | Minh họa bước tập trung sau khi lập kế hoạch. |
| Kịch bản video, câu hỏi, BMC, tài chính | [DEMO][D] | Tận dụng khung; bổ sung dữ liệu thật và phần định lượng còn thiếu. |
| Nghiên cứu đối thủ thứ nhất | [SESSION][SESSION], [FEATURES][FEATURES] | Cơ sở cho một cột đối thủ; đây là khảo sát UI tháng 10/2026, chưa có so sánh thị trường đủ 2 giải pháp. |

Ảnh trong `docs/research/screens` là ảnh nghiên cứu Beaverplans. Phân biệt chúng với ảnh weekdam khi chọn hình cho báo cáo.

## 4. Thứ tự hoàn thiện đề xuất

Đây là thứ tự công việc dựa trên phụ thuộc dữ liệu, không phải lịch có hạn nộp đã được giảng viên xác nhận.

| Thứ tự | Việc cần làm | Đầu ra có thể kiểm tra | Phụ thuộc |
| --- | --- | --- | --- |
| 1 | Chốt phân khúc, phạm vi đề tài và bộ câu hỏi; bắt đầu thu dữ liệu | Biểu mẫu khảo sát, lịch phỏng vấn ít nhất 2 người, tiêu chí phản hồi hợp lệ | Nhóm xác nhận đối tượng cần tiếp cận |
| 2 | Thu ít nhất 15 phản hồi hợp lệ và 2 phỏng vấn; tổng hợp bằng chứng | Dữ liệu gốc, bảng phân tích, ít nhất 3 dẫn chứng vấn đề và 2 insight | Công việc 1 |
| 3 | Làm song song thông tin nhóm và bộ nhận diện | Bảng thành viên/đóng góp, persona nháp, tagline, bảng màu/logo/font, cover Facebook, ít nhất 3 hình sản phẩm | Có thể bắt đầu ngay; persona cần cập nhật sau công việc 2 |
| 4 | Hoàn thiện kinh doanh và thực thi | So sánh ít nhất 2 giải pháp, BMC 9 ô, kế hoạch đủ người/hạn/KPI, ít nhất 3 rủi ro | Điều chỉnh theo kết quả công việc 2 |
| 5 | Lập tài chính và soạn báo cáo theo mẫu | Dự toán 6-12 tháng, lãi/lỗ và vốn; bản báo cáo có bìa/mục lục/phụ lục | Công việc 2-4; thông tin thành viên thật |
| 6 | Dựng video, rà hồ sơ và nộp | Video tối đa 3 phút có phỏng vấn thật; báo cáo hoàn chỉnh; link mở được và xác nhận nộp | Bằng chứng thật, demo đã chuẩn bị, thông tin nộp môn học |

## 5. Checklist trước khi nộp

- [ ] Có thông tin thành viên, phân công, đánh giá đóng góp và kinh nghiệm nhóm.
- [ ] Có ít nhất 3 bằng chứng về vấn đề, gắn nguồn và bối cảnh.
- [ ] Có mô tả sản phẩm, lợi ích, khác biệt và ít nhất 3 hình/luồng sử dụng.
- [ ] Có tên, tagline tối đa 10 từ, màu, logo và bảng màu logo, font, 1 cover Facebook.
- [ ] Có so sánh ít nhất 2 đối thủ/giải pháp thay thế với căn cứ.
- [ ] Có phân khúc chính và 1 persona.
- [ ] Có ít nhất 15 phản hồi hợp lệ và 2 cuộc phỏng vấn; khuyến nghị lưu dữ liệu gốc để đối chiếu.
- [ ] Có bảng kết quả, ít nhất 2 insight và cách điều chỉnh ý tưởng.
- [ ] Có BMC đủ 9 ô và giải thích khách hàng - giá trị - doanh thu - chi phí.
- [ ] Có kế hoạch từng giai đoạn đủ mục tiêu, việc, người, hạn, nguồn lực, đầu ra, KPI, rủi ro.
- [ ] Có ít nhất 3 rủi ro và biện pháp ứng phó.
- [ ] Có chi phí đầu tư ban đầu (nếu có), vận hành tháng, giả định kinh doanh, dự toán 6-12 tháng, lãi/lỗ và vốn.
- [ ] Có video tối đa 180 giây, đủ ba nội dung và phỏng vấn 1-3 người; nhóm đã phỏng vấn ít nhất 2 người cho báo cáo.
- [ ] Có báo cáo đúng mẫu bìa, mục lục tự động, phần A/B và định dạng quy định.
- [ ] Đã làm rõ vị trí số trang giữa hai PDF.
- [ ] Đã kiểm tra hạn, định dạng nộp, quyền xem video và lưu xác nhận nộp.

## 6. Giới hạn của lần rà soát

Đã đọc toàn bộ 6 trang PDF, xem ảnh render của các trang và kiểm tra tài liệu dự án, nguồn nhận diện, một số ảnh giao diện cùng danh mục tệp. Không chạy lại ứng dụng, kiểm thử tự động, đăng nhập Google hoặc kiểm tra hai thiết bị trong lần này.

[ACCEPTANCE][ACC] còn ghi nghiệm thu Google thật và hai thiết bị Pro đang chờ. Nếu video trình bày các luồng đó hoạt động thật, cần kiểm chứng trước hoặc lựa chọn nội dung demo có bằng chứng. Việc hoàn tất các gate kỹ thuật này không được hai PDF quy định là điều kiện bắt buộc; mockup/prototype vẫn được chấp nhận.

Giá 29.000đ/tháng và 249.000đ/năm trong tài liệu là giả thuyết để khảo sát; checkout là mô phỏng. Không dùng chúng làm bằng chứng đã có người mua hoặc doanh thu. Khung câu hỏi không thay kết quả khảo sát; nghiên cứu UI đối thủ không thay phản hồi người dùng.

Các tệp ngoài workspace, thông báo mới của môn học, hạn nộp và dữ liệu nhóm chưa cung cấp nằm ngoài kết luận này. Không gán phần trăm hoàn thành vì hai PDF không cung cấp trọng số chấm điểm và chưa có bản nộp đầy đủ để đánh giá.

[DA]: <D:/01_study/SS004.R11.CTTN/CuoiKy/Do an 2026.pdf>
[BC]: <D:/01_study/SS004.R11.CTTN/CuoiKy/Project Report.pdf>
[R]: D:/01_study/SS004.R11.CTTN/CuoiKy/README.md
[D]: D:/01_study/SS004.R11.CTTN/CuoiKy/docs/pro/DEMO.md
[ACC]: D:/01_study/SS004.R11.CTTN/CuoiKy/docs/pro/ACCEPTANCE.md
[REQ]: D:/01_study/SS004.R11.CTTN/CuoiKy/docs/pro/REQUIREMENTS.md
[SESSION]: D:/01_study/SS004.R11.CTTN/CuoiKy/docs/research/SESSION.md
[FEATURES]: D:/01_study/SS004.R11.CTTN/CuoiKy/docs/research/FEATURES.md
[LP]: D:/01_study/SS004.R11.CTTN/CuoiKy/src/components/LandingPage.tsx
[CSS]: D:/01_study/SS004.R11.CTTN/CuoiKy/src/glass.css
[FONT]: D:/01_study/SS004.R11.CTTN/CuoiKy/src/fonts.css
[ICON]: D:/01_study/SS004.R11.CTTN/CuoiKy/public/icon.svg
[ICON512]: D:/01_study/SS004.R11.CTTN/CuoiKy/public/icon-512.png
[DESIGN]: D:/01_study/SS004.R11.CTTN/CuoiKy/docs/design/glass-v1/DESIGN.md
[IMG1]: D:/01_study/SS004.R11.CTTN/CuoiKy/docs/design/landing-v1/screens/landing-1440-light-vi.png
[IMG2]: D:/01_study/SS004.R11.CTTN/CuoiKy/docs/design/landing-v1/production/calendar-desktop.png
[IMG3]: D:/01_study/SS004.R11.CTTN/CuoiKy/docs/design/pomodoro-v1/production/screens/pomodoro-production-desktop-ready.png
