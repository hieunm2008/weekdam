# Firebase riêng cho weekdam Pro demo

Phát triển local dùng Emulator `demo-weekdam-pro`. Bản cloud thử nghiệm riêng đã deploy tại [weekdam.web.app](https://weekdam.web.app); xem [bằng chứng cấu hình](pro/CLOUD-SETUP.md). Hosting site `weekdam` trong `firebase.json` thuộc project `weekdam-pro-demo-2026`. Không triển khai vào `weekdam-hieu-2026`. Cả frontend và lệnh `npm run deploy` đều từ chối project cũ; `.firebaserc` mặc định là project cloud mới, còn wrapper Emulator luôn chỉ định project `demo-weekdam-pro` rõ ràng.

## Phát triển và kiểm thử local

1. Cài Node theo phiên bản dự án và Java 21 trở lên. Có thể đặt bản Java portable trong `.tools/jdk/<ten-ban-java>/bin/java.exe`; runner tự phát hiện.
2. `npm ci`, sao chép `.env.example` thành `.env.local` và giữ `VITE_USE_FIREBASE_EMULATORS=true`. Để trống project ID hoặc dùng `demo-weekdam-pro`.
3. Chạy `npm run emulators`, rồi `npm run dev` trong terminal khác.
4. `npm test`, `npm run test:rules`, `npm run test:sync`, `npm run build`.

Auth Emulator dùng cửa sổ đăng nhập Google giả lập. Việc này không kiểm chứng Google provider thực tế. Cần nghiệm thu cloud ở mục dưới trước khi báo demo được nghiệm thu hoàn toàn.

## Tạo sandbox cloud

Người quản lý Firebase tạo một project **mới, riêng cho đồ án**:

1. Thêm Web app và lấy cấu hình công khai (API key, auth domain, project ID, app ID).
2. Tạo Firestore database, bật Authentication → Google provider và chọn email hỗ trợ.
3. Thêm domain Hosting của sandbox và domain demo tùy chỉnh vào Authentication → Authorized domains. Thêm `localhost` nếu cần thử cloud từ máy local.
4. Tạo `.env.production.local` với bốn biến Firebase trong `.env.example`, thêm `VITE_USE_FIREBASE_EMULATORS=false` và `VITE_FIREBASE_PRO_SANDBOX=true`.
5. `npm run firebase -- use --add`, chọn đúng project mới, đặt alias `default`. Kiểm tra project CLI và `VITE_FIREBASE_PROJECT_ID` giống nhau.
6. Chạy `node tools/validate-deploy.mjs` để kiểm tra cấu hình. Kiểm tra này không upload gì.
7. Sau khi cấu hình đúng và có quyền triển khai, chạy `npm run deploy`. Lệnh build trước khi upload Hosting/rules/indexes.

Không đặt service-account key hoặc thông tin thanh toán trong biến VITE. Các biến VITE xuất hiện trong bundle công khai.

## Dữ liệu quyền demo

- `users/{uid}/demoBilling/current`: quyền hiện tại, hạn sử dụng, dấu đã dùng thử.
- `users/{uid}/demoReceipts/{checkoutId}`: receipt chỉ tạo một lần, không sửa/xóa; bao gồm thành công, thất bại và hủy.
- Cả hai tách khỏi kế hoạch, backup, merge và Undo. Quyền đọc/ghi giới hạn đúng UID.
- Đây là **quyền demo do client quản lý**, không phải hệ thống cấp quyền thanh toán an toàn cho sản phẩm có thu tiền. Checkout không nhập thẻ/ngân hàng và không thu tiền.
- Mỗi lần checkout dùng một ID giữ nguyên khi thử lại. Firestore transaction đọc receipt trước khi tạo quyền; receipt đã tồn tại sẽ trả lại kết quả cũ. UI chỉ thành công sau khi transaction commit.
- Dùng thử bảy ngày một lần. Gia hạn cộng một tháng/năm lịch theo giờ Việt Nam từ ngày muộn hơn giữa hiện tại và hạn cũ; cuối tháng được kẹp về ngày cuối tháng đích. Không tự gia hạn.
- Chỉ dùng trial/checkout khi online. Cache quyền nằm theo UID và chỉ cập nhật từ dữ liệu server xác nhận hoặc transaction thành công. Logout/đổi tài khoản hủy listener và bỏ kết quả UI đang chờ của tài khoản trước.

## Nghiệm thu cloud bắt buộc

Thử Google login thật trên hai trình duyệt/thiết bị với cùng tài khoản: dùng thử → reload → nâng cấp mô phỏng → dùng đủ năm công cụ → mở thiết bị thứ hai và kiểm tra quyền, hạn dùng, receipt và dữ liệu kế hoạch. Kiểm tra đổi tài khoản giữa checkout, thất bại/hủy, thử lại cùng ID, offline/reconnect, hết hạn và gia hạn. Không kết luận Google login hoặc sync cloud đạt chỉ từ kết quả Emulator.
