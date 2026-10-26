# Firebase Pro — kiểm chứng local, cập nhật 24/10/2026

Môi trường: Windows, Chrome qua Playwright, Firebase Auth/Firestore Emulator `demo-weekdam-pro`, Java portable Eclipse Temurin 21.0.12.1 tại `.tools/jdk/`. Không truy cập hoặc triển khai lên project `weekdam-hieu-2026` trong lần kiểm chứng này.

| Kiểm tra | Kết quả quan sát |
| --- | --- |
| `npm test` | 206/206 unit tests, 24 file, exit 0 ngày 24/10; pool threads và tối đa hai worker |
| `npm run build` | Exit 0 sau cấu hình cloud, TypeScript/Vite/PWA; các màn hình Pro tách chunk bằng lazy loading; còn cảnh báo bundle Firebase SDK >500 KB |
| `npm run test:rules` | 16/16 đạt ở lần chạy cuối lúc 19:23; Firestore Emulator thực tế; exit 0 |
| `npm run test:sync` | 19/19 đạt ngày 24/10 trong 4,1 phút; Emulator + Chrome một worker, gồm hết hạn và Notification nhiều tab; exit 0 |
| `npm run test:e2e -- --workers=1 --output=.tmp/validation-final/ui-results` | 130 đạt, 10 bỏ qua theo thiết bị trong 4,7 phút; toàn bộ 140 trường hợp desktop/mobile; exit 0 lúc 19:38 |
| `node tools/validate-deploy.mjs` với môi trường hiện tại | Exit 0; Web config và CLI cùng `weekdam-pro-demo-2026`, Emulator tắt rõ ràng, cờ sandbox bật |
| `npm run deploy` | Exit 0; Hosting/rules/indexes đã phát hành lên `weekdam-pro-demo-2026`, không deploy project Free cũ |
| Pro UI mở rộng Undo | 1/1 đạt, exit 0; hoàn tác toàn bộ 100 phút cùng ledger trong một lần, billing giữ nguyên, tính/áp dụng lại và tiếp tục hành trình năm công cụ |

Rules được kiểm tra với owner, guest và tài khoản khác; từ chối sửa/xóa receipt, reset trial, UID giả, trường lạ và dữ liệu gói sai. Tests transaction chạy adapter đang dùng trong ứng dụng: hai client đồng thời dùng cùng checkout ID chỉ gia hạn một lần; retry giao dịch thất bại vẫn giữ kết quả cũ; trial đồng thời chỉ cấp bảy ngày một lần; listener thiết bị khác nhận billing và receipt.

`tests/sync-e2e/pro-sync.spec.ts` đăng nhập bằng Auth Emulator, chạy cùng transaction trên hai thiết bị rồi tạo dữ liệu qua các hàm lập kế hoạch thật: ôn thi đủ 100 phút và chống áp dụng trùng; bốn buổi lặp; lưu/áp dụng mẫu cá nhân; Pomodoro dừng sớm qua nửa đêm với báo cáo/CSV đúng ngày Việt Nam; cấu hình và gộp nhắc deadline bị lỡ. Test xác nhận toàn bộ kế hoạch giống nhau sau sync, receipt/hạn Pro sau reload và buổi lặp đã tombstone không xuất hiện lại. Đây là kiểm tra API/dữ liệu; kiểm tra tương tác từng form Pro được ghi trong nghiệm thu UI riêng.

`tests/sync-e2e/pro-ui.spec.ts` đã kiểm tra bằng form thật: guest nhập kế hoạch ôn thi → popup Google của Auth Emulator → dùng thử một lần → checkout thất bại, hủy và thành công → áp dụng ôn thi, lịch lặp và mẫu riêng → báo cáo 400 phút cùng tải CSV → từ chối Notification vẫn giữ nhắc trong app → reload → context Chrome mobile thứ hai vẫn nhận Pro, mẫu và cấu hình nhắc. Bài riêng xác nhận đổi tài khoản hủy thao tác Pro đang chờ và đóng checkout cũ. Các ảnh desktop/mobile được xem trực tiếp; chữ đọc được và không tràn ngang. Popup Emulator chỉ bỏ tải CSS/font CDN tùy chọn; không giả lập kết quả đăng nhập hoặc transaction billing.

Lần chạy đầu có hai lỗi harness: bộ chọn nhãn exact không tìm thấy select vì nhãn bao cả text option, và phím thả được gửi trước khi drag sensor công bố đích đến. Bài UI dùng role combobox cùng các option DOM thật; helper bàn phím chờ trạng thái nhấc/đích đến của ứng dụng. Sau sửa, toàn bộ 17 bài sync đã chạy lại thành công. Log và ảnh của phiên này nằm tại `.tmp/validation-final/`; thư mục này không đưa vào Git.

Bổ sung 24/10: `pro-lifecycle.spec.ts` kiểm tra UI khi hết Pro và hai tab cùng nhận inbox nhưng chỉ gọi native Notification constructor một lần; reload không gọi lại. Test chờ cả quyền và dữ liệu/cấu hình đồng bộ trước khi vượt mốc để phân biệt nhắc trực tiếp với mốc bị lỡ; đồng hồ được cài trước khi phiên billing khởi tạo. Ca reload offline cũ chờ service worker active trước khi ngắt mạng. Lượt gate cuối **19/19 đạt**, log `sync-expiry-prune.log`.

Bốn unit hồi quy xác nhận inbox được dọn đúng sau hết hạn khi entity bị xóa/hoàn thành/đổi deadline, giữ mục còn hợp lệ và không sinh thêm mốc mới. Mã ứng dụng đã được sửa theo test đỏ → xanh; gate unit cuối **206/206 đạt**, log `unit-expiry-prune.log`. Không đưa file fixture cấp quyền ngắn hạn của Emulator vào bundle cloud.

Bộ UI guest chạy bản production riêng ở `.tmp/dist-ui`, phục vụ bằng `tools/serve-dist.mjs`; Firebase bị tắt rõ ràng trong build này. Cả desktop và mobile qua pricing, chọn năm giữ qua điều hướng, giới thiệu năm công cụ, guest gate, bàn phím, Việt/Anh, sáng/tối và giới hạn chiều ngang. Các kiểm thử Free hiện có (planner, lịch giờ, Pomodoro, backup, Undo và PWA offline) cũng đạt. Mười trường hợp bỏ qua là nhánh chuột/cảm ứng chạy ở project thiết bị tương ứng, không phải bỏ qua lỗi Pro. Đây là Chrome mobile emulation, không phải thiết bị Android vật lý.

Sandbox mặc định không cho mở localhost emulator hub; chạy rules/sync cần môi trường được phép bind localhost. Trong phiên làm việc này đã dùng lệnh được auto-review cho phép để chạy các suite ngoài sandbox. Không có thao tác deploy.

Project cloud riêng đã được cấu hình và phát hành sau kiểm thử local; Google provider và authorized domains đã đọc lại xác nhận. Xem [bằng chứng cloud](CLOUD-SETUP.md). **Google login thật, giao dịch/dữ liệu cloud qua hai thiết bị thật vẫn chưa nghiệm thu**, được để lại sau theo yêu cầu người dùng. Kết quả Emulator không thay thế các mục này.
