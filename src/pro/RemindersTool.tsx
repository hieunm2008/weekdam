import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Plan } from "../domain";
import { defaultReminderSettings, type ReminderSettings } from "./reminders";
import { requestBrowserReminderPermission } from "./useReminders";

export function RemindersTool({
  plan,
  allowed,
  canUsePro,
  onChange,
  onRequire,
}: {
  plan: Plan;
  allowed: boolean;
  canUsePro?: () => boolean;
  onChange: (settings: ReminderSettings) => void;
  onRequire: () => void;
}) {
  const { i18n } = useTranslation();
  const en = i18n.language.startsWith("en");
  const settings = useMemo(
    () => plan.pro?.reminders ?? defaultReminderSettings(),
    [plan.pro?.reminders],
  );
  const [status, setStatus] = useState("");
  const [requesting, setRequesting] = useState(false);
  const active = useRef(true);
  const latestAllowed = useRef(allowed);
  latestAllowed.current = allowed;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const commit = (next: ReminderSettings) => {
    if (!latestAllowed.current || !(canUsePro?.() ?? true)) {
      onRequire();
      return;
    }
    onChange(next);
  };
  const browser = async () => {
    if (!allowed || !(canUsePro?.() ?? true)) {
      onRequire();
      return;
    }
    if (settings.browserNotifications) {
      commit({ ...settings, browserNotifications: false });
      return;
    }
    setRequesting(true);
    try {
      const permission = await requestBrowserReminderPermission();
      if (!active.current) return;
      if (!latestAllowed.current || !(canUsePro?.() ?? true)) {
        onRequire();
        return;
      }
      if (permission === "granted") {
        commit({ ...settings, browserNotifications: true });
        setStatus(
          en
            ? "Browser notifications enabled."
            : "Đã bật thông báo trình duyệt.",
        );
      } else
        setStatus(
          en
            ? "Browser notifications are unavailable or denied. In-app reminders still work."
            : "Trình duyệt chưa hỗ trợ hoặc đã từ chối quyền. Nhắc trong app vẫn hoạt động.",
        );
    } catch {
      if (active.current)
        setStatus(
          en
            ? "Permission could not be requested. In-app reminders still work."
            : "Chưa xin được quyền thông báo. Nhắc trong app vẫn hoạt động.",
        );
    } finally {
      if (active.current) setRequesting(false);
    }
  };
  const options = [
    { minutes: 10080, label: en ? "7 days before" : "Trước 7 ngày" },
    { minutes: 4320, label: en ? "3 days before" : "Trước 3 ngày" },
    { minutes: 1440, label: en ? "1 day before" : "Trước 1 ngày" },
    { minutes: 120, label: en ? "2 hours before" : "Trước 2 giờ" },
    { minutes: 60, label: en ? "1 hour before" : "Trước 1 giờ" },
    { minutes: 30, label: en ? "30 minutes before" : "Trước 30 phút" },
  ];
  return (
    <section className="pro-panel" aria-labelledby="pro-reminders-title">
      <h2 id="pro-reminders-title">
        {en ? "Advanced deadline reminders" : "Nhắc deadline nâng cao"}
      </h2>
      <p>
        {en
          ? "Reminders cover task and project deadlines while the app is open. Reopening groups missed milestones by task or project."
          : "Nhắc deadline công việc và project khi app đang mở. Mở lại sẽ thấy các mốc bị lỡ gộp theo công việc hoặc project."}
      </p>
      {!allowed && (
        <p className="pro-hint">
          {en
            ? "Preview the settings. Pro is required to enable reminders."
            : "Xem trước cấu hình. Cần Pro để bật nhắc deadline."}
        </p>
      )}
      <div className="pro-checks">
        <label>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) =>
              commit({ ...settings, enabled: event.target.checked })
            }
          />
          {en ? "Enable in-app reminders" : "Bật nhắc trong ứng dụng"}
        </label>
      </div>
      <fieldset>
        <legend>{en ? "Reminder milestones" : "Các mốc nhắc"}</legend>
        <div className="pro-checks">
          {options.map((option) => (
            <label key={option.minutes}>
              <input
                type="checkbox"
                value={option.minutes}
                checked={settings.offsetsMinutes.includes(option.minutes)}
                onChange={(event) => {
                  const offsets = event.target.checked
                    ? [...settings.offsetsMinutes, option.minutes]
                    : settings.offsetsMinutes.filter(
                        (minutes) => minutes !== option.minutes,
                      );
                  commit({
                    ...settings,
                    offsetsMinutes: [...new Set(offsets)].sort((a, b) => b - a),
                  });
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="pro-hint">
        {en
          ? "Date-only deadlines mean 23:59 in Vietnam (Asia/Ho_Chi_Minh). Completed or deleted tasks are skipped. Each project is reminded once per milestone."
          : "Deadline chỉ có ngày được hiểu là 23:59 giờ Việt Nam (Asia/Ho_Chi_Minh). Bỏ qua việc đã hoàn thành hoặc xóa. Mỗi project được nhắc một lần cho mỗi mốc."}
      </p>
      <div className="pro-actions">
        <button
          type="button"
          className="secondary"
          disabled={requesting}
          onClick={() => void browser()}
        >
          {requesting
            ? en
              ? "Requesting permission…"
              : "Đang xin quyền…"
            : settings.browserNotifications
              ? en
                ? "Disable browser notifications"
                : "Tắt thông báo trình duyệt"
              : en
                ? "Enable browser notifications"
                : "Bật thông báo trình duyệt"}
        </button>
      </div>
      <p className="pro-hint">
        {en
          ? "Notifications are optional. No background or email reminders; in-app reminders work offline and when browser permission is denied."
          : "Thông báo là tùy chọn. Không nhắc nền hoặc gửi email; nhắc trong app vẫn hoạt động khi offline hoặc bị từ chối quyền trình duyệt."}
      </p>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
export default RemindersTool;
