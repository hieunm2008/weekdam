import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Info, Search, X } from "lucide-react";
import { SiteFooter, SiteHeader, SiteLink, SiteReveal } from "./SiteHeader";
import "../guide.css";

interface GuideStep {
  title: string;
  text: string;
}

interface GuideArticle {
  id: string;
  nav: string;
  title: string;
  intro: string;
  steps?: GuideStep[];
  note?: { title: string; text: string };
  shortcuts?: { keys: string[]; text: string }[];
}

const guideContent = {
  vi: {
    eyebrow: "HƯỚNG DẪN SỬ DỤNG",
    title: "Bắt đầu nhẹ nhàng.\nĐi xa hơn mỗi tuần.",
    intro: "Từ công việc đầu tiên đến một tuần có nhịp điệu của riêng bạn.",
    search: "Tìm trong hướng dẫn",
    searchPlaceholder: "Tìm trong hướng dẫn…",
    clear: "Xóa tìm kiếm",
    topics: "Nội dung hướng dẫn",
    result: "chủ đề phù hợp",
    noResult: "Không tìm thấy",
    noResultHint: "Thử một từ khác, như “lịch”, “sao lưu” hoặc “phím tắt”.",
    showAll: "Xem tất cả hướng dẫn",
    openPlanner: "Mở kế hoạch",
    next: "Tiếp theo",
    firstWeek: "Tuần đầu tiên chỉ cần một việc nhỏ.",
    firstWeekHint:
      "Bạn có thể thêm chi tiết và điều chỉnh kế hoạch khi đã bắt đầu.",
    finish: "Đã sẵn sàng cho tuần của bạn?",
    finishHint: "Mở kế hoạch và bắt đầu với điều bạn muốn hoàn thành hôm nay.",
    articles: [
      {
        id: "getting-started",
        nav: "Bắt đầu",
        title: "Bắt đầu với tuần đầu tiên",
        intro:
          "Một dự án, một công việc, vài bước nhỏ. Chọn những điều quan trọng với bạn rồi dành chỗ cho chúng trong tuần.",
        steps: [
          {
            title: "Chọn tuần và tạo dự án",
            text: "Mở Kế hoạch, dùng Chọn tuần hoặc các mũi tên để tới tuần bạn muốn. Chọn Tạo dự án trong danh sách Dự án và đặt tên, chẳng hạn Học tập, Công việc hoặc Sức khỏe.",
          },
          {
            title: "Viết việc cần làm",
            text: "Nhấn Thêm công việc, nhập tên và chọn dự án. Bạn có thể thêm ghi chú hoặc hạn chót để nhớ những điều cần chuẩn bị, rồi nhấn Lưu.",
          },
          {
            title: "Chia thành những bước dễ bắt đầu",
            text: "Trong chi tiết công việc, chọn ngày hoặc Thêm bước nhỏ. Mỗi bước có ngày thực hiện, ghi chú và độ khó riêng. Bắt đầu với một bước vừa sức, rồi thêm các bước tiếp theo khi cần.",
          },
        ],
        note: {
          title: "Mỗi tuần có một kế hoạch riêng",
          text: "Bạn có thể lập kế hoạch cho những tuần sắp tới. Dùng Hôm nay để quay về tuần hiện tại; các tuần đã tạo vẫn có trong Lịch tuần.",
        },
      },
      {
        id: "board",
        nav: "Bảng theo ngày",
        title: "Bảng theo ngày",
        intro:
          "Nhìn cả tuần trong một lượt, rải những bước nhỏ vào từng ngày và điều chỉnh khi lịch của bạn thay đổi.",
        steps: [
          {
            title: "Xem cả tuần hoặc tập trung vào một ngày",
            text: "Chọn Bảng theo ngày trong Kế hoạch. Trên máy tính, chọn một ngày để xem tập trung rồi chọn Cả tuần để trở lại. Trên điện thoại, chọn ngày ở thanh ngày. Lọc Dự án khi bạn muốn tập trung vào một nhóm việc.",
          },
          {
            title: "Kéo để sắp xếp lại",
            text: "Kéo thân thẻ để đổi thứ tự trong ngày hoặc chuyển sang ngày khác. Trên điện thoại, giữ thẻ trước khi kéo; vuốt bình thường để cuộn. Bạn cũng có thể dùng Chuyển ngày trong thẻ công việc.",
          },
          {
            title: "Chọn độ khó và đánh dấu hoàn thành",
            text: "Nhẹ, Vừa và Nặng tương ứng 1, 2 và 3 đơn vị. Nhấn ô đánh dấu khi một bước đã xong. Thanh tiến độ của tuần tính theo các đơn vị này, nên bước lớn đóng góp nhiều hơn bước nhỏ.",
          },
        ],
        note: {
          title: "Một ngày bận hơn dự kiến?",
          text: "Chuyển việc sang ngày khác và chọn Đánh dấu ngày cũ là đã lỡ nếu bạn muốn giữ dấu vết của kế hoạch ban đầu. Bạn có thể bỏ dấu này sau đó.",
        },
      },
      {
        id: "calendar",
        nav: "Lịch theo giờ",
        title: "Lịch theo giờ",
        intro:
          "Liệt kê việc trước, rồi dành thời gian để thực hiện. Một công việc có thể có nhiều khung giờ trong cùng tuần.",
        steps: [
          {
            title: "Thêm việc vào danh sách",
            text: "Chọn Lịch theo giờ. Nhập một việc vào ô Thêm công việc nhanh, hoặc chọn Thêm nhiều công việc và dán tên, mỗi dòng một việc. Danh sách này thuộc tuần đang xem; dùng ô tìm kiếm để tìm lại việc cần xếp lịch.",
          },
          {
            title: "Dành một khung giờ",
            text: "Chọn Lên lịch bên cạnh công việc, đặt ngày, giờ bắt đầu và giờ kết thúc, rồi nhấn Lưu. Bạn cũng có thể kéo việc vào lịch, hoặc chọn tên việc rồi nhấn vào một vị trí trên lịch. Thêm ghi chú và độ khó cho từng phiên nếu cần.",
          },
          {
            title: "Điều chỉnh khi kế hoạch thay đổi",
            text: "Kéo một khung giờ sang ngày hoặc giờ khác để giữ nguyên thời lượng. Nhấn khung giờ để sửa chi tiết. Xóa khung giờ vẫn giữ công việc trong danh sách; Bỏ giờ giữ bước làm việc trong ngày ở khu vực Chưa có giờ.",
          },
        ],
        note: {
          title: "Chọn thời gian trong tuần đang xem",
          text: "Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày. Lịch hiển thị giờ Việt Nam; các khung giờ chồng nhau được đặt cạnh nhau. Dùng nút Lên lịch hoặc Sửa lịch nếu bạn thao tác bằng bàn phím.",
        },
      },
      {
        id: "weeks",
        nav: "Quản lý tuần",
        title: "Quản lý tuần",
        intro:
          "Giữ lại những gì đã làm được, chuyển những gì còn dang dở và bắt đầu tuần sau với một kế hoạch rõ ràng.",
        steps: [
          {
            title: "Dùng lại một kế hoạch",
            text: "Mở Quản lý tuần bằng nút ba chấm, chọn Sao chép kế hoạch và chọn các dự án cần lấy. Tới tuần đích, chọn Dán kế hoạch và dán JSON đã sao chép. Chọn Giữ tiến độ hoàn thành và ngày đã lỡ nếu bạn muốn giữ trạng thái cũ; hạn chót vẫn giữ ngày ban đầu.",
          },
          {
            title: "Kết thúc và chuyển việc chưa xong",
            text: "Trong Quản lý tuần, chọn Kết thúc tuần. Chọn Chuyển việc chưa xong sang tuần sau hoặc Kết thúc, không chuyển việc. Kết thúc những tuần cũ đang mở trước; bạn có thể kết thúc tuần hiện tại, còn tuần tương lai cần chờ tới lượt.",
          },
          {
            title: "Nhìn lại và mở lại khi cần",
            text: "Vào Lịch tuần để xem các kế hoạch đã lưu. Thống kê xuất hiện sau tuần đầu tiên được kết thúc, với tỷ lệ hoàn thành, tuần tốt nhất và nhịp làm việc theo ngày. Muốn chỉnh một tuần đã kết thúc, mở tuần đó rồi chọn Mở lại tuần.",
          },
        ],
        note: {
          title: "Việc đã chuyển vẫn được giữ",
          text: "Mở lại tuần cũ không xóa những việc đã chuyển sang tuần sau. Khi dùng Chuyển cả tuần, hãy chọn một tuần đích còn trống và chưa kết thúc.",
        },
      },
      {
        id: "storage",
        nav: "Lưu và đồng bộ",
        title: "Lưu, đồng bộ và sao lưu",
        intro:
          "Bắt đầu trên thiết bị của bạn, đăng nhập khi cần dùng nhiều nơi và giữ một bản sao kế hoạch bất cứ lúc nào.",
        steps: [
          {
            title: "Kế hoạch được lưu trên thiết bị",
            text: "Bạn có thể dùng ngay ở chế độ cá nhân mà không đăng nhập. Thay đổi được lưu trong trình duyệt này. Theo dõi trạng thái Đã lưu trên thiết bị ở phía trên kế hoạch và xuất bản sao trước khi xóa dữ liệu trình duyệt hoặc đổi thiết bị.",
          },
          {
            title: "Đồng bộ bằng tài khoản Google",
            text: "Mở Cài đặt và chọn Đăng nhập Google. Đăng nhập cùng tài khoản trên các thiết bị để đồng bộ. Lần đầu đăng nhập, nếu cả tài khoản và thiết bị đều có kế hoạch, chọn Gộp dữ liệu hoặc Dùng dữ liệu đã đồng bộ; bản cá nhân vẫn được giữ trên thiết bị.",
          },
          {
            title: "Tiếp tục khi mất mạng",
            text: "Mở ứng dụng online ít nhất một lần trước khi dùng offline. Bạn vẫn có thể sửa kế hoạch đã lưu; những thay đổi của tài khoản sẽ chờ đồng bộ khi kết nối trở lại. Trên Android Chrome, dùng Cài ứng dụng hoặc Thêm vào màn hình chính để mở weekdam như một ứng dụng.",
          },
          {
            title: "Giữ một bản sao JSON",
            text: "Vào Cài đặt → Sao lưu dữ liệu → Xuất JSON để tải bản sao. Chọn Nhập JSON để chọn tệp hoặc dán nội dung bản sao lưu weekdam, rồi nhấn Gộp dữ liệu. Tệp tối đa 5 MB; dữ liệu nhập được gộp với kế hoạch hiện có.",
          },
        ],
        note: {
          title: "Kiểm tra trạng thái trước khi đổi thiết bị",
          text: "Đã đồng bộ cho biết thay đổi đã tới tài khoản. Nếu thấy Đang đồng bộ, Đang offline hoặc Đồng bộ chưa thành công, giữ kế hoạch trên thiết bị và thử kết nối lại. Nếu đăng nhập chưa sẵn sàng, bạn vẫn có thể dùng và sao lưu bản cá nhân.",
        },
      },
      {
        id: "shortcuts",
        nav: "Phím tắt",
        title: "Phím tắt",
        intro:
          "Một vài phím quen thuộc để di chuyển nhanh. Các phím tắt kế hoạch hoạt động khi bạn không nhập vào biểu mẫu hoặc mở hộp thoại.",
        shortcuts: [
          { keys: ["N"], text: "Thêm công việc" },
          { keys: ["T"], text: "Trở về tuần hiện tại" },
          { keys: ["←", "→"], text: "Xem tuần trước hoặc tuần sau" },
          { keys: ["Ctrl / ⌘", "Z"], text: "Hoàn tác thay đổi gần nhất" },
          { keys: ["Space"], text: "Nhấc hoặc thả thẻ trong Bảng theo ngày" },
          { keys: ["↑", "↓", "←", "→"], text: "Di chuyển thẻ đã nhấc" },
          { keys: ["Esc"], text: "Hủy di chuyển thẻ hoặc đóng hộp thoại" },
          {
            keys: ["Tab", "Enter"],
            text: "Đi tới và kích hoạt các nút trên giao diện",
          },
        ],
        note: {
          title: "Hoàn tác trong phiên đang mở",
          text: "weekdam giữ tối đa 20 thay đổi để hoàn tác. Lịch theo giờ có các nút Lên lịch và Sửa lịch để chọn ngày, giờ bằng bàn phím mà không cần kéo thả.",
        },
      },
    ] satisfies GuideArticle[],
  },
  en: {
    eyebrow: "THE WEEKDAM GUIDE",
    title: "Start gently.\nGo further each week.",
    intro: "From your first task to a week with a rhythm of your own.",
    search: "Search the guide",
    searchPlaceholder: "Search the guide…",
    clear: "Clear search",
    topics: "Guide topics",
    result: "matching topics",
    noResult: "No results found",
    noResultHint:
      "Try another word, such as “calendar”, “backup” or “shortcuts”.",
    showAll: "Show all topics",
    openPlanner: "Open planner",
    next: "Up next",
    firstWeek: "Your first week can start with one small task.",
    firstWeekHint: "Add details and adjust your plan as you get going.",
    finish: "Ready to make room for your week?",
    finishHint:
      "Open your planner and start with what you want to finish today.",
    articles: [
      {
        id: "getting-started",
        nav: "Getting started",
        title: "Start with your first week",
        intro:
          "One project, one task and a few small steps. Choose what matters to you, then make room for it in your week.",
        steps: [
          {
            title: "Choose a week and create a project",
            text: "Open Plan and use Choose week or the arrows to pick your week. Select New project from Projects and give it a name, such as Learning, Work or Health.",
          },
          {
            title: "Write down what you want to do",
            text: "Select New task, enter a name and choose its project. Add a note or deadline if it helps you remember what to prepare, then select Save.",
          },
          {
            title: "Break it into small steps",
            text: "In the task details, select a day or Add a step. Each step has its own day, note and difficulty. Start with something manageable and add more steps when you need them.",
          },
        ],
        note: {
          title: "Each week has its own plan",
          text: "You can plan ahead for future weeks. Use Today to return to the current week; the weeks you have created stay available in Weeks.",
        },
      },
      {
        id: "board",
        nav: "Day board",
        title: "Day board",
        intro:
          "See the week at a glance, spread small steps across your days and rearrange them when life changes.",
        steps: [
          {
            title: "See the whole week or focus on a day",
            text: "Select Day board in Plan. On a computer, choose a day to focus on it and select All days to return. On your phone, select a day from the day bar. Use the project filter to focus on one group of tasks.",
          },
          {
            title: "Drag to rearrange your plan",
            text: "Drag the body of a card to reorder it within a day or move it to another day. On your phone, hold the card before dragging; swipe normally to scroll. You can also use Move to day on a task card.",
          },
          {
            title: "Set difficulty and mark steps complete",
            text: "Easy, Medium and Hard are worth 1, 2 and 3 units. Select the checkbox when a step is done. Your weekly progress uses these units, so a larger step contributes more than a smaller one.",
          },
        ],
        note: {
          title: "A day busier than expected?",
          text: "Move the task to another day and choose Mark the old day as missed if you want to keep a trace of your original plan. You can remove that mark later.",
        },
      },
      {
        id: "calendar",
        nav: "Hourly calendar",
        title: "Hourly calendar",
        intro:
          "List your tasks first, then make time to work on them. A task can have several time slots within the same week.",
        steps: [
          {
            title: "Add tasks to your list",
            text: "Select Hourly calendar. Enter a task in Quick add a task, or select Add multiple tasks and paste names, one per line. This list belongs to the week you are viewing; use search to find a task to schedule.",
          },
          {
            title: "Make a time slot",
            text: "Select Schedule next to a task, choose a day, start time and end time, then select Save. You can also drag a task onto the calendar, or select its name and then a position on the calendar. Add a note and difficulty for each session if needed.",
          },
          {
            title: "Adjust when your plans change",
            text: "Drag a time block to another day or time to keep its duration. Select the block to edit its details. Delete time block keeps the task in your list; Remove time keeps the step on its day in the No time area.",
          },
        ],
        note: {
          title: "Choose a time in the week you are viewing",
          text: "The end time must be after the start time on the same day. The calendar shows Vietnam time and places overlapping blocks side by side. Use Schedule or Edit time block when working with a keyboard.",
        },
      },
      {
        id: "weeks",
        nav: "Managing weeks",
        title: "Managing weeks",
        intro:
          "Keep what you have accomplished, carry forward unfinished work and start the next week with a clear plan.",
        steps: [
          {
            title: "Use a plan again",
            text: "Open Manage week with the three-dot button, select Copy plan and choose your projects. Go to the destination week, select Paste plan and paste the copied JSON. Choose Keep completion progress and missed days to keep the original status; deadlines keep their original dates.",
          },
          {
            title: "End the week and carry work forward",
            text: "In Manage week, select End week. Choose Carry unfinished work into next week or End without carrying work. Close earlier open weeks first. You can end the current week; future weeks need to wait their turn.",
          },
          {
            title: "Look back and reopen when needed",
            text: "Open Weeks to see your saved plans. Stats appear after you end your first week, showing completion, your best week and daily activity. To edit a finished week, open it and select Reopen week.",
          },
        ],
        note: {
          title: "Carried work stays in place",
          text: "Reopening an earlier week keeps the tasks already carried to the next week. To use Move whole week, choose an empty destination week that has not ended.",
        },
      },
      {
        id: "storage",
        nav: "Saving and sync",
        title: "Saving, sync and backups",
        intro:
          "Start on your device, sign in when you need more than one and keep a copy of your plan whenever you like.",
        steps: [
          {
            title: "Your plan is saved on this device",
            text: "You can start in personal mode without signing in. Changes are saved in this browser. Check for Saved on this device above your plan and export a copy before clearing browser data or moving to another device.",
          },
          {
            title: "Sync with your Google account",
            text: "Open Settings and select Sign in with Google. Use the same account on your devices to sync. On your first sign-in, if the account and device both have plans, choose Merge plans or Use synced plan; your personal copy stays on the device.",
          },
          {
            title: "Keep going without a connection",
            text: "Open the app online at least once before using it offline. You can keep editing saved plans; account changes wait to sync when you reconnect. On Android Chrome, use Install app or Add to Home screen to open weekdam like an app.",
          },
          {
            title: "Keep a JSON backup",
            text: "Go to Settings → Back up your plan → Export JSON to download a copy. Select Import JSON to choose a file or paste a weekdam backup, then select Merge plans. Files can be up to 5 MB; imported data is merged with your existing plan.",
          },
        ],
        note: {
          title: "Check your status before switching devices",
          text: "Synced means your changes have reached your account. If you see Syncing, Offline or Sync unsuccessful, keep your plan on the device and try reconnecting. When sign-in is unavailable, you can still use and back up your personal plan.",
        },
      },
      {
        id: "shortcuts",
        nav: "Keyboard shortcuts",
        title: "Keyboard shortcuts",
        intro:
          "A few familiar keys to move faster. Planner shortcuts work when you are not typing into a form or using a dialog.",
        shortcuts: [
          { keys: ["N"], text: "Add a task" },
          { keys: ["T"], text: "Return to the current week" },
          { keys: ["←", "→"], text: "View the previous or next week" },
          { keys: ["Ctrl / ⌘", "Z"], text: "Undo the latest change" },
          { keys: ["Space"], text: "Pick up or drop a card in Day board" },
          {
            keys: ["↑", "↓", "←", "→"],
            text: "Move a card you have picked up",
          },
          { keys: ["Esc"], text: "Cancel moving a card or close a dialog" },
          {
            keys: ["Tab", "Enter"],
            text: "Move to and activate interface buttons",
          },
        ],
        note: {
          title: "Undo in your current session",
          text: "weekdam keeps up to 20 changes for undo. Hourly calendar has Schedule and Edit time block buttons to choose a day and time with a keyboard, without dragging.",
        },
      },
    ] satisfies GuideArticle[],
  },
};

const searchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

function articleText(article: GuideArticle): string {
  return [
    article.nav,
    article.title,
    article.intro,
    ...(article.steps?.flatMap((step) => [step.title, step.text]) ?? []),
    article.note?.title ?? "",
    article.note?.text ?? "",
    ...(article.shortcuts?.flatMap((shortcut) => [
      ...shortcut.keys,
      shortcut.text,
    ]) ?? []),
  ].join(" ");
}

export default function GuidePage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { i18n } = useTranslation();
  const copy = guideContent[i18n.language === "vi" ? "vi" : "en"];
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState("getting-started");
  const searchInput = useRef<HTMLInputElement>(null);
  const articles: GuideArticle[] = copy.articles;
  const normalizedQuery = searchText(query);
  const visibleArticles = normalizedQuery
    ? articles.filter((article) =>
        searchText(
          articleText(article) +
            (article.id === "getting-started"
              ? ` ${copy.firstWeek} ${copy.firstWeekHint}`
              : ""),
        ).includes(normalizedQuery),
      )
    : articles;
  const currentTopic = visibleArticles.some(
    (article) => article.id === activeTopic,
  )
    ? activeTopic
    : visibleArticles[0]?.id;

  useEffect(() => {
    const headings = document.querySelectorAll<HTMLElement>(
      ".guide-page .guide-article-heading",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const entered = entries.find((entry) => entry.isIntersecting);
        if (entered) setActiveTopic(entered.target.id.replace("guide-", ""));
      },
      { rootMargin: "-100px 0px -65% 0px", threshold: 0 },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [copy, query]);

  function goToTopic(event: MouseEvent<HTMLAnchorElement>, topic: string) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.currentTarget.target === "_blank"
    )
      return;
    event.preventDefault();
    setQuery("");
    setActiveTopic(topic);
    onNavigate(`/guide#guide-${topic}`);
  }

  return (
    <div className="site-page guide-page">
      <SiteHeader onNavigate={onNavigate} page="guide" />
      <main id="site-main" className="site-container guide-main">
        <SiteReveal className="guide-intro">
          <p className="site-eyebrow">{copy.eyebrow}</p>
          <h1 tabIndex={-1}>{copy.title}</h1>
          <p className="guide-intro-text">{copy.intro}</p>
          <form
            className="guide-search"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search size={21} aria-hidden="true" />
            <input
              ref={searchInput}
              type="text"
              inputMode="search"
              aria-label={copy.search}
              placeholder={copy.searchPlaceholder}
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button
                type="button"
                aria-label={copy.clear}
                onClick={() => {
                  setQuery("");
                  searchInput.current?.focus();
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            ) : null}
          </form>
        </SiteReveal>
        <div className="guide-layout">
          <aside className="guide-sidebar">
            <nav aria-label={copy.topics} className="guide-topics">
              {articles.map((article, index) => (
                <a
                  key={article.id}
                  href={`/guide#guide-${article.id}`}
                  aria-current={
                    currentTopic === article.id ? "location" : undefined
                  }
                  onClick={(event) => goToTopic(event, article.id)}
                >
                  <span className="guide-topic-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{article.nav}</span>
                </a>
              ))}
            </nav>
            <SiteLink
              href="/app"
              className="guide-sidebar-cta"
              onNavigate={onNavigate}
            >
              {copy.openPlanner}
              <ArrowRight size={16} aria-hidden="true" />
            </SiteLink>
          </aside>
          <div className="guide-articles">
            <p className="guide-search-status" role="status" aria-live="polite">
              {query.trim() ? `${visibleArticles.length} ${copy.result}` : ""}
            </p>
            {visibleArticles.length ? (
              visibleArticles.map((article) => {
                const articleIndex = articles.findIndex(
                  (item) => item.id === article.id,
                );
                const nextArticle = articles[articleIndex + 1];
                return (
                  <article className="guide-article" key={article.id}>
                    <SiteReveal className="guide-article-content">
                      <div className="guide-article-title">
                        <span
                          className="guide-article-number"
                          aria-hidden="true"
                        >
                          {String(articleIndex + 1).padStart(2, "0")}
                        </span>
                        <h2
                          className="guide-article-heading"
                          id={`guide-${article.id}`}
                          tabIndex={-1}
                        >
                          {article.title}
                        </h2>
                      </div>
                      <p className="guide-article-intro">{article.intro}</p>
                      {article.steps ? (
                        <ol className="guide-steps">
                          {article.steps.map((step, stepIndex) => (
                            <li key={step.title}>
                              <span
                                className="guide-step-number"
                                aria-hidden="true"
                              >
                                {stepIndex + 1}
                              </span>
                              <div>
                                <h3>{step.title}</h3>
                                <p>{step.text}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      ) : null}
                      {article.shortcuts ? (
                        <dl className="guide-shortcuts">
                          {article.shortcuts.map((shortcut) => (
                            <div key={shortcut.text}>
                              <dt>
                                {shortcut.keys.map((key) => (
                                  <kbd key={key}>{key}</kbd>
                                ))}
                              </dt>
                              <dd>{shortcut.text}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      {article.id === "getting-started" ? (
                        <div className="guide-first-week">
                          <span className="guide-first-week-icon">
                            <Check size={22} aria-hidden="true" />
                          </span>
                          <div>
                            <strong>{copy.firstWeek}</strong>
                            <p>{copy.firstWeekHint}</p>
                          </div>
                          <SiteLink
                            href="/app"
                            className="guide-inline-cta"
                            onNavigate={onNavigate}
                          >
                            {copy.openPlanner}
                            <ArrowRight size={16} aria-hidden="true" />
                          </SiteLink>
                        </div>
                      ) : null}
                      {article.note ? (
                        <aside className="guide-note">
                          <Info size={18} aria-hidden="true" />
                          <div>
                            <h3>{article.note.title}</h3>
                            <p>{article.note.text}</p>
                          </div>
                        </aside>
                      ) : null}
                      {nextArticle && !query.trim() ? (
                        <p className="guide-next">
                          <span>{copy.next}</span>
                          <a
                            href={`/guide#guide-${nextArticle.id}`}
                            onClick={(event) =>
                              goToTopic(event, nextArticle.id)
                            }
                          >
                            {nextArticle.nav}
                            <ArrowRight size={16} aria-hidden="true" />
                          </a>
                        </p>
                      ) : null}
                    </SiteReveal>
                  </article>
                );
              })
            ) : (
              <div className="guide-no-results">
                <Search size={30} aria-hidden="true" />
                <h2>{copy.noResult}</h2>
                <p>{copy.noResultHint}</p>
                <button
                  className="site-button site-button-secondary"
                  onClick={() => {
                    setQuery("");
                    searchInput.current?.focus();
                  }}
                >
                  {copy.showAll}
                </button>
              </div>
            )}
          </div>
        </div>
        <SiteReveal className="guide-finish">
          <div>
            <h2>{copy.finish}</h2>
            <p>{copy.finishHint}</p>
          </div>
          <SiteLink href="/app" className="site-button" onNavigate={onNavigate}>
            {copy.openPlanner}
            <ArrowRight size={17} aria-hidden="true" />
          </SiteLink>
        </SiteReveal>
      </main>
      <SiteFooter onNavigate={onNavigate} />
    </div>
  );
}
