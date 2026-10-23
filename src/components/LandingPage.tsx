import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  Clock3,
  Cloud,
  Folder,
  MoreHorizontal,
  WifiOff,
} from "lucide-react";
import {
  SiteFooter,
  SiteHeader,
  SiteLink,
  SiteReveal,
  type SiteProps,
} from "./SiteHeader";

const demoTasks = [
  {
    vi: "Đọc 20 trang sách",
    en: "Read 20 pages",
    projectVi: "Học tập",
    projectEn: "Learning",
    day: 0,
    tone: "mint",
  },
  {
    vi: "Phác thảo ý tưởng",
    en: "Sketch an idea",
    projectVi: "Dự án cá nhân",
    projectEn: "Personal project",
    day: 1,
    tone: "lemon",
  },
  {
    vi: "Đi bộ 30 phút",
    en: "Walk for 30 minutes",
    projectVi: "Sức khỏe",
    projectEn: "Wellbeing",
    day: 0,
    tone: "plain",
  },
  {
    vi: "Hoàn thành bản nháp",
    en: "Finish the first draft",
    projectVi: "Dự án cá nhân",
    projectEn: "Personal project",
    day: 2,
    tone: "blush",
  },
] as const;

function PlannerPreview({ vi }: { vi: boolean }) {
  const [view, setView] = useState("board");
  const [done, setDone] = useState<number[]>([2]);
  const toggle = (index: number) =>
    setDone((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  const days = vi
    ? ["Thứ Hai", "Thứ Ba", "Thứ Tư"]
    : ["Monday", "Tuesday", "Wednesday"];
  return (
    <div
      className="hero-preview hero-enter"
      style={{ animationDelay: "180ms" }}
    >
      <div
        className="demo-window"
        role="region"
        aria-label={vi ? "Thử kế hoạch mẫu" : "Try the sample planner"}
      >
        <div className="demo-topbar">
          <span>
            <img src="/icon.svg" width={20} height={20} alt="" />
            weekdam
          </span>
          <span className="demo-sample">
            {vi ? "BẢN XEM TRƯỚC" : "PREVIEW"}
          </span>
          <MoreHorizontal size={18} aria-hidden="true" />
        </div>
        <div className="demo-week">
          <div>
            <p>{vi ? "Tuần của bạn" : "Your week"}</p>
            <strong>
              {vi
                ? "Từng việc nhỏ. Đúng lúc."
                : "Small steps. At the right time."}
            </strong>
          </div>
          <CalendarDays size={20} aria-hidden="true" />
        </div>
        <div
          className="demo-tabs"
          role="group"
          aria-label={vi ? "Chế độ xem mẫu" : "Preview view"}
        >
          <button
            aria-pressed={view === "board"}
            onClick={() => setView("board")}
          >
            <CalendarDays size={14} aria-hidden="true" />
            {vi ? "Bảng theo ngày" : "Daily board"}
          </button>
          <button
            aria-pressed={view === "calendar"}
            onClick={() => setView("calendar")}
          >
            <Clock3 size={14} aria-hidden="true" />
            {vi ? "Lịch theo giờ" : "Hourly calendar"}
          </button>
        </div>
        <div className="demo-view" key={view}>
          {view === "board" ? (
            <div className="demo-board">
              {days.map((day, dayIndex) => (
                <div className="demo-day" key={day}>
                  <div className="demo-day-heading">
                    <span>{day}</span>
                    <span>
                      {demoTasks.filter((task) => task.day === dayIndex).length}
                    </span>
                  </div>
                  {demoTasks.map((task, index) =>
                    task.day === dayIndex ? (
                      <label
                        className={`demo-task demo-${task.tone}`}
                        key={index}
                        data-done={done.includes(index)}
                      >
                        <input
                          type="checkbox"
                          checked={done.includes(index)}
                          onChange={() => toggle(index)}
                          aria-label={vi ? task.vi : task.en}
                        />
                        <span className="demo-task-copy">
                          <strong>{vi ? task.vi : task.en}</strong>
                          <small>{vi ? task.projectVi : task.projectEn}</small>
                        </span>
                      </label>
                    ) : null,
                  )}
                  <span className="demo-day-rule" aria-hidden="true" />
                </div>
              ))}
            </div>
          ) : (
            <div className="demo-calendar">
              <div className="demo-calendar-header">
                <span />
                <span>{days[0]}</span>
                <span>{days[1]}</span>
              </div>
              {["09:00", "10:00", "11:00", "12:00"].map((time, index) => (
                <div className="demo-time-row" key={time}>
                  <span>{time}</span>
                  <div>
                    {index === 0 ? (
                      <span className="demo-event demo-mint">
                        {vi ? "Đọc 20 trang sách" : "Read 20 pages"}
                        <small>09:00 – 10:00</small>
                      </span>
                    ) : null}
                    {index === 2 ? (
                      <span className="demo-event demo-plain">
                        {vi ? "Đi bộ 30 phút" : "Walk for 30 minutes"}
                        <small>11:00 – 11:30</small>
                      </span>
                    ) : null}
                  </div>
                  <div>
                    {index === 1 ? (
                      <span className="demo-event demo-lemon">
                        {vi ? "Phác thảo ý tưởng" : "Sketch an idea"}
                        <small>10:00 – 11:00</small>
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="demo-bottom">
          <CheckCheck size={13} aria-hidden="true" />
          {vi
            ? "Thử đánh dấu một việc trong bảng"
            : "Try checking a task on the board"}
        </div>
      </div>
      <div className="demo-completion" aria-live="polite" aria-atomic="true">
        <span className="demo-completion-icon">
          <Check size={19} aria-hidden="true" />
        </span>
        <div>
          <p>{vi ? "Việc mẫu hoàn thành" : "Sample tasks completed"}</p>
          <strong key={done.length}>{done.length}/4</strong>
          <span className="demo-completion-note">
            {vi ? "từng bước một" : "one step at a time"}
          </span>
        </div>
        <div className="demo-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${done.length / 4})` }} />
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({
  kind,
  vi,
}: {
  kind: "board" | "calendar" | "progress";
  vi: boolean;
}) {
  if (kind === "board")
    return (
      <div className="feature-board" aria-hidden="true">
        {(vi
          ? ["Thứ Hai", "Thứ Ba", "Thứ Tư"]
          : ["Monday", "Tuesday", "Wednesday"]
        ).map((day, index) => (
          <div key={day}>
            <span>{day}</span>
            <div
              className={`feature-task demo-${["mint", "lemon", "blush"][index]}`}
            >
              <span className="feature-checkbox" />
              {vi
                ? ["Đọc sách", "Lên ý tưởng", "Viết bản nháp"][index]
                : ["Read a book", "Brainstorm", "Write a draft"][index]}
            </div>
            <div className="feature-task demo-plain">
              <span className="feature-checkbox" />
              {vi
                ? ["Đi bộ", "Học ngoại ngữ", "Ôn tập"][index]
                : ["Take a walk", "Learn a language", "Review"][index]}
            </div>
          </div>
        ))}
      </div>
    );
  if (kind === "calendar")
    return (
      <div className="feature-calendar" aria-hidden="true">
        <div className="feature-time">
          <span>09:00</span>
          <span>10:00</span>
          <span>11:00</span>
        </div>
        <div className="feature-events">
          <div className="demo-mint">
            <strong>{vi ? "Một giờ tập trung" : "One focused hour"}</strong>
            <span>09:00 – 10:00</span>
          </div>
          <div className="demo-lemon">
            <strong>
              {vi ? "Khoảng trống cho ý tưởng" : "Space for an idea"}
            </strong>
            <span>10:00 – 11:00</span>
          </div>
        </div>
      </div>
    );
  return (
    <div className="feature-weights" aria-hidden="true">
      {(vi ? ["Nhẹ", "Vừa", "Nặng"] : ["Light", "Medium", "Heavy"]).map(
        (weight, index) => (
          <div
            className={`demo-${["mint", "lemon", "blush"][index]}`}
            key={weight}
          >
            <span>{index + 1}</span>
            <strong>{weight}</strong>
            <small>{vi ? "đơn vị" : "units"}</small>
          </div>
        ),
      )}
    </div>
  );
}

export default function LandingPage({ onNavigate }: SiteProps) {
  const { i18n } = useTranslation();
  const vi = !i18n.language.startsWith("en");
  const features = vi
    ? [
        {
          kind: "board" as const,
          icon: Folder,
          title: "Nhìn rõ cả tuần.",
          text: "Gom công việc theo dự án, chia thành bước nhỏ và sắp xếp theo ngày. Khi kế hoạch thay đổi, chỉ cần kéo thẻ sang một ngày khác.",
        },
        {
          kind: "calendar" as const,
          icon: Clock3,
          title: "Dành chỗ cho điều quan trọng.",
          text: "Đặt giờ bắt đầu và kết thúc cho từng phiên làm việc. Một công việc có thể có nhiều khung giờ, vừa với nhịp sống của bạn.",
        },
        {
          kind: "progress" as const,
          icon: CheckCheck,
          title: "Tiến bộ, từng bước nhỏ.",
          text: "Độ khó 1, 2, 3 giúp tiến độ phản ánh công sức. Cuối tuần, nhìn lại những gì đã làm và chuyển việc còn lại sang tuần mới.",
        },
      ]
    : [
        {
          kind: "board" as const,
          icon: Folder,
          title: "See your whole week.",
          text: "Organize work into projects, break it into small steps and plan each day. When plans change, drag a card to another day.",
        },
        {
          kind: "calendar" as const,
          icon: Clock3,
          title: "Make time for what matters.",
          text: "Set a start and end time for each work session. Give a task several time blocks that fit the rhythm of your day.",
        },
        {
          kind: "progress" as const,
          icon: CheckCheck,
          title: "Progress, one small step at a time.",
          text: "Difficulty weights of 1, 2 and 3 reflect the effort you put in. Review a finished week and carry unfinished work into the next.",
        },
      ];
  return (
    <div className="site-page landing-page">
      <SiteHeader onNavigate={onNavigate} page="landing" />
      <main id="site-main">
        <section
          className="site-container landing-hero"
          aria-labelledby="landing-title"
        >
          <div className="hero-copy">
            <p className="site-eyebrow hero-enter">
              {vi
                ? "KẾ HOẠCH TUẦN, THEO CÁCH CỦA BẠN"
                : "YOUR WEEK, AT YOUR OWN PACE"}
            </p>
            <h1
              id="landing-title"
              tabIndex={-1}
              className="hero-enter"
              style={{ animationDelay: "70ms" }}
            >
              <span>{vi ? "Một tuần rõ ràng." : "A clearer week."}</span>
              <span>{vi ? "Một ngày nhẹ hơn." : "A lighter day."}</span>
            </h1>
            <p
              className="hero-description hero-enter"
              style={{ animationDelay: "130ms" }}
            >
              {vi
                ? "Gom việc cần làm, chia thành bước nhỏ. Dành thời gian cho điều quan trọng."
                : "Gather your tasks. Break them into small steps. Make time for what matters."}
            </p>
            <div
              className="hero-actions hero-enter"
              style={{ animationDelay: "200ms" }}
            >
              <SiteLink
                className="site-button"
                href="/app"
                onNavigate={onNavigate}
              >
                {vi ? "Bắt đầu tuần của bạn" : "Start your week"}
                <ArrowRight size={18} aria-hidden="true" />
              </SiteLink>
              <SiteLink
                className="site-text-link"
                href="/guide"
                onNavigate={onNavigate}
              >
                {vi ? "Hướng dẫn sử dụng" : "How to use weekdam"}
                <ArrowUpRight size={17} aria-hidden="true" />
              </SiteLink>
            </div>
            <p
              className="hero-note hero-enter"
              style={{ animationDelay: "260ms" }}
            >
              {vi
                ? "Dùng ngay, không cần tài khoản."
                : "Start right away. No account needed."}
            </p>
          </div>
          <PlannerPreview vi={vi} />
        </section>
        <div className="site-container landing-capabilities">
          {[
            {
              icon: CalendarDays,
              label: vi ? "Kế hoạch theo tuần" : "Weekly planning",
              hint: vi ? "Nhìn rộng, làm từng bước" : "See the bigger picture",
            },
            {
              icon: Clock3,
              label: vi ? "Lịch theo giờ" : "Time blocking",
              hint: vi ? "Mỗi việc có khoảng riêng" : "A place for each task",
            },
            {
              icon: WifiOff,
              label: vi ? "Lưu khi offline" : "Works offline",
              hint: vi ? "Kế hoạch luôn bên bạn" : "Keep your plans with you",
            },
          ].map(({ icon: Icon, label, hint }) => (
            <div key={label}>
              <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
              <span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
            </div>
          ))}
        </div>
        <section
          id="features"
          className="site-container landing-features"
          aria-labelledby="features-title"
          tabIndex={-1}
        >
          <SiteReveal>
            <h2 id="features-title">
              {vi ? (
                <>
                  Một nơi cho việc cần làm.
                  <br />
                  <span>Và thời gian để làm.</span>
                </>
              ) : (
                <>
                  A place for your plans.
                  <br />
                  <span>And time to make them happen.</span>
                </>
              )}
            </h2>
          </SiteReveal>
          <div className="feature-list">
            {features.map(({ kind, icon: Icon, title, text }) => (
              <SiteReveal className="feature-row" key={kind}>
                <div className="feature-copy">
                  <span className="feature-icon">
                    <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <FeatureVisual kind={kind} vi={vi} />
              </SiteReveal>
            ))}
          </div>
          <SiteReveal className="landing-local-note">
            <Cloud size={21} strokeWidth={1.5} aria-hidden="true" />
            <p>
              {vi ? (
                <>
                  Lưu trên thiết bị. <strong>Đồng bộ khi bạn sẵn sàng.</strong>
                </>
              ) : (
                <>
                  Saved on your device.{" "}
                  <strong>Sync when you are ready.</strong>
                </>
              )}
              <span>
                {vi
                  ? "Đăng nhập Google để tiếp tục kế hoạch trên thiết bị khác."
                  : "Sign in with Google to continue on another device."}
              </span>
            </p>
          </SiteReveal>
        </section>
        <SiteReveal className="site-container landing-guide">
          <div className="landing-guide-icon">
            <BookOpen size={32} strokeWidth={1.4} aria-hidden="true" />
          </div>
          <div>
            <h2>
              {vi
                ? "Tuần đầu tiên, bắt đầu từ đâu?"
                : "Your first week. Where to start?"}
            </h2>
            <p>
              {vi
                ? "Từ dự án đầu tiên đến một lịch tuần vừa sức. Hướng dẫn từng bước luôn ở đây."
                : "From your first project to a week that feels manageable. Follow the guide at your own pace."}
            </p>
          </div>
          <SiteLink
            className="site-text-link"
            href="/guide"
            onNavigate={onNavigate}
          >
            {vi ? "Khám phá hướng dẫn" : "Explore the guide"}
            <ArrowRight size={18} aria-hidden="true" />
          </SiteLink>
        </SiteReveal>
      </main>
      <SiteFooter onNavigate={onNavigate} />
    </div>
  );
}
