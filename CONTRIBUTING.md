# Đóng góp cho weekdam

Bạn có thể mở Issue để báo lỗi hoặc đề xuất tính năng, hoặc fork repository và gửi Pull Request. Với lỗi giao diện, hãy ghi trình duyệt, kích thước màn hình và các bước tái hiện; dùng dữ liệu mẫu khi đính kèm ảnh hoặc backup.

## Chạy cục bộ

Yêu cầu Node.js 24 LTS và npm.

```sh
git clone https://github.com/hieunm2008/weekdam.git
cd weekdam
npm ci
npm run dev
```

Chế độ Guest hoạt động khi chưa cấu hình Firebase. Để bật đồng bộ với project Firebase của bạn, xem [README](README.md#bật-đồng-bộ-và-deploy) và `.env.example`. Giữ cấu hình cá nhân trong `.env` đã được Git ignore.

## Kiểm tra trước khi gửi Pull Request

```sh
npm test
npm run build
```

Khi thay đổi tương tác, chạy thêm `npm run test:e2e` với Chrome đã cài. Khi thay đổi rules hoặc đồng bộ, chạy `npm run test:rules` và `npm run test:sync`; các lệnh này dùng Firebase Emulator và cần Java 21+. Xem README để biết cấu hình và các bộ kiểm thử.

Giữ tương thích dữ liệu offline, backup và cả giao diện Việt/Anh khi thay đổi tính năng liên quan. Không đưa credentials, service-account key hoặc dữ liệu người dùng vào commit.

Các đóng góp mã nguồn gốc được gửi theo [MIT License](LICENSE). Giữ nguyên giấy phép và ghi nhận của bên thứ ba trong [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
