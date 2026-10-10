# Footer dialog — 10/10/2026

Hieu báo lỗi UI hộp Chuyển ngày trên desktop bằng ảnh chụp. Tái hiện cho thấy footer nền đặc bị nằm trong padding của `.modal-body`, lệch vào 22px trên desktop và 16px trên mobile, còn một dải body phía dưới. Các footer lồng trong form cũng dùng cùng CSS nên cùng lỗi.

Sửa bằng padding variables theo breakpoint và negative margins cho footer; bù lại khoảng đệm bên trong để nút vẫn thẳng hàng với field. Nền footer nối sát khung, giữ sticky ở editor dài và theme token sáng/tối. Focus bàn phím vẫn giữ nguyên.

- Regression đã fail đúng chỗ trước sửa (gap 22/16px), sau sửa PASS trên 1440/1366/390/320, light/dark, cả Move day và editor 12 bước có scroll.
- `npm run test:e2e -- --workers=2`: 43 PASS, 7 skip theo thiết bị. Lượt 6 worker gặp Chrome crash khi tạo context trước lúc mở app; không sửa logic app để xử lý lỗi môi trường này.
- Ảnh kiểm tra ở `validation/dialogs/`: desktop sáng/tối 125% và mobile 320px.
- Build production và guard project PASS; Hosting đã phát hành bản CSS mới cùng URL hiện tại. Backend, dữ liệu và thứ tự thẻ không bị sửa bởi bản vá này.

Tổng bằng chứng phần mềm hiện tại: 41 unit + 43 E2E + 4 rules + 8 sync = 96. Nghiệm thu Android thật vẫn riêng biệt và đang chờ theo câu trả lời “Chưa thử”.
