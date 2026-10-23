# Phát hành Pomodoro — 12/10/2026

Project production: `weekdam-hieu-2026`. Người dùng yêu cầu phát hành bản web hiện tại sau khi xem bản local.

- Website: https://weekdam-hieu-2026.web.app/
- Pomodoro: https://weekdam-hieu-2026.web.app/app#pomodoro

## Thứ tự phát hành

Các lệnh sau đã kết thúc với exit code 0. Rules/indexes được phát hành xong trước khi bắt đầu deploy Hosting:

```sh
node tools/validate-deploy.mjs
npm test
npm run test:rules
npm run build
npm run firebase -- deploy --only firestore:rules,firestore:indexes --project weekdam-hieu-2026 --non-interactive
npm run firebase -- deploy --only hosting --project weekdam-hieu-2026 --non-interactive
```

Cấu hình frontend khớp project CLI, không bật Emulator. Unit: 105 ca đạt; Firestore Emulator: 9 ca đạt. Build TypeScript/Vite/PWA đạt, 40 mục precache. Bundle không chứa fixture đăng nhập Emulator. Cảnh báo kích thước chunk Firebase hiện có vẫn còn.

Lượt unit đầu trong sandbox lỗi khi đọc cache SSR trong thư mục tạm; chạy lại cùng mã ngoài sandbox đạt toàn bộ 105 ca. Không sửa mã ứng dụng trong quá trình phát hành.

## Kiểm tra website public

```sh
npm run test:production -- docs/design/pomodoro-v1/production
node tools/check-pomodoro-production.cjs https://weekdam-hieu-2026.web.app
```

Hai lượt kiểm tra đều exit 0. [Báo cáo website](production/production-smoke.json) xác nhận Guest CRUD, hoàn thành và lưu qua reload, PWA offline/edit/restart/reconnect, thứ tự thẻ, mobile, manifest, auth handler, Firestore từ chối đọc chưa đăng nhập và popup Google đến trang Google Accounts rồi hủy đăng nhập đúng trạng thái.

[Báo cáo Pomodoro](production/pomodoro-production-smoke.json) xác nhận mở trực tiếp `/app#pomodoro`, 25:00 mặc định, tập trung tự do, chuông bật và thông báo tắt; bắt đầu bằng bàn phím, đếm thời gian thực, pause/reload/resume; thanh nhỏ trên bảng/lịch và quay lại; dừng lưu đúng một phiên partial, giữ qua reload, không tăng chu kỳ và không tính thời gian pause. Bố cục English/dark ở 320px không tràn ngang. Worker thông báo và manifest đúng; không có page errors ở desktop/mobile.

Các kiểm tra dùng Guest trong browser context tạm. Không nhập credentials, đăng nhập cloud, ghi dữ liệu cloud, xin quyền thông báo hoặc thay đổi đồng hồ/thời lượng phiên. Âm thanh/thông báo khi khóa màn hình trên Android vật lý vẫn cần nghiệm thu trên thiết bị thật.

## Đối chiếu bundle

Ngày 12/10/2026, HTTP 200 và từng byte trên production khớp file trong `dist` cho cả bốn endpoint:

| File                         | SHA256                                                             |
| ---------------------------- | ------------------------------------------------------------------ |
| `/index.html`                | `6b4068e1f7e86b690c51ffadd2c58e79170245cd33161481284ff3f2b66fa1b5` |
| `/sw.js`                     | `c758eb86d174e7a757a0e903065c76a6184afbdbf84497e5a9e9d7281cbacb5e` |
| `/pomodoro-notifications.js` | `de268adae307deba7d474c707df1f27f54e9d70d2b51bc3f2dd3988f1a318966` |
| `/manifest.webmanifest`      | `5d142c0c893d58ee919c8d336763b0876b491ee7a068ada843bf228a1adc0bb5` |

Ảnh production nằm trong [thư mục screenshots](production/screens). Chưa commit hoặc push Git; các thay đổi sẵn có trong workspace được giữ lại.
