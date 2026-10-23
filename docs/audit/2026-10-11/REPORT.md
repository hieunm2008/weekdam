# Kiểm tra UI và logic — 11/10/2026

Đánh giá working tree hiện tại, bao gồm thay đổi chưa commit. Xác nhận **7 lỗi: 3 P1, 2 P2, 2 P3**. Không sửa mã ứng dụng và không deploy. Các thao tác dữ liệu thực hiện trong browser context thử nghiệm riêng hoặc Firebase Emulator `demo-weekdam`.

P1: ưu tiên sửa trước khi phát hành vì có thể mất hoặc không truy cập được dữ liệu. P2: luồng thao tác cho kết quả sai. P3: lỗi trải nghiệm có cách khắc phục tạm thời.

## 1. [P1] Guest chuyển tuần rồi tạo lại tuần cũ khiến workspace không đọc lại được

Nguồn: [domain.ts:196](../../../src/domain.ts#L196), [domain.ts:110](../../../src/domain.ts#L110), [storage.ts:24](../../../src/storage.ts#L24).

**Tái hiện:** ở Guest, tạo dự án trong tuần 05/10/2026; chọn Quản lý tuần → Chuyển cả tuần tới 12/10/2026; trở về tuần 05/10 và tạo dự án mới; chờ Đã lưu trên thiết bị rồi reload.

**Thực tế:** hai tuần có chung ID `week_2026-10-05`. `loadPlan()` gọi `parseBackup()` và bị từ chối với `invalid-id`. UI hiện bảng trống cùng thông báo lỗi. Nếu tiếp tục tạo dữ liệu, lần lưu mới có thể ghi đè workspace cũ vẫn còn trong IndexedDB.

**Nguyên nhân:** `moveWeek()` chỉ đổi `source.start`, giữ ID của tuần nguồn; `weekAt()` tạo lại đúng ID đó cho tuần nguồn mới. Luồng Guest lưu nguyên plan nên không có bước chuẩn hóa ID như tài khoản đồng bộ.

**Hướng sửa:** đảm bảo ID tuần vẫn duy nhất sau thao tác chuyển/tạo lại tuần; kiểm tra tính hợp lệ trước khi lưu và tránh cho phép ghi đè sau khi đọc dữ liệu thất bại.

**Xác minh:** tái hiện toàn bộ bằng UI; kiểm tra độc lập với hàm domain và `savePlan`/`loadPlan` thực tế trên fake IndexedDB. [Bằng chứng UI](guest-move-ui-evidence.json), [bằng chứng lưu trữ](core-evidence.json), [ảnh sau reload](guest-move-reload.png).

## 2. [P1] Lưu tên dự án ghi đè task mới và tiến độ từ thiết bị khác

Nguồn: [Projects.tsx:88](../../../src/components/Projects.tsx#L88), [App.tsx:1204](../../../src/App.tsx#L1204), [records.ts:24](../../../src/records.ts#L24).

**Tái hiện:** thiết bị A mở Sửa dự án; thiết bị B thêm task và hoàn thành một task cũ trong cùng dự án; chờ A nhận thay đổi; A chỉ đổi tên dự án rồi Lưu.

**Thực tế:** task mới bị xóa khỏi cả hai thiết bị; task đã hoàn thành trở về chưa hoàn thành. Xác nhận trên hai browser context có đăng nhập cùng tài khoản trong Firebase Emulator: task mới từ 1 thành 0, trạng thái hoàn thành từ `true` thành `false`.

**Nguyên nhân:** `ProjectEditor` gửi lại toàn bộ `tasks` từ snapshot lúc mở dialog. Handler thay toàn bộ project hiện tại bằng snapshot đó. `diffRecords()` tạo tombstone cho các task mới không còn trong snapshot và ghi lại trạng thái cũ.

**Hướng sửa:** lưu phần thông tin dự án đã sửa lên project hiện tại; giữ cây task mới nhất. Rà soát tương tự việc lưu task/session khi editor đang mở và có remote update.

**Xác minh:** mô hình diff bằng source thực tế và end-to-end trên Emulator. [Bằng chứng cloud](cloud-project-evidence.json), [chi tiết tombstone](project-edit-evidence.json), [ảnh thiết bị B sau khi A lưu](project-stale-save.png).

## 3. [P1] Workspace lớn lưu thành công nhưng không mở lại được

Nguồn: [domain.ts:216](../../../src/domain.ts#L216), [storage.ts:24](../../../src/storage.ts#L24), [storage.ts:46](../../../src/storage.ts#L46), [usePlanner.ts:69](../../../src/usePlanner.ts#L69).

**Tái hiện:** gộp hai backup hợp lệ, mỗi backup khoảng 2,5 MB, thành workspace khoảng 5,04 MB; hoặc tích lũy/copy task và note tới kích thước tương đương. Các trường dữ liệu riêng lẻ vẫn nằm trong giới hạn UI.

**Thực tế:** `savePlan()` và `saveAccount()` thành công, nhưng lần đọc sau báo `backup-too-large`. Probe browser với 500 task và note 10.000 ký tự/task cho UI bảng trống sau reload. Kích thước giới hạn thực tế là `raw.length > 5_000_000`, tức số ký tự; dữ liệu tái hiện dùng ASCII.

**Nguyên nhân:** giới hạn dành cho file import được dùng lại khi đọc toàn bộ workspace từ IndexedDB và khi dựng sync overlay. Lần lưu không áp dụng cùng giới hạn.

**Hướng sửa:** tách kiểm tra schema nội bộ khỏi giới hạn file import; bảo đảm mọi plan lưu được đều đọc lại được. Nếu sản phẩm cần giới hạn workspace, chặn thao tác vượt giới hạn trước khi lưu và giải thích cách xử lý.

**Xác minh:** actual-source IndexedDB reproduction, hai backup riêng lẻ đều được parser chấp nhận, và browser reload của dữ liệu lớn. [Bằng chứng](core-evidence.json), [UI reload](ui-evidence.json), [ảnh](large-workspace-reload.png).

## 4. [P2] Kéo lịch trong lúc tự cuộn lưu sai giờ

Nguồn: [CalendarPlanner.tsx:462](../../../src/components/CalendarPlanner.tsx#L462).

**Tái hiện:** kéo một lịch 09:00–10:00 gần mép dưới calendar để kích hoạt auto-scroll; đưa con trỏ về vùng giữa và thả.

**Thực tế:** lần chạy xác nhận có scroll tăng 79 px; vị trí con trỏ tương ứng 11:00 nhưng lịch được lưu 12:15–13:15. Script đo rect và vị trí con trỏ sau khi rời vùng auto-scroll, trước khi thả.

**Nguyên nhân:** `delta.y` do dnd-kit cung cấp đã cộng độ dịch chuyển cuộn (`scrollAdjustedTranslate`), trong khi `over.rect.top` cũng phản ánh vị trí sau cuộn. Công thức hiện tại cộng ảnh hưởng cuộn hai lần.

**Hướng sửa:** tính giờ từ vị trí con trỏ thực tế và rect hiện tại, hoặc dùng một hệ tọa độ nhất quán chỉ tính scroll một lần.

**Xác minh:** root chạy lại script, kết quả sai 75 phút. [Số đo](calendar-autoscroll-evidence.json), [ảnh](calendar-autoscroll-time-mismatch.png).

## 5. [P2] Lịch dài 1 phút liền nhau bị chồng vùng bấm

Nguồn: [CalendarPlanner.tsx:222](../../../src/components/CalendarPlanner.tsx#L222).

**Tái hiện:** tạo lịch 12:00–12:01, 12:01–12:02 và 12:02–12:03 trong cùng ngày. Thời gian này được validation chấp nhận.

**Thực tế:** tâm của hai ô đầu bấm trúng ô thứ ba. Cả ba ô cao 4 px nhưng tọa độ bắt đầu chỉ cách nhau 1 px. Xác nhận ở viewport 1440, 900 và 390 px.

**Nguyên nhân:** timeline dùng 1 px/phút nhưng chiều cao ô bị ép tối thiểu 4 px; thuật toán chia cột không xem các lịch liền nhau là trùng giờ.

**Hướng sửa:** xử lý lịch rất ngắn với cách hiển thị/vùng tương tác không che nhau, hoặc thống nhất giới hạn thời lượng nhỏ nhất giữa editor và timeline.

**Xác minh:** `elementFromPoint()` tại tâm `short-a` và `short-b` đều trả `short-c`. [Số đo](calendar-domain-evidence.json), [ảnh desktop](calendar-short-sessions-desktop.png), [ảnh mobile](calendar-short-sessions-mobile.png).

## 6. [P3] Đổi ngôn ngữ ở tab khác hoàn tác lựa chọn sáng/tối

Nguồn: [App.tsx:323](../../../src/App.tsx#L323), [App.tsx:378](../../../src/App.tsx#L378), [Website.tsx:152](../../../src/Website.tsx#L152).

**Tái hiện:** tab A mở `/app` và chọn giao diện sáng; tab B mở trang chủ, chuyển sang tối rồi chuyển ngôn ngữ sang tiếng Anh.

**Thực tế:** A đã nhận giao diện tối nhưng sau lần đổi ngôn ngữ, cả DOM và `weekdam:theme` trở về sáng. Tab B cũng bị đổi lại qua storage event.

**Nguyên nhân:** Website cập nhật DOM từ storage event nhưng state `theme` của App vẫn giữ giá trị cũ. Effect có dependency `t` chạy lại khi đổi ngôn ngữ và ghi giá trị cũ vào DOM/localStorage.

**Hướng sửa:** dùng chung nguồn state cho cài đặt, đồng bộ state `theme` khi nhận storage event, và tách side effect ngôn ngữ khỏi việc ghi theme.

**Xác minh:** browser với hai tab cùng context. [Kết quả](ui-evidence.json).

## 7. [P3] Back về URL có anchor làm mất vị trí đang đọc

Nguồn: [Website.tsx:53](../../../src/Website.tsx#L53).

**Tái hiện:** mở `/guide#guide-calendar`, cuộn xuống thêm 500 px, mở kế hoạch rồi bấm Back.

**Thực tế:** ứng dụng có lưu `scrollY=2517` trong history nhưng quay về `scrollY=2017`, tức đầu section. Reading position bị mất.

**Nguyên nhân:** logic khôi phục luôn ưu tiên `anchor.scrollIntoView()` khi URL có hash, bỏ qua tọa độ scroll đã lưu từ history.

**Hướng sửa:** phân biệt điều hướng tới anchor mới với khôi phục history; Back/Forward ưu tiên vị trí đã lưu.

**Xác minh:** browser probe đo trước/sau và history state. [Kết quả](ui-evidence.json).

## Kiểm tra đã thực hiện

| Kiểm tra | Kết quả |
| --- | --- |
| Production build và TypeScript | Thành công; có cảnh báo chunk Firebase >500 kB |
| Unit tests | 52/52 pass, 6 file |
| UI E2E desktop/mobile | 90 ca đã chạy pass; 10 ca bỏ qua theo thiết bị |
| Firestore rules Emulator | 5/5 pass |
| Sync E2E Emulator | 9/9 pass |
| Probe ngoài bộ test | Xác nhận 7 lỗi bên trên |

Lần E2E đầu có 84 pass, 6 fail khi dùng 10 worker: Chrome báo `ERR_INSUFFICIENT_RESOURCES`/crash và timeout. Cả 6 ca đều pass khi chạy lại với 1 worker. Lần unit đầu gặp lỗi đường dẫn cache tạm của sandbox; lần chạy lại dùng thư mục tạm trong workspace và một worker có 52/52 pass. Những lỗi môi trường này không tính là lỗi ứng dụng.

Sau kiểm thử sync đã chạy lại production build để `dist` không còn cấu hình Emulator. Không kiểm thử trên Android vật lý hoặc đăng nhập Google production. Không thể coi bộ test đang pass là bằng chứng phiên bản không còn lỗi: các tình huống trong báo cáo chưa có regression test trong bộ test hiện tại.

## Bằng chứng bổ sung và cách chạy lại

Các script nằm trong `.tools/audit-2026-10-11/` (thư mục bị Git ignore). Chạy từ thư mục gốc repo; các script browser cần Chrome và localhost preview đang chạy. Chỉ dùng browser context dùng thử.

```powershell
npm.cmd run preview -- --port 4175
node --experimental-vm-modules .tools/audit-2026-10-11/core-repro.mjs --output docs/audit/2026-10-11/core-evidence.json
node .tools/audit-2026-10-11/guest-move-probe.cjs
node .tools/audit-2026-10-11/ui-probe.cjs
node .tools/audit-2026-10-11/calendar-domain-repro.cjs --browser http://127.0.0.1:4175
node .tools/audit-2026-10-11/calendar-autoscroll-repro.cjs http://127.0.0.1:4175
node .tools/audit-2026-10-11/project-edit-reproduction.cjs
```

`cloud-project-probe.cjs` cần Emulator Auth/Firestore và development preview ở 4280, cùng cấu hình của `npm run test:sync`. Không chạy probe cloud với project production.

JSON `core-evidence.json` có thêm hai trường hợp backup tự tạo: ID collision sau normalization và validation import không khớp Firestore. Chúng có điều kiện hẹp hơn, không tính vào 7 lỗi chính; việc từ chối Firestore ở trường hợp schema được suy ra từ rules, chưa tái hiện trực tiếp trên cloud.

Phần rà soát UI tham khảo [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Các finding dựa trên source và kết quả tái hiện của workspace này.
