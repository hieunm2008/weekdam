# weekdam — glass mockups v1

Ngày tạo: 09/10/2026. Trạng thái: **Hieu đã duyệt mockup và yêu cầu bắt đầu triển khai**. Tiến độ tại `IMPLEMENTATION.md`; phạm vi đã chốt tại `PLAN.md`.

Các ảnh được tạo bằng Imagegen built-in. Đây là mockup tĩnh với dữ liệu mẫu; không chứng minh chức năng kéo/thả hay animation đã được triển khai. Sau khi được duyệt, source app được triển khai theo `PLAN.md`; bằng chứng kiểm thử và trạng thái deploy nằm tại `IMPLEMENTATION.md`.

## Bộ ảnh được chọn

| Ảnh | Màn hình | Quan sát thiết kế |
|---|---|---|
| `desktop-light.png` | Bảng tuần desktop | 7 cột mở, rail hẹp, thẻ kính riêng, tiêu đề căn trái; hôm nay đánh dấu bằng đường nhấn nhỏ |
| `android.png` | Một ngày Android | Tab ngày rõ, thẻ rộng, navigation dưới; bộ điều khiển vừa tay |
| `task-editor.png` | Editor | Một dialog kính, fields rõ và các bước dạng hàng; footer lưu/hủy rõ |
| `stats.png` | Thống kê | Metric strip, biểu đồ đơn giản, heatmap; màu ấm trung tính |
| `weeks.png` | Lịch tuần | Danh sách thẻ ngang, tiến độ và trạng thái cùng hàng |
| `desktop-dark.png` | Bảng tuần tối | Nền than ấm, chữ ngà và kính tối; bố cục giữ cùng bản sáng |

## Brief/prompt chung

UI mockup phẳng, nhìn chính diện, độ phân giải cao, không khung thiết bị hoặc collage. Planner cá nhân weekdam, nhãn tiếng Việt đúng dấu. Nền kem `#F4F0E8`, chữ than `#252521`, chữ phụ xám ấm `#69675F`, sans gọn kiểu Inter. Chất liệu kính trắng bán trong suốt vừa phải, viền sáng mảnh, bóng mềm, bo 14px. Chuyển sắc ivory/xám ấm nhẹ phía sau; không neon, không gradient xanh/tím, không ảnh marketing, không nhiều khung kính lồng nhau. Icon rail hẹp, primary button than đen, thẻ có checkbox, tên việc, project và metadata gọn.

## Prompt theo màn hình

- Desktop sáng: 7 cột T2–CN, tuần 5–11/10/2026, hôm nay T6 9/10, tiến độ 38% = 9/24 đơn vị; việc học tập, Tiếng Anh và cá nhân. Thẻ hoàn thành giữ vị trí. Một đường chèn nhẹ minh họa việc xếp thẻ.
- Android: tái bố cục theo bản desktop, một ngày với 7 tab, ba thẻ: Viết báo cáo tuần, Ôn từ vựng, Dọn bàn học; navigation Kế hoạch/Thống kê/Lịch tuần. Không ép sidebar desktop vào điện thoại.
- Editor: Sửa công việc, project Học tập, deadline 09/10/2026 17:00, ghi chú, hai bước Tổng hợp số liệu / Viết bản tổng kết, chọn T6 và độ khó Vừa/Khó. Footer Xóa công việc/Hủy/Lưu thay đổi.
- Thống kê: 6 tuần đã kết thúc, trung bình 61%, best 86%, streak 3. Tổng kế hoạch 88, hoàn thành 54; các cặp planned/done 12/6, 14/12, 16/5, 12/8, 18/12, 16/11 từ 24/8 tới 28/9. Phân bổ ngày 12/14/10/16/18/10/8. Heatmap chỉ là minh họa hình thức; khi code phải dùng dữ liệu và 365 ngày rolling từ domain hiện có.
- Lịch tuần: tuần hiện tại đang mở 9/24; sáu tuần lịch sử khớp số liệu mẫu Thống kê, progress 69/67/67/31/86/50%. Mỗi hàng có range, progress, status và Xem.
- Dark: chuyển bảng tuần sáng sang nền `#171816`, thẻ tối bán trong suốt, chữ `#F2EFE8`, chữ phụ `#BDB8AD`; giữ toàn bộ bố cục và nội dung.

## Chi tiết cần giữ khi chuyển sang code

- Ảnh là chuẩn hình thức sau khi được duyệt; nội dung thực tế tiếp tục lấy từ dữ liệu app và i18n.
- Giữ hình dạng icon nguồn của app khi recolor; glyph W trong ảnh chỉ là cách minh họa.
- Route Lịch tuần phải highlight icon archive, không highlight icon Plan như biến thể ảnh hiện tại.
- Không chuyển biểu đồ minh họa thành dữ liệu hardcode. Không thêm dropdown thời gian vào Stats.
- Kéo toàn thân vùng không tương tác; trên Android nhấn giữ, có grip cho bàn phím. Thứ tự tự do từng ngày cần trường lưu riêng và sync theo kế hoạch đã chốt.
- Tooltip/focus, contrast, hit area 44px, reduced motion, fallback blur và responsive phải được kiểm tra trên frontend thật sau bước duyệt.
- Khi triển khai ở cột 168px, menu thẻ đặt ở góc dưới bên phải để tên việc và nhãn project/bước có đủ chỗ. Vùng chạm checkbox/menu vẫn độc lập và đủ 44px; đây là điều chỉnh bố cục từ mockup có menu ở góc trên.

Mở `index.html` qua static server để xem/switch cả sáu mockup. Các PNG cũng mở trực tiếp được.
