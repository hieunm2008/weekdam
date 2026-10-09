# weekdam — quyết định và đề xuất kỹ thuật

Ngày kiểm tra nguồn: 08–09/10/2026. Các mặc định được áp dụng theo chỉ thị tiếp tục toàn bộ phase không ngắt quãng ngày 09/10. Trạng thái và bằng chứng mới tại [PROGRESS.md](PROGRESS.md); phần nghiên cứu bên dưới được giữ để đối chiếu.

## Stack giữ từ yêu cầu

Vite + React + TypeScript; Tailwind/CSS variables; dnd-kit cho chuột/cảm ứng/bàn phím; i18next vi/en; vite-plugin-pwa/Workbox; date-fns; Vitest, Playwright, Firebase Emulator cho rules. Chưa cài dependencies dự án hoặc scaffold app. Công cụ Playwright khảo sát dùng runtime có sẵn, không phải package của app.

## Chi phí $0

Đề xuất **Firebase Hosting** (static hosting, khác Firebase App Hosting), Auth Google và Firestore Standard trên **Spark**, không liên kết billing. Dùng subdomain miễn phí để không phát sinh phí mua domain. Nguồn [Firebase Pricing](https://firebase.google.com/pricing), kiểm tra 09/10/2026:

| Sản phẩm | Spark / hạn mức miễn phí |
|---|---|
| Auth social sign-in | Có trên Spark; không cần SMS/phone auth |
| Firestore Standard | 1 GiB lưu trữ; 50.000 reads/ngày; 20.000 writes/ngày; 20.000 deletes/ngày; 10 GiB egress/tháng |
| Firebase Hosting | 10 GB storage; 360 MB transfer/ngày; SSL |

Đây là đánh giá khả thi cho một người, không phải cam kết dịch vụ không giới hạn. Khi vượt quota, Spark có thể chặn sản phẩm theo chu kỳ quota thay vì tính phí; offline vẫn cần giữ thay đổi và báo lỗi đồng bộ. Không tự nâng Blaze. Không cần Functions, Cloud Storage, App Hosting hoặc billing-linked trial. Linking billing tự đổi plan sang Blaze; budget alert không phải trần tiền. [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)

Chưa tạo tài khoản/project, provision DB hoặc deploy. Nếu quota/điều kiện thay đổi trước Phase 4/6, kiểm tra lại và trình phương án thay thế; chưa cần đổi công nghệ lúc này.

## Local-first và sync — đề xuất sau checkpoint

- Guest dùng IndexedDB namespace riêng của weekdam; không cần Auth. React đọc qua repository interface chung; local mutations dùng được ngay khi offline.
- Đăng nhập Google mới bật sync. Dữ liệu account nằm dưới `users/{uid}/...`; rules kiểm `request.auth.uid == uid` cùng schema/ownership. Emulator phải chứng minh không đăng nhập và user khác không đọc/ghi được. Không đặt dữ liệu Guest vào collection cloud public.
- Firestore web dùng `persistentLocalCache` + `persistentMultipleTabManager`, APIs hiện hành trong [tài liệu offline chính thức](https://firebase.google.com/docs/firestore/manage-data/enable-offline). Nếu persistence không khả dụng phải giữ local repository và báo sync hạn chế, không tuyên bố dữ liệu đã bền vững.
- Firestore áp dụng last-write-wins cho các thay đổi cùng document; cần document theo thực thể, tránh lưu cả tuần trong một document khiến sửa độc lập bị ghi đè. Granularity/schema cuối cùng khóa ở Phase 2/4; đây chưa phải API đã triển khai.
- First-login merge theo Q8: cloud trống upload; cloud có dữ liệu cho chọn merge/cloud. Giữ IDs để import có thể retry; bảo toàn local backup, không gộp theo tên hoặc ghi đè cloud ngầm. Cache Guest/account tách theo UID; đăng xuất không để Guest hiển thị dữ liệu account khác.
- Chỉ báo cần phân biệt local saved, pending sync, synced và sync error. Network online không đủ để khẳng định server đã nhận thay đổi. Reads/listeners giới hạn vào phần dữ liệu đang sử dụng để tránh quota tăng vô ích.
- `.env.example` và `.env` cho cấu hình frontend; không commit `.env`, private key/service account hoặc token. Không đưa admin credential vào bundle. Thiết kế bảo vệ dữ liệu dựa rules, không dựa việc giấu cấu hình frontend.

Các lựa chọn trên là đề xuất cần chốt trước phase tương ứng, không suy ra từ cloud của Beaverplans.

## Lịch, PWA và kiểm thử

Tuần Thứ Hai đã xác minh. Đề xuất timezone kế hoạch cố định Asia/Ho_Chi_Minh; date-only cho lịch, UTC cho sync timestamp. Theme/ngôn ngữ/tuần đang xem lưu trên thiết bị; chưa yêu cầu đồng bộ preferences. Xem Q7 nếu muốn theo timezone thiết bị.

“Lighthouse PWA đạt” cần thay bằng tiêu chí cụ thể vì PWA testing của Lighthouse đã deprecated. [Chrome Developers](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest)

- Phase 1: manifest/icons/start URL, service worker và shell load/reload offline sau lần tải online; kiểm tra installability ở Chrome.
- Phase 4: hai browser contexts/accounts test cùng UID, offline edits/reconnect, concurrent edit LWW, cache account isolation, rules emulator.
- Phase 6: HTTPS production, cài PWA vào Android thật, mở standalone, đóng/mở lại khi offline, dữ liệu còn và reconnect đồng bộ sang desktop. Mô phỏng mobile không thay thế bước này.
- Lighthouse dùng performance/accessibility/best practices để phát hiện vấn đề, không đặt điểm PWA deprecated làm acceptance gate.

Không sử dụng logo/mascot/icon/font asset, marketing text hoặc code của bản gốc. Các screenshot nghiên cứu không được import vào bundle app.

## Các điều chưa được quyết định

Q1–Q6 về trọng số, move/end/copy và tính năng phát hiện thêm; U3 về Stats biên; schema Firebase/export version chi tiết; tài khoản Firebase của Hieu và quyền deploy; xác nhận kiểm tra Android vật lý. Tất cả được theo dõi trong [OPEN_QUESTIONS.md](research/OPEN_QUESTIONS.md).
