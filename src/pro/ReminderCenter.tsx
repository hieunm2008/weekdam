import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Plan } from "../domain";
import { useReminders } from "./useReminders";

export function ReminderCenter({
  plan,
  uid,
  entitled,
  canUsePro,
}: {
  plan: Plan;
  uid: string | null;
  entitled: boolean;
  canUsePro?: () => boolean;
}) {
  const { i18n } = useTranslation();
  const en = i18n.language.startsWith("en");
  const { items, error, dismiss, clear } = useReminders({
    plan,
    uid,
    entitled,
    canUsePro,
  });
  const [actionError, setActionError] = useState("");
  const run = (action: Promise<void>) => {
    setActionError("");
    void action.catch(() =>
      setActionError(
        en
          ? "Could not save dismissal. Try again."
          : "Chưa lưu được thao tác đóng nhắc. Hãy thử lại.",
      ),
    );
  };
  if (!uid || (!items.length && !error && !actionError)) return null;
  return (
    <aside
      className="pro-inbox"
      aria-label={en ? "Deadline reminder inbox" : "Hộp nhắc deadline"}
    >
      <details>
        <summary>
          {en
            ? `${items.length} deadline reminders`
            : `${items.length} nhắc deadline`}
          {items.some((item) => item.missed)
            ? en
              ? " · includes missed reminders"
              : " · có các mốc bị lỡ"
            : ""}
        </summary>
        <ul>
          {items.map((item) => (
            <li className="pro-row" key={item.id}>
              <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <strong>
                  {item.title || (en ? "Untitled" : "Chưa đặt tên")}
                </strong>
                <small>
                  {item.kind === "project"
                    ? "Project"
                    : en
                      ? "Task"
                      : "Công việc"}
                  {item.projectName ? ` · ${item.projectName}` : ""} ·{" "}
                  {new Intl.DateTimeFormat(en ? "en-GB" : "vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(item.deadlineAt))}
                </small>
                <small>
                  {item.missed
                    ? en
                      ? "Missed milestones: "
                      : "Các mốc đã đến: "
                    : en
                      ? "Reminder: "
                      : "Nhắc trước: "}
                  {item.offsetsMinutes
                    .map((minutes) =>
                      minutes >= 1440
                        ? `${minutes / 1440} ${en ? "days" : "ngày"}`
                        : minutes >= 60
                          ? `${minutes / 60} ${en ? "hours" : "giờ"}`
                          : `${minutes} ${en ? "minutes" : "phút"}`,
                    )
                    .join(", ")}
                </small>
              </div>
              <button
                type="button"
                className="secondary"
                style={{ flexShrink: 0 }}
                onClick={() => run(dismiss(item.id))}
                aria-label={`${en ? "Dismiss" : "Đóng nhắc"}: ${item.title}`}
              >
                {en ? "Dismiss" : "Đóng"}
              </button>
            </li>
          ))}
        </ul>
        {!!items.length && (
          <button
            type="button"
            className="secondary"
            onClick={() => run(clear())}
          >
            {en ? "Dismiss all" : "Đóng tất cả"}
          </button>
        )}
      </details>
      {(error || actionError) && (
        <p className="pro-error" role="alert">
          {actionError ||
            (en
              ? "Reminders could not access local storage. Reload the app to try again."
              : "Nhắc deadline chưa truy cập được bộ nhớ cục bộ. Tải lại app để thử lại.")}
        </p>
      )}
    </aside>
  );
}
export default ReminderCenter;
