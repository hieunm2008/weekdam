# Landing page và hướng dẫn weekdam

Đọc brief như một landing page cho công cụ kế hoạch tuần cá nhân: bình tĩnh, thoáng, cùng ngôn ngữ kem/than ấm của ứng dụng hiện có. `DESIGN_VARIANCE: 7`, `MOTION_INTENSITY: 6`, `VISUAL_DENSITY: 3`. Dùng React, CSS gốc, Inter đã self-host và Lucide đã có trong dự án.

## Hình tham chiếu

Tạo bằng công cụ ImageGen tích hợp trước khi triển khai giao diện:

- `reference-hero.png`: header thấp, hero bất đối xứng, headline hai câu, bảng tuần và tiến độ mẫu.
- `reference-features.png`: các hàng nội dung mở, divider mảnh, minh họa bảng/ngày/tiến độ.
- `reference-guide.png`: tìm kiếm rộng, mục lục sticky, bài hướng dẫn và các bước theo trục dọc.

Prompt chung: “High-fidelity browser website UI design reference, large 1536x1024 readable composition, Vietnamese personal weekly planner brand weekdam. Existing brand uses warm cream #f4f0e8, ink #252521, locally hosted Inter sans-serif, muted sage accent #5c7053, soft mint/lemon/blush only for task difficulty. Calm premium layout with generous whitespace, no photos, no fake testimonials, no badges/metrics except real product information, no purple gradients. Thin dividers, rounded buttons 12px, soft product panel 20px radius. Clear Vietnamese diacritics. Design directly implementable in HTML/CSS.”

Prompt hero: header weekdam, Tính năng/Hướng dẫn, VI/EN, Mở kế hoạch; bố cục 43/57, “Một tuần rõ ràng. Một ngày nhẹ hơn.”; CTA và bảng ba ngày có việc mẫu, panel tiến độ. Prompt features: ba hàng mở Nhìn rõ cả tuần / Dành chỗ cho việc quan trọng / Tiến bộ, từng bước nhỏ, minh họa bảng, lịch giờ và độ khó. Prompt guide: tiêu đề “Bắt đầu nhẹ nhàng. Đi xa hơn mỗi tuần.”, tìm kiếm, mục lục sáu chủ đề, bài đầu có ba bước đánh số nối bằng đường dọc.

## Phân tích và chuyển thành giao diện

- Hero: ưu tiên headline và CTA; max-width khoảng 1280px, gutter 24–48px. Header 76px, khoảng trống trên hero 64–80px. Chữ display 48–64px, body 16–18px. Product preview có độ nghiêng nhẹ trên desktop, trở về phẳng trên điện thoại.
- Tính năng: layout thoáng, divider theo hàng, title 28–32px. Không thêm testimonial hay số người dùng giả. Nội dung tiến độ phản ánh đúng độ khó 1/2/3 trong ứng dụng.
- Hướng dẫn: heading 44–48px, search khoảng 780px; sidebar 220–230px, khoảng cách 40px, bài 15–16px/1.65. Chỉ dùng callout khi giải thích thao tác. Copy sửa các điểm không đúng trong hình tạo (ví dụ chọn màu dự án).
- Motion: entry theo thứ tự để đọc hero; reveal một lần theo viewport để đọc tính năng; transition ngắn khi đổi preview/đánh dấu công việc. Chỉ animate transform/opacity, không có vòng lặp kéo dài; reduced motion hiển thị ngay.
- Màu, logo, font và dữ liệu hiện có được giữ. Preview là dữ liệu mẫu độc lập. Trang landing không cần tải Firebase; planner và guide được tải khi mở.

## Đường dẫn

`/` giới thiệu; `/guide` hướng dẫn; `/app` kế hoạch. PWA mở `/app`, giữ manifest identity `/`. Hosting đã có SPA rewrite. Bản này đã phát hành lên Firebase Hosting ngày 11/10/2026; xem [bằng chứng deploy](DEPLOYMENT.md).
