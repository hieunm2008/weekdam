# Kiểm chứng giao diện Pro

## Cách chạy

```powershell
node --test tools/serve-dist.test.mjs
npm run test:e2e -- --workers=1 --output=.tmp/full-ui-results-production --reporter=line
```

`playwright.config.ts` build bản production vào `.tmp/dist-ui`, với `VITE_USE_FIREBASE_EMULATORS=false` và `VITE_FIREBASE_PRO_SANDBOX=false`, rồi phục vụ bằng `tools/serve-dist.mjs` trên `127.0.0.1:4173`. Hai cờ này tắt Firebase trong bộ guest UI kể cả khi workspace đã có Web config cloud. Build được tách khỏi `dist` của sync suite để hai lệnh không ghi đè tài sản của nhau; trên máy ít bộ nhớ vẫn cần chạy tuần tự để Chrome và Java Emulator không cạnh tranh bộ nhớ.

Server phục vụ cả URL SPA (`/pricing`, `/app`) và MIME của JS/CSS/font/icon/manifest; trả 404 cho asset không tồn tại, chặn đường dẫn thoát thư mục build, hỗ trợ HEAD và dùng `Cache-Control: no-cache`. Các kiểm thử server dùng HTTP thực trên localhost. Server production giúp kiểm tra được service worker và reload offline; dev server không tạo service worker production.

## Phạm vi kiểm tra

`tests/e2e/pro.spec.ts` tạo ảnh của bảng giá và đủ năm công cụ trên desktop 1440×900 và mobile 390×844, với bốn tổ hợp Việt/sáng, Việt/tối, Anh/sáng, Anh/tối. Mỗi ảnh kiểm tra trang không tràn ngang và PNG có đúng chiều rộng viewport. Bộ kiểm thử còn kiểm tra:

- Lựa chọn giá năm được giữ qua CTA sang `/app?plan=year#pro`.
- Guest xem được mẫu và cấu hình; thao tác chạy ôn thi bị đưa sang quản lý gói, giữ nguyên đầu vào và không ghi kế hoạch.
- Nút CTA bảng giá đạt tương phản văn bản tối thiểu 4,5:1 ở sáng/tối.
- Duyệt lần lượt năm công cụ bằng Tab và Enter trong hai tổ hợp ngôn ngữ/giao diện.
- Không yêu cầu Notification chỉ vì mở màn hình cấu hình.

Các test planner/calendar/Pomodoro/website hiện có tiếp tục chạy cùng suite; không thay assertion của các tính năng Free để làm kết quả xanh.

Các tương tác có đăng nhập, checkout, áp dụng năm công cụ và đồng bộ được kiểm tra riêng trong `tests/sync-e2e/pro-ui.spec.ts` và `pro-sync.spec.ts` bằng Auth/Firestore Emulator. Các kết quả đó được ghi tại [FIREBASE-VALIDATION.md](FIREBASE-VALIDATION.md).

## Nhật ký lần chạy

- Kiểm thử server: 2/2 đạt sau khi quan sát test thất bại trước khi thêm server và tùy chọn thư mục build riêng.
- Lần chạy production đầu với hai worker đồng thời sync suite đã gặp lỗi cấp phát bộ nhớ Node, Chrome target/GPU crash. Đã hủy bằng Ctrl+C của session kiểm thử; không coi lần này là kết quả nghiệm thu UI. Chạy lại tuần tự với một worker trước khi chốt kết quả.
- Lần chạy tuần tự cuối: **130 đạt, 10 bỏ qua theo thiết bị, exit 0**, trong 4,7 phút. Log và ảnh tại `.tmp/validation-final/ui-results` và `ui.log`. Ảnh desktop/mobile đã kiểm tra trực tiếp.

Chưa có nghiệm thu Google provider, cloud Firebase hay thiết bị vật lý. Ma trận viewport trong Chrome không thay thế kiểm tra trên điện thoại thật; xem [checklist cloud](ACCEPTANCE.md).
