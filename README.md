# weekdam

Weekly planner cá nhân cho desktop và Android, định hướng PWA local-first và đồng bộ miễn phí.

## weekdam Pro cho đồ án — bản demo ngày 23/10/2026

Nhánh hiện tại bổ sung `/pricing`, mục **Pro**, dùng thử 7 ngày một lần mỗi tài khoản Google và checkout **“Thanh toán mô phỏng — không thu tiền”**. Giá khảo sát là **29.000đ/tháng, 249.000đ/năm**; không tự gia hạn. Năm công cụ gồm ôn thi tự động, lịch lặp, thư viện mẫu, báo cáo học tập CSV/bản in và nhắc deadline trong app. Planner, lịch theo giờ, Pomodoro, thống kê cơ bản, đồng bộ và backup vẫn thuộc Free.

Demo Pro đã deploy tại [weekdam.web.app](https://weekdam.web.app), có [bảng giá](https://weekdam.web.app/pricing) và [không gian Pro](https://weekdam.web.app/app#pro). Hosting site `weekdam` thuộc project thử nghiệm riêng `weekdam-pro-demo-2026`; project này có Web app, Firestore Standard Singapore, Google provider và authorized domains đã đọc lại xác nhận. Google login thật và đồng bộ trên hai thiết bị thật **chưa nghiệm thu**, được để lại sau theo yêu cầu người dùng. Website `weekdam-hieu-2026.web.app` dưới đây là bản Free đã phát hành trước đó; không deploy Pro vào project cũ.

Khởi động: `npm ci`, sao chép `.env.example` thành `.env.local`, giữ Emulator bật; chạy `npm run emulators`, rồi `npm run dev` ở terminal khác. Wrapper tự tìm Java portable tại `.tools/jdk/`; nếu chưa có, cài Java 21+ trên PATH hoặc đặt `JAVA_HOME`.

- [Firebase riêng và cách chuyển từ Emulator sang sandbox cloud](docs/pro-firebase-sandbox.md)
- [Kịch bản video dưới 3 phút, phỏng vấn thật và khảo sát mức sẵn sàng trả tiền](docs/pro/DEMO.md)
- [Bằng chứng kiểm thử Firebase](docs/pro/FIREBASE-VALIDATION.md)
- [Project cloud riêng và bằng chứng cấu hình/deploy](docs/pro/CLOUD-SETUP.md)
- [Nghiệm thu Pro và các phần còn chờ](docs/pro/ACCEPTANCE.md)

Backup vẫn dùng version 1, thêm các trường Pro tùy chọn. Billing/receipt tách khỏi backup, merge và Undo. Hết Pro vẫn sửa/hoàn thành/xóa/sao lưu được dữ liệu đã tạo; tạo mới hoặc chạy công cụ Pro cần gói còn hạn. Nhắc việc chỉ quét khi app mở, mở lại gộp các mốc bị lỡ; quyền thông báo trình duyệt là tùy chọn.

Mã nguồn mở theo [MIT License](LICENSE), tại [hieunm2008/weekdam](https://github.com/hieunm2008/weekdam). Xem [hướng dẫn đóng góp](CONTRIBUTING.md) và [ghi nhận bên thứ ba](THIRD_PARTY_NOTICES.md).

App đã deploy tại [weekdam-hieu-2026.web.app](https://weekdam-hieu-2026.web.app): kế hoạch tuần/ngày, project/task/subtask, độ khó 1/2/3, drag chuột/cảm ứng/bàn phím, copy/paste, end/carry/reopen, Stats, lịch sử, undo, JSON backup, vi/en, theme và PWA offline. Firestore rules/indexes đã deploy; database Standard ở Singapore có free tier và billing chưa bật. Google provider production đã bật; ngày 09/10/2026 Hieu xác nhận đồng bộ thực, cài PWA Android và offline/reconnect thành công. Xem `docs/validation/ACCEPTANCE.md` để phân biệt kiểm thử tự động với nghiệm thu từ người dùng.

## Landing page và hướng dẫn — đã deploy 11/10/2026

Trang `/` giới thiệu weekdam với bản xem trước tương tác, `/guide` có sáu chủ đề hướng dẫn, tìm kiếm không phân biệt dấu và liên kết đến từng mục. `/app` mở kế hoạch hiện có; bản PWA đã cài mở thẳng đường dẫn này và giữ identity cũ. Có Việt/Anh, sáng/tối, bố cục mobile, animation xuất hiện theo cuộn và hỗ trợ giảm chuyển động. Dữ liệu mẫu trên landing không ghi vào kế hoạch cá nhân.

Mở [landing page](https://weekdam-hieu-2026.web.app/), [hướng dẫn](https://weekdam-hieu-2026.web.app/guide) hoặc [kế hoạch](https://weekdam-hieu-2026.web.app/app). Chạy cục bộ bằng `npm run dev`. [Thiết kế và hình tham chiếu](docs/design/landing-v1/DESIGN.md); [bằng chứng phát hành và kiểm tra website public](docs/design/landing-v1/DEPLOYMENT.md).

## Lịch theo giờ — đã deploy 11/10/2026

Chọn **Lịch theo giờ** để liệt kê công việc của tuần đang xem trước khi xếp lịch. Có thể nhập nhanh một việc hoặc dán nhiều tên, mỗi dòng một việc. Chọn **Lên lịch** để đặt ngày, giờ bắt đầu/kết thúc, ghi chú và độ khó; một công việc có thể có nhiều khung giờ. Kéo công việc vào lịch để tạo khung giờ, hoặc kéo khung giờ đang có để đổi ngày/giờ và giữ nguyên thời lượng. Trên điện thoại, vuốt để cuộn, giữ để kéo; nút Lên lịch/Sửa lịch dùng được bằng bàn phím.

**Chọn tuần** và các nút tuần trước/sau cho phép lập lịch trong tương lai. Mỗi tuần có danh sách công việc riêng. Việc cũ chưa đặt giờ vẫn nằm ở khu vực **Chưa có giờ**; **Bảng theo ngày** vẫn dùng được. Các phiên chồng giờ hiện cạnh nhau; màu pastel cho biết độ khó. Giờ bắt đầu/kết thúc nằm trong cùng ngày. Xóa khung giờ giữ lại công việc trong danh sách, còn bỏ giờ giữ phiên làm việc trong ngày.

Bản này đã deploy cùng quy tắc Firestore kiểm tra giờ. `Subtask.startTime/endTime` là hai trường tùy chọn đi cùng nhau; backup v1, thứ tự ngày, undo và lưu offline được giữ tương thích. Kiểm tra đồng bộ Emulator và lịch Guest trên website public đã đạt; xem [bằng chứng phát hành](docs/design/landing-v1/DEPLOYMENT.md).

## Pomodoro — đã deploy 12/10/2026

Chọn **Pomodoro** để tập trung tự do hoặc chọn một công việc trong tuần đang xem. Có thể mở nhanh từ thẻ trên bảng hoặc danh sách công việc trong lịch. Bộ đếm nhỏ vẫn hiện khi quay về kế hoạch; hoàn thành Pomodoro không tự đánh dấu công việc đã xong.

Mặc định tập trung 25 phút, nghỉ ngắn 5 phút, nghỉ dài 15 phút sau 4 phiên đủ giờ; có thể tùy chỉnh. Mỗi giai đoạn chỉ bắt đầu khi bạn bấm tiếp. Tạm dừng không cộng thời gian; dừng/đặt lại sớm vẫn lưu thời gian thực, nhưng không tăng số phiên hoàn thành. Có chuông, tùy chọn thông báo trình duyệt, thống kê hôm nay/7 ngày và lịch sử.

Runtime và cấu hình nằm trên thiết bị, tách theo Guest/tài khoản; các tab cùng scope dùng chung bộ đếm. Lịch sử lưu offline và đồng bộ khi đăng nhập, có trong backup v1 và được giữ khi Undo kế hoạch hoặc xóa công việc. Khi app mở lại, bộ đếm khôi phục theo mốc kết thúc; chuông/thông báo nền chịu giới hạn của trình duyệt và hệ điều hành. Mở [Pomodoro trên production](https://weekdam-hieu-2026.web.app/app#pomodoro). Xem [triển khai và nghiệm thu Pomodoro](docs/design/pomodoro-v1/IMPLEMENTATION.md).

## Chạy và kiểm thử

Bản giao diện kính mờ đã deploy ngày 10/10/2026: nền kem/than ấm, Inter cục bộ, rail với panel dự án, thẻ kéo bằng thân, thứ tự tự do qua project/task, animation và reduced motion. `Subtask.dayOrder` lưu/sync riêng thứ tự ngày; dữ liệu cũ, backup v1 và IndexedDB v2 tương thích. 96 kiểm thử đã đạt; Lighthouse mobile production 99/100/100. Nghiệm thu kéo/thả và thứ tự offline trên Android thật của bản mới còn chờ xác nhận. Xem [plan và bằng chứng giao diện](docs/design/glass-v1/IMPLEMENTATION.md).

Yêu cầu Node 24 LTS (hoặc phiên bản đáp ứng engines của dependencies), npm; Java 21+ cho Emulator.

```sh
git clone https://github.com/hieunm2008/weekdam.git
cd weekdam
npm ci
npm run dev
npm test
npm run test:e2e
npm run test:rules
npm run test:sync
npm run build
npm run preview -- --port 4173
```

Chế độ Guest chạy ngay khi chưa có cấu hình Firebase. Chỉ cần tạo `.env` từ `.env.example` khi muốn bật đồng bộ với Firebase project của bạn. `.env`, dependencies, build, cache và log được loại khỏi Git.

`npm run test:production` kiểm tra URL Hosting đã deploy: Guest CRUD/persistence, PWA offline/restart/reconnect, mobile layout, manifest/auth handler, Firestore chặn đọc chưa đăng nhập và Google OAuth popup đến trang Google Accounts. Dữ liệu thử chỉ lưu Guest trong browser context tạm; lệnh không nhập credentials, đăng nhập hay ghi dữ liệu cloud. Báo cáo nằm trong `docs/validation/production-smoke.json`.

E2E dùng Chrome qua Playwright và bundle production tại `.tmp/dist-ui`, được phục vụ bằng static server cục bộ để kiểm tra cả PWA offline. Rules/sync tests chỉ dùng `demo-weekdam-pro`, không dùng project production. Nếu JDK nằm trong `.tools/jdk/`, wrapper tự tìm; nếu không, đặt `JAVA_HOME` và PATH cho Java 21+. Bản test sync có fixture đăng nhập bằng Auth Emulator; fixture chỉ được build khi bật Emulator. Chạy các suite trình duyệt tuần tự trên máy ít bộ nhớ; có thể thêm `--workers=1` cho E2E.

## Bật đồng bộ và deploy

Đối với bản Pro hiện tại, làm theo [hướng dẫn Firebase sandbox riêng](docs/pro-firebase-sandbox.md), tạo project mới và bật `VITE_FIREBASE_PRO_SANDBOX=true` khi cấu hình cloud. Các bước bên dưới mô tả hệ thống Free gốc; không tái sử dụng `weekdam-hieu-2026` cho đồ án Pro.

1. Trong thư mục dự án, đăng nhập Firebase CLI: `npm run firebase -- login`. Script dùng CLI từ package `firebase-tools` đã cài qua `npm ci`. Mật khẩu/mã xác thực nhập vào Google/terminal trực tiếp, không gửi vào chat.
2. Tạo Firebase project gói **Spark**, không liên kết billing; không cần Analytics, Functions hoặc Cloud Storage. Tạo Firestore Standard native database, đề xuất region `asia-southeast1`.
3. Tạo Web app; copy `.env.example` thành `.env`, điền 4 trường cấu hình web. Đây là cấu hình frontend công khai; không thêm service-account/private key. Production phải để `VITE_USE_FIREBASE_EMULATORS=false`.
4. Bật Google trong Authentication; thêm tên miền Hosting vào Authorized domains. Nếu dùng authDomain cùng miền `project-id.web.app`, Google OAuth client phải cho phép redirect URI `https://project-id.web.app/__/auth/handler`. Service worker không intercept đường dẫn `/__/`.
5. Chọn project: `npm run firebase -- use --add`, rồi chạy `npm run deploy`. Hosting public directory là `dist`; rules/indexes được deploy cùng app. Không deploy bản Emulator.

Firestore chỉ cho mỗi UID đọc/ghi `users/{uid}/records`. Mỗi week/project/task/subtask là một document, LWW theo document; không lưu cả tuần trong một document. Xóa bằng tombstone không giữ note/nội dung. IndexedDB giữ outbox theo project+UID với revision để retry không xóa nhầm thay đổi mới. First login tự upload Guest khi cloud trống; cloud có dữ liệu thì hỏi merge/cloud. Bản Guest vẫn giữ để sao lưu.

Spark có hạn mức; vượt quota có thể tạm dừng dịch vụ đồng bộ. Không tự nâng Blaze. Backup JSON tối đa 5 MB, version 1; import gộp theo ID, remap cây nếu cùng ID khác nội dung, giữ metadata của tuần đang có. Deadline được giữ ngày tuyệt đối khi copy/carry/move.

## Cài PWA trên Android

Mở URL HTTPS Hosting bằng Chrome, chọn Cài ứng dụng/Thêm vào màn hình chính. Mở online ít nhất một lần để cache app. Sau đó thử tạo/sửa việc offline, đóng/mở lại, kết nối mạng và kiểm tra desktop nhận thay đổi. Chỉ coi tiêu chí Android thật hoàn tất sau khi thực hiện trên thiết bị vật lý.

Xem [checklist nghiệm thu Android](docs/validation/ANDROID.md) để kiểm tra cài đặt, tương tác, sync/offline reconnect và cách ghi nhận kết quả.

- [Kết quả tính năng](docs/research/FEATURES.md)
- [Các quyết định cần duyệt](docs/research/OPEN_QUESTIONS.md)
- [Mô hình dữ liệu quan sát](docs/research/DATA_MODEL.md)
- [Đề xuất kỹ thuật và hạn mức](docs/DECISIONS.md)
- [Phương pháp và luồng đã khảo sát](docs/research/SESSION.md)
- [Danh mục ảnh bằng chứng](docs/research/screens/INDEX.md)

Chạy kiểm tra bộ research: `npm run check:research`. Xem [tiến độ và bằng chứng triển khai](docs/PROGRESS.md).

Screenshot và payload JSON trong thư mục research chỉ là bằng chứng Guest do phiên thử tạo. Không sử dụng thương hiệu, văn bản hướng dẫn, source hoặc assets của Beaverplans trong ứng dụng weekdam.
