# Kiểm tra landing page và hướng dẫn

Ngày kiểm tra: 11/10/2026, Asia/Saigon. Phần dưới ghi nhận kiểm tra cục bộ trước phát hành. Bản này đã deploy và kiểm tra website public ngày 11/10/2026; xem [bằng chứng phát hành](DEPLOYMENT.md).

## Chức năng và bản build

- `npm run build`: thành công, bao gồm TypeScript và service worker. Warning chunk Firebase SDK lớn hơn 500 kB vẫn có; SDK không nằm trong lượt tải landing ban đầu.
- `npm test -- --fsModuleCache --fsModuleCachePath node_modules/.cache/vitest-workspace`: 6 file, 52 test đạt. Workspace module cache tránh vấn đề file tạm của sandbox trên máy này.
- `npm run test:e2e -- --workers=2`: 90 test đạt, 10 skip theo điều kiện desktop/mobile đã có; tổng 100 trường hợp. Chạy trên bản build production bằng Chrome, bao gồm planner, lịch giờ, kéo thả, backup/import, undo, offline/PWA, các trang mới và điều hướng.
- 28 trường hợp mới trên desktop/mobile: CTA landing, thử preview bảng/lịch và đánh dấu hoàn thành, tìm kiếm hướng dẫn, ngôn ngữ, accessibility, reduced motion, bảo toàn công việc khi mở hướng dẫn/quay lại, dark theme, link cùng URL, fragment/reload/mở tab mới và khoảng cách sticky header.
- Các test CTA/preview/search/language và các lỗi điều hướng đã xác nhận thất bại trước khi triển khai/sửa, sau đó xác nhận đạt.
- Prettier và `git diff --check`: đạt.

## Giao diện

Kiểm tra hai trang `/` và `/guide` ở 1440×900 sáng/Việt, 1366×768 tối/Anh, 390×844 sáng/Việt và 320×844 tối/Anh. 8 tổ hợp đều không tràn ngang, không có lỗi JavaScript và không có lỗi axe WCAG 2 A/AA, 2.1 AA. Chrome mô phỏng viewport mobile; đây không phải nghiệm thu trên Android thật.

Ảnh full page được lưu trong `screens/`. Audit contrast dùng reduced motion để đo trạng thái màu ổn định; animation được kiểm tra riêng. Chữ nhỏ được chỉnh tương phản, heading anchor có scroll margin 110px, các liên kết giữ thao tác mở tab mới.

Lighthouse mobile chạy trên preview production cục bộ. Báo cáo JSON cùng thư mục ghi nhận hiệu năng và layout của từng trang; đây là đo trong môi trường máy này, không phải benchmark website public.

## Trạng thái tích hợp

`/` là landing, `/guide` là hướng dẫn, `/app` là planner. Manifest mở `/app` và giữ identity `/`. Dữ liệu preview độc lập với kế hoạch. Liên kết từ planner chờ lưu dữ liệu trước khi chuyển trang. Metadata theo trang/ngôn ngữ và `robots.txt` hợp lệ được bổ sung.
