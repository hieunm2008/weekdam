import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import LandingPage from "./components/LandingPage";
import i18n from "./i18n";

const App = lazy(() => import("./App"));
const GuidePage = lazy(() => import("./components/GuidePage"));
const PricingPage = lazy(() => import("./components/PricingPage"));

type SiteLocation = {
  pathname: string;
  hash: string;
  key: number;
  focus: boolean;
  scroll?: { x: number; y: number };
};

const currentLocation = (focus = false): SiteLocation => ({
  pathname: window.location.pathname.replace(/\/+$/, "") || "/",
  hash: window.location.hash,
  key: 0,
  focus,
});

function RouteViewport({
  location,
  children,
}: {
  location: SiteLocation;
  children: ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!location.focus && !location.hash) return;
    const restore = () => {
      const pageHeading =
        viewport.current?.querySelector<HTMLElement>("main h1, h1");
      if (!pageHeading) return false;
      let anchorId = location.hash.slice(1);
      try {
        anchorId = decodeURIComponent(anchorId);
      } catch {
        // A malformed fragment still opens its page normally.
      }
      const anchor = location.hash ? document.getElementById(anchorId) : null;
      if (anchor)
        anchor.scrollIntoView({ behavior: "instant", block: "start" });
      else
        window.scrollTo({
          top: location.scroll?.y ?? 0,
          left: location.scroll?.x ?? 0,
          behavior: "instant",
        });
      if (location.focus) {
        const heading = anchor ?? pageHeading;
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      }
      return true;
    };
    const observer = new MutationObserver(() => {
      if (restore()) observer.disconnect();
    });
    const frame = requestAnimationFrame(() => {
      if (!restore() && viewport.current)
        observer.observe(viewport.current, { childList: true, subtree: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [location]);
  return <div ref={viewport}>{children}</div>;
}

export default function Website() {
  const { t } = useTranslation();
  const [location, setLocation] = useState(currentLocation);
  const page =
    location.pathname === "/app"
      ? "app"
      : location.pathname === "/pricing"
        ? "pricing"
        : location.pathname === "/guide"
          ? "guide"
          : "landing";
  const english = i18n.language.startsWith("en");

  const navigate = useCallback((path: string) => {
    const target = new URL(path, window.location.origin);
    if (target.origin !== window.location.origin) return;
    if (target.href === window.location.href) {
      setLocation((previous) => ({
        ...currentLocation(true),
        key: previous.key + 1,
      }));
      return;
    }
    history.replaceState(
      {
        ...history.state,
        weekdamScroll: { x: window.scrollX, y: window.scrollY },
      },
      "",
    );
    history.pushState({ weekdamScroll: { x: 0, y: 0 } }, "", target);
    setLocation((previous) => ({
      ...currentLocation(true),
      key: previous.key + 1,
    }));
  }, []);

  useEffect(() => {
    const restoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const back = (event: PopStateEvent) => {
      setLocation((previous) => ({
        ...currentLocation(true),
        key: previous.key + 1,
        scroll: event.state?.weekdamScroll,
      }));
    };
    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener("popstate", back);
      history.scrollRestoration = restoration;
    };
  }, []);

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const saved = localStorage.getItem("weekdam:theme");
      const theme =
        saved === "dark" || saved === "light"
          ? saved
          : media.matches
            ? "dark"
            : "light";
      document.documentElement.dataset.theme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "dark" ? "#171816" : "#f4f0e8");
    };
    const applySettings = (event: StorageEvent) => {
      if (event.key === "weekdam:theme") applyTheme();
      if (event.key === "weekdam:language")
        void i18n.changeLanguage(event.newValue === "en" ? "en" : "vi");
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    window.addEventListener("storage", applySettings);
    return () => {
      media.removeEventListener("change", applyTheme);
      window.removeEventListener("storage", applySettings);
    };
  }, [page]);

  useEffect(() => {
    document.documentElement.lang = english ? "en" : "vi";
    const metadata = english
      ? {
          pricing: [
            "weekdam · Pro pricing",
            "Compare Free and Pro. Simulated checkout for a student project.",
          ],
          landing: [
            "weekdam · A clearer week, one small step at a time",
            "Plan your week with small steps, a daily board and a calendar. Start on your device, then sync with Google when you need it.",
          ],
          guide: [
            "weekdam · User guide",
            "Learn to create projects, plan daily steps, schedule your week, track progress, back up your data and sync across devices with weekdam.",
          ],
          app: [
            "weekdam · Weekly planner",
            "Your personal weekly planner. Organize projects, small steps and time blocks in one clear workspace.",
          ],
        }
      : {
          pricing: [
            "weekdam · Bảng giá Pro",
            "So sánh Free và Pro. Thanh toán mô phỏng cho đồ án.",
          ],
          landing: [
            "weekdam · Từng việc nhỏ, một tuần rõ ràng",
            "Lên kế hoạch tuần với những bước nhỏ, bảng theo ngày và lịch theo giờ. Bắt đầu ngay trên thiết bị, đồng bộ Google khi bạn cần.",
          ],
          guide: [
            "weekdam · Hướng dẫn sử dụng",
            "Hướng dẫn tạo dự án, chia bước nhỏ, lên lịch tuần, theo dõi tiến độ, sao lưu dữ liệu và đồng bộ nhiều thiết bị với weekdam.",
          ],
          app: [
            "weekdam · Kế hoạch tuần",
            "Kế hoạch tuần cá nhân. Sắp xếp dự án, từng bước nhỏ và lịch làm việc trong một không gian rõ ràng.",
          ],
        };
    document.title = metadata[page][0];
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", metadata[page][1]);
  }, [page, english]);

  return (
    <Suspense
      fallback={
        <div className="site-loading" role="status">
          <img src="/icon.svg" width={40} height={40} alt="" />
          <span>{t("loading")}</span>
        </div>
      }
    >
      <RouteViewport location={location}>
        {page === "app" ? (
          <App onNavigate={navigate} />
        ) : page === "guide" ? (
          <GuidePage onNavigate={navigate} />
        ) : page === "pricing" ? (
          <PricingPage onNavigate={navigate} />
        ) : (
          <LandingPage onNavigate={navigate} />
        )}
      </RouteViewport>
    </Suspense>
  );
}
