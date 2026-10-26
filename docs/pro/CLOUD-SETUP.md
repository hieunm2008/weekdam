# Firebase thử nghiệm riêng cho weekdam Pro

Ngày cấu hình: **23/10/2026**, múi giờ `Asia/Ho_Chi_Minh`.

Project mới đã được tạo riêng cho bản Pro. Các lệnh trong lần cấu hình này đều chỉ định `--project weekdam-pro-demo-2026`; không thay đổi project `weekdam-hieu-2026`.

| Thành phần | Cấu hình đã đọc lại từ Firebase |
| --- | --- |
| Project ID | `weekdam-pro-demo-2026` |
| Project number | `173704964940` |
| Web app | `weekdam Pro Demo` |
| App ID | `1:173704964940:web:e0ba4c20765d5c36423de9` |
| Auth domain mặc định | `weekdam-pro-demo-2026.firebaseapp.com` |
| Hosting site hiện tại | `weekdam` → `https://weekdam.web.app` |
| Firestore database | `(default)` |
| Firestore mode / edition | `FIRESTORE_NATIVE` / `STANDARD` |
| Firestore location | `asia-southeast1` (Singapore) |
| Free tier của database | `true` theo API Firestore Admin |

Web SDK config công khai được tải bằng Firebase CLI và lưu trong file local bị Git bỏ qua `.tmp/cloud-config.json`. Đây là cấu hình ứng dụng phía trình duyệt; không chứa service account, refresh token, OAuth client secret hoặc khóa thanh toán. Root của dự án chỉ đưa cấu hình này vào môi trường build cloud sau khi kiểm thử UI bản Emulator kết thúc.

## Bằng chứng provision

Các lệnh sau đã hoàn tất thành công với Firebase CLI `15.33.0`, dùng phiên CLI đã đăng nhập sẵn:

```powershell
npm run firebase -- apps:create WEB 'weekdam Pro Demo' --project weekdam-pro-demo-2026 --non-interactive --json
npm run firebase -- apps:sdkconfig WEB '1:173704964940:web:e0ba4c20765d5c36423de9' --project weekdam-pro-demo-2026 --json
npm run firebase -- firestore:databases:create '(default)' --location asia-southeast1 --edition standard --project weekdam-pro-demo-2026 --non-interactive --json
npm run firebase -- firestore:databases:get '(default)' --project weekdam-pro-demo-2026 --json
```

Firestore API chưa bật ở lần tạo database đầu tiên. API `firestore.googleapis.com` được bật bằng helper `ensure` của chính `firebase-tools`, chỉ cho project mới; Service Usage đã trả `ENABLED`. Lần retry sau khi API truyền trạng thái thành công lúc **19:37 giờ Việt Nam**. Lệnh `databases:get` sau đó xác nhận database thực tế có cấu hình như bảng trên.

Không liên kết Cloud Billing account, không nâng cấp Blaze, không bật PITR hay CMEK. Kiểm tra billing qua `GET projects/weekdam-pro-demo-2026/billingInfo` chưa lấy được trạng thái vì **Cloud Billing API đang tắt**. Không bật Cloud Billing API chỉ để kiểm tra. Vì vậy bằng chứng chi phí hiện có là cờ `freeTier: true` của Firestore và việc không thực hiện thao tác liên kết billing; chưa dùng kết quả này để khẳng định một trạng thái billing toàn project mà API chưa xác nhận.

## Google provider và phát hành sandbox

Google provider được bật bằng cấu hình khai báo của Firebase CLI, theo [hướng dẫn chính thức](https://firebase.google.com/docs/auth/configure-providers-cli). File tái lập là `firebase.pro-auth.json`; lệnh đã chạy thành công chỉ cho project mới:

```powershell
npm run firebase -- deploy --only auth --project weekdam-pro-demo-2026 --config firebase.pro-auth.json --non-interactive
```

Đã đọc lại API Auth: Google có `enabled: true`, OAuth client đã có, authorized domains gồm `weekdam-pro-demo-2026.firebaseapp.com`, `weekdam-pro-demo-2026.web.app`, `localhost`. Chỉ ghi trạng thái công khai vào `.tmp/cloud-auth-status.json`, không ghi OAuth secret hoặc token.

Web config công khai nằm trong `.env.production.local` bị Git bỏ qua. CLI mặc định trong `.firebaserc` là `weekdam-pro-demo-2026`; alias `emulator` và test runner vẫn dùng `demo-weekdam-pro`. `node tools/validate-deploy.mjs` và build cloud đã đạt; `npm run deploy` phát hành thành công Hosting, rules và indexes. Không build fixture Emulator vào bundle cloud.

URL đã mở kiểm tra được trang bảng giá và giữ lựa chọn năm sang mục Pro: [demo](https://weekdam-pro-demo-2026.web.app), [pricing](https://weekdam-pro-demo-2026.web.app/pricing), [Pro](https://weekdam-pro-demo-2026.web.app/app#pro).

## Phần nghiệm thu còn nối tiếp

Deploy và cấu hình provider chưa xác nhận người dùng đã đăng nhập Google thật hoặc dữ liệu đã đi qua hai thiết bị thật. Người dùng yêu cầu **để nghiệm thu cloud sau**; giữ các bước còn lại sau đây:

1. Mở Hosting bằng Chrome, thực hiện Google login thật, dùng thử/nâng cấp mô phỏng, cả năm công cụ và reload.
2. Đăng nhập cùng tài khoản trên thiết bị khác, kiểm tra quyền, receipts, mẫu và lịch; thử offline/reconnect, hết hạn/gia hạn và đổi tài khoản.
3. Ghi kết quả thực tế vào [ACCEPTANCE.md](ACCEPTANCE.md), gồm mọi bước cần tài khoản Google hoặc thiết bị vật lý do người dùng thực hiện.

Không dùng kết quả Emulator để thay cho các bước cloud trên. Tài liệu kiểm thử local ở [FIREBASE-VALIDATION.md](FIREBASE-VALIDATION.md); hướng dẫn thiết lập tổng quát ở [pro-firebase-sandbox.md](../pro-firebase-sandbox.md).

## Cập nhật bản sửa ngày 24/10/2026

Đã phát hành bản dọn inbox cũ khi Pro hết hạn, sau gate **206 unit / 19 sync** đạt. `npm run deploy` exit 0, cùng project `weekdam-pro-demo-2026`; log `.tmp/validation-final/deploy-expiry-prune.log`. Đọc HTML public của `/pricing` trả **HTTP 200** và tham chiếu đúng entry vừa build `/assets/index-ChHlPp3C.js`; bằng chứng `.tmp/validation-final/published-entry.json`. Đây chỉ là kiểm tra nội dung Hosting đã phát hành, không phải nghiệm thu Google login hoặc giao dịch/dữ liệu cloud theo tài khoản.

## Domain weekdam.web.app — 24/10/2026

Theo yêu cầu người dùng, đã tạo Hosting site `weekdam`, liên kết với Web app hiện tại trong cùng project thử nghiệm:

```powershell
npm run firebase -- hosting:sites:create weekdam --project weekdam-pro-demo-2026 --app 1:173704964940:web:e0ba4c20765d5c36423de9
node tools/validate-deploy.mjs
npm run build
npm run firebase -- deploy --only hosting --project weekdam-pro-demo-2026 --non-interactive
```

`firebase.json` đặt `hosting.site` thành `weekdam`, nên những lần deploy tiếp theo dùng domain mới. Các lệnh trên exit 0. Site cũ vẫn tồn tại; project, Web app và dữ liệu Firestore giữ nguyên.

Đã thêm hai redirect URI của site mới vào `firebase.pro-auth.json` và deploy Auth. Helper `getAuthDomains`/`updateAuthDomains` của Firebase CLI thêm domain, giữ các domain cũ rồi đọc lại API: Google provider vẫn bật; authorized domains gồm `weekdam-pro-demo-2026.firebaseapp.com`, `weekdam-pro-demo-2026.web.app`, `localhost`, `weekdam.web.app`, `weekdam.firebaseapp.com`. Auth domain trong Web SDK vẫn là `weekdam-pro-demo-2026.firebaseapp.com`.

Kiểm tra HTTPS lúc **08:07 giờ Việt Nam**: [trang chủ](https://weekdam.web.app), [bảng giá](https://weekdam.web.app/pricing), [ứng dụng](https://weekdam.web.app/app#pro) đều HTTP 200, dùng đúng entry `/assets/index-ChHlPp3C.js`. Entry và bundle App public khớp hoàn toàn file build local; bundle App dùng project `weekdam-pro-demo-2026`. Bằng chứng local: `.tmp/validation-final/deploy-weekdam-hosting.log`, `weekdam-auth-domains.json`, `weekdam-published-entry.json`. Nghiệm thu Google login thật và hai thiết bị vẫn để sau theo yêu cầu trước đó.
