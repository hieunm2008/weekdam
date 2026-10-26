import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ArrowRight } from "lucide-react";
import { SiteFooter, SiteHeader, SiteLink, type SiteProps } from "./SiteHeader";
import "../pro/pro.css";

export default function PricingPage({ onNavigate }: SiteProps) {
  const { i18n } = useTranslation(),
    en = i18n.language.startsWith("en");
  const [period, setPeriod] = useState<"month" | "year">("month");
  const free = en
    ? [
        "Weekly planner & hourly calendar",
        "Pomodoro & basic statistics",
        "Google sync & backup",
      ]
    : [
        "Kế hoạch tuần & lịch theo giờ",
        "Pomodoro & thống kê cơ bản",
        "Đồng bộ Google & sao lưu",
      ];
  const pro = en
    ? [
        "Automatic exam planning",
        "Recurring tasks & classes",
        "Plan template library",
        "Detailed study reports & CSV / PDF",
        "Advanced deadline reminders",
      ]
    : [
        "Lập kế hoạch ôn thi tự động",
        "Công việc & lịch học lặp lại",
        "Thư viện mẫu kế hoạch",
        "Báo cáo học tập & CSV / PDF",
        "Nhắc deadline nâng cao",
      ];
  return (
    <div className="site-page">
      <SiteHeader page="pricing" onNavigate={onNavigate} />
      <main id="site-main" className="site-container pricing-page">
        <p className="site-kicker">WEEKDAM PRO</p>
        <h1>
          {en
            ? "Make room for your next exam with Pro."
            : "Dành thời gian cho điều cần học cùng Pro."}
        </h1>
        <p className="pricing-intro">
          {en
            ? "A weekly plan is a start. Pro helps turn a crowded syllabus into study sessions you can follow."
            : "Kế hoạch tuần là bước đầu. Pro giúp biến nội dung ôn tập dày đặc thành những buổi học vừa với thời gian của bạn."}
        </p>
        <div
          className="pro-tabs"
          aria-label={en ? "Billing period" : "Chu kỳ gói"}
        >
          <button
            aria-pressed={period === "month"}
            onClick={() => setPeriod("month")}
          >
            {en ? "Monthly" : "Theo tháng"}
          </button>
          <button
            aria-pressed={period === "year"}
            onClick={() => setPeriod("year")}
          >
            {en ? "Yearly" : "Theo năm"}
          </button>
        </div>
        <div className="pricing-columns">
          <section className="pro-panel">
            <p className="eyebrow">FREE</p>
            <h2>0đ</h2>
            <p>
              {en
                ? "Your everyday planning tools."
                : "Công cụ cho kế hoạch hằng ngày."}
            </p>
            <ul>
              {free.map((x) => (
                <li key={x}>
                  <Check size={17} />
                  {x}
                </li>
              ))}
            </ul>
            <SiteLink href="/app" onNavigate={onNavigate} className="secondary">
              {en ? "Open planner" : "Mở kế hoạch"}
            </SiteLink>
          </section>
          <section className="pro-panel pricing-pro">
            <p className="eyebrow">PRO</p>
            <h2>
              {period === "month" ? "29.000đ" : "249.000đ"}
              <small>
                {" "}
                /{" "}
                {period === "month"
                  ? en
                    ? "month"
                    : "tháng"
                  : en
                    ? "year"
                    : "năm"}
              </small>
            </h2>
            <p>
              {en
                ? "Everything in Free, plus five study tools."
                : "Toàn bộ Free, cùng năm công cụ học tập."}
            </p>
            <ul>
              {pro.map((x) => (
                <li key={x}>
                  <Check size={17} />
                  {x}
                </li>
              ))}
            </ul>
            <SiteLink
              href={`/app?plan=${period}#pro`}
              onNavigate={onNavigate}
              className="primary"
            >
              {en ? "Explore Pro" : "Khám phá Pro"}
              <ArrowRight size={17} />
            </SiteLink>
            <p className="muted">
              {en
                ? "One 7-day trial per Google account. No automatic renewal."
                : "Dùng thử 7 ngày một lần mỗi tài khoản Google. Không tự gia hạn."}
            </p>
          </section>
        </div>
        <p className="warning">
          {en
            ? "Simulated payment — no money charged. Prices are a business hypothesis for this student project. No card or bank details required."
            : "Thanh toán mô phỏng — không thu tiền. Giá là giả thuyết kinh doanh để khảo sát cho đồ án. Không yêu cầu thông tin thẻ/ngân hàng."}
        </p>
        <div className="pro-table-wrap">
          <table className="pro-table">
            <caption>
              {en ? "Compare Free and Pro" : "So sánh Free và Pro"}
            </caption>
            <thead>
              <tr>
                <th>{en ? "Feature" : "Tính năng"}</th>
                <th>Free</th>
                <th>Pro</th>
              </tr>
            </thead>
            <tbody>
              {free.map((x) => (
                <tr key={x}>
                  <th scope="row">{x}</th>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
              ))}
              {pro.map((x) => (
                <tr key={x}>
                  <th scope="row">{x}</th>
                  <td>—</td>
                  <td>✓</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          {en
            ? "After Pro expires, existing work remains editable, completable, deletable and included in backups. Creating new Pro work and running Pro tools require an active plan."
            : "Khi hết Pro, dữ liệu đã tạo vẫn xem, sửa, hoàn thành, xóa và sao lưu được. Tạo mới và chạy công cụ Pro cần gói còn hạn."}
        </p>
      </main>
      <SiteFooter onNavigate={onNavigate} />
    </div>
  );
}
