import {
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowUpRight, Moon, Sun } from "lucide-react";
import i18n from "../i18n";

export type SiteProps = { onNavigate: (path: string) => void };

export function SiteLink({
  href = "/",
  onNavigate,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & SiteProps) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank"
        )
          return;
        event.preventDefault();
        onNavigate(href);
      }}
    >
      {children}
    </a>
  );
}

export function SiteHeader({
  onNavigate,
  page,
}: SiteProps & { page: "landing" | "guide" }) {
  const { i18n: language } = useTranslation();
  const vi = !language.language.startsWith("en");
  const switchLanguage = () => {
    const next = vi ? "en" : "vi";
    localStorage.setItem("weekdam:language", next);
    void i18n.changeLanguage(next);
  };
  const switchTheme = () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("weekdam:theme", next);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#171816" : "#f4f0e8");
  };
  return (
    <header className="site-header">
      <a className="site-skip" href="#site-main">
        {vi ? "Đến nội dung chính" : "Skip to content"}
      </a>
      <div className="site-container site-header-inner">
        <SiteLink
          className="site-brand"
          href="/"
          onNavigate={onNavigate}
          aria-label={vi ? "weekdam · Trang chủ" : "weekdam · Home"}
        >
          <img src="/icon.svg" width={32} height={32} alt="" />
          <span>weekdam</span>
        </SiteLink>
        <nav
          className="site-nav"
          aria-label={vi ? "Điều hướng trang web" : "Website navigation"}
        >
          <SiteLink
            href={page === "guide" ? "/" : "/#features"}
            onNavigate={onNavigate}
          >
            {vi
              ? page === "guide"
                ? "Trang chủ"
                : "Tính năng"
              : page === "guide"
                ? "Home"
                : "Features"}
          </SiteLink>
          <SiteLink
            href="/guide"
            onNavigate={onNavigate}
            aria-current={page === "guide" ? "page" : undefined}
          >
            {vi ? "Hướng dẫn" : "Guide"}
          </SiteLink>
        </nav>
        <div className="site-header-actions">
          <button
            className="site-theme"
            onClick={switchTheme}
            aria-label={vi ? "Đổi giao diện sáng tối" : "Toggle color theme"}
          >
            <Sun className="site-sun" size={18} aria-hidden="true" />
            <Moon className="site-moon" size={18} aria-hidden="true" />
          </button>
          <button
            className="site-language"
            onClick={switchLanguage}
            aria-label={vi ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"}
          >
            {vi ? "VI" : "EN"}
            <span aria-hidden="true"> / {vi ? "EN" : "VI"}</span>
          </button>
          <SiteLink
            className="site-button site-button-small"
            href="/app"
            onNavigate={onNavigate}
          >
            {vi ? "Mở kế hoạch" : "Open planner"}
            <ArrowRight size={16} aria-hidden="true" />
          </SiteLink>
        </div>
      </div>
    </header>
  );
}

export function SiteReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = element.current;
    if (
      !node ||
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    )
      return;
    node.dataset.reveal = "waiting";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          node.dataset.reveal = "visible";
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      delete node.dataset.reveal;
    };
  }, []);
  return (
    <div
      ref={element}
      className={`site-reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function SiteFooter({ onNavigate }: SiteProps) {
  const { i18n: language } = useTranslation();
  const vi = !language.language.startsWith("en");
  return (
    <footer className="site-footer site-container">
      <div>
        <SiteLink className="site-brand" href="/" onNavigate={onNavigate}>
          <img src="/icon.svg" width={26} height={26} alt="" />
          <span>weekdam</span>
        </SiteLink>
        <p>
          {vi
            ? "Từng việc nhỏ, một tuần rõ ràng."
            : "A clearer week, one small step at a time."}
        </p>
      </div>
      <nav aria-label={vi ? "Liên kết cuối trang" : "Footer links"}>
        <SiteLink href="/guide" onNavigate={onNavigate}>
          {vi ? "Hướng dẫn sử dụng" : "User guide"}
        </SiteLink>
        <SiteLink href="/app" onNavigate={onNavigate}>
          {vi ? "Vào không gian của bạn" : "Your workspace"}
          <ArrowUpRight size={16} aria-hidden="true" />
        </SiteLink>
      </nav>
    </footer>
  );
}
