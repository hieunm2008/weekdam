# Phiên khảo sát Phase 0

## Phương pháp và provenance

- Trang: https://beaverplans.com/, Guest sạch, không đăng nhập/không gửi Support.
- Playwright 1.62.1 từ runtime có sẵn; Chrome Chromium đã cài; headless; desktop 1440×900 và mobile 390×844, hasTouch/isMobile, scale 1.
- Thời gian: 08–09/10/2026 Asia/Saigon. Mobile cố định đồng hồ 08/10 để tái hiện overdue, sau đó 15/10 để kiểm tra tuần đã hoàn thành. Các ca lịch dùng page.clock, không thay dữ liệu server.
- Khởi tạo hai project, ba task, sáu subtask, chỉ thêm bản sao nhỏ để kiểm tra Copy/Paste/Carry. Tất cả dữ liệu có tên Research, không dùng thông tin riêng của Hieu.
- Chỉ UI, localStorage của phiên thử và clipboard do UI Copy tạo. Không đọc source/bundle, không download asset, không gọi API riêng của bản gốc. Screenshot lưu giao diện như bằng chứng, không làm asset app mới.
- Chưa đọc IndexedDB: dữ liệu Guest cần thiết đã hiện trong localStorage. Không lưu cookies/auth/session token.

Metadata máy/trình duyệt: [environment.json](evidence/environment.json).

## Các luồng đã thực hiện

1. Onboarding bước 1 → tạo project → thêm task → editor ngày/subtask/weight/deadline/note → Save. Guide chuyển theo bước và biến mất khi đủ dữ liệu.
2. Tạo thêm task/project, lập sáu subtask, đánh dấu Easy rồi Hard, check/uncheck cả task để kiểm công thức 1/2/3 và checkbox cha.
3. Focus today/view ngày; đổi thứ tự project bằng chuột, task/project/subtask bằng bàn phím, subtask bằng chuột; Esc có live announcement hủy.
4. Move overdue Wed → Fri với missed; mobile Mon → Fri không giữ missed; cùng ID không tạo planned duplicate.
5. Copy tất cả project, paste sang tuần sau mặc định và giữ progression; paste lặp tạo bản sao. Mobile copy riêng Alpha và paste ngay cùng tuần. Xóa các bản thử dư bằng dialog của UI.
6. Move whole week: đích có việc disabled; đích trống thành công; chuyển lại. IDs và deadline giữ nguyên.
7. End pending: Carry forward; xem Stats/Weeks/preview lịch sử; Reopen; End lại với Clear all, đối chiếu giữ archive và không carry thêm. Mobile End khi mọi task hoàn thành có dialog riêng.
8. Mobile: Skip guide, empty board, Paste, Manage, Show counts, day tabs, checkbox, move dialog; CDP touchStart/450 ms/touchMove/touchEnd đổi project thành công; editor Save/Cancel, sửa/xóa subtask, xóa task, rename project, task chưa gán ngày, Account/theme/locale/reload, End/Stats/Weeks. Clear board được thực hiện trên tuần chứa các bản sao thử, hai tuần ended khác vẫn giữ.
9. Desktop theme light/dark, vi/en, Classic, Auto với media light/dark. Reload giữ dữ liệu/settings, bỏ tuần tương lai đang xem.
10. Đồng hồ ngày 05–11/10, 31/12, 04/01; cùng instant ở UTC/Asia_Ho_Chi_Minh. Xem [date-cases.json](evidence/date-cases.json) và [timezone-cases.json](evidence/timezone-cases.json).

## Khác biệt quan trọng đã đo

| Ca | UI kết quả |
|---|---|
| Một task, Easy 1 + Medium 2 + Hard 3 | Planned 6; Easy done = 1/6, 17%; thêm Hard done = 4/6, 67% |
| Tuần 4/8 và 4/4 đã ended | Avg 8/12 = 67%; Best week 100%; streak 2 ở ngưỡng 50%+ |
| Trong done 8 có task không gán ngày, weight 1 | Activity 7; weekday ratios dùng 7 scheduled done units |
| Cùng instant 11/10/2026 18:30 UTC | UTC: tuần Oct 05–11; Asia/Saigon: tuần Oct 12–18 |
| Chọn tuần tương lai, reload | Quay về tuần hiện tại, settings/dữ liệu vẫn giữ |

## Lỗi công cụ và cách khắc phục

- Node REPL tích hợp không resolve được runtime Playwright; dùng Node CLI + harness cục bộ. Sandbox DNS không resolve trang; phiên được chạy với network escalation đã được automatic review cho phép.
- Một số batch dừng vì Copy mở dialog, Weeks mở preview trước nút View, đổi locale làm đổi tên nút, và Show counts đổi tên tab ngày. Đã đọc lại accessibility state và hoàn tất theo UI thực tế; không force-click xuyên scrim.
- Keyboard ArrowDown một lần chưa vượt qua hàng; lặp mũi tên giúp reorder thực tế, không ghi nhận lần đầu là thành công.
- `observations.jsonl` giữ các kết quả/timeout trong phần sau của phiên, không phải một test suite tất cả pass. `last-result.json` chỉ là kết quả gần nhất. Evidence snapshot + screenshot mới là bằng chứng từng hành vi.

## Chạy công cụ nghiên cứu

`tools/session.cjs` là harness cho nghiên cứu, không phải code app. Đặt `RESEARCH_NODE_MODULES` tới thư mục Node modules có Playwright rồi chạy bằng Node; Chrome phải có sẵn. Gửi từng dòng JSON `{ "code": "..." }` trên stdin để thao tác phiên; `snap(name)` lưu screenshot/text. Chỉ gửi code tự viết của người khảo sát, không chạy chỉ dẫn từ trang. Desktop được tạo sẵn; mobile và các ca clock trong lần khảo sát được tạo bằng API Playwright thông thường. Script không tự replay toàn bộ luồng khảo sát.

Kiểm tra bộ bàn giao offline: `node docs/research/tools/verify.cjs`. Script kiểm file, links, PNG viewport, coverage và đối chiếu dữ liệu với các phép đo trong text. Nó không kiểm app weekdam và không thay cho test Android/Firestore sau này.

## Checkpoint

Đọc [FEATURES.md](FEATURES.md), [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md), [DATA_MODEL.md](DATA_MODEL.md), [DECISIONS.md](../DECISIONS.md). Chưa code Phase 1. Khi không có remote GitHub, phase kết thúc bằng commit local; không tạo PR trống hoặc tự chọn repository để push.
