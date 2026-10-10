import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { statistics, shiftDate, today, type Plan } from "../domain";

function ActivityHeatmap({
  days,
  activity,
}: {
  days: string[];
  activity: Record<string, number>;
}) {
  const { t, i18n } = useTranslation();
  const instructions = useId();
  const [focused, setFocused] = useState(days.length - 1);
  const cells = useRef<Array<HTMLSpanElement | null>>([]);
  const dates = new Intl.DateTimeFormat(
    i18n.language === "vi" ? "vi-VN" : "en-GB",
    { dateStyle: "medium", timeZone: "UTC" },
  );
  const navigate = (event: KeyboardEvent<HTMLSpanElement>, index: number) => {
    let next = index;
    switch (event.key) {
      case "ArrowUp":
        next--;
        break;
      case "ArrowDown":
        next++;
        break;
      case "ArrowLeft":
        next -= 7;
        break;
      case "ArrowRight":
        next += 7;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = days.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    next = Math.max(0, Math.min(days.length - 1, next));
    setFocused(next);
    cells.current[next]?.focus();
  };
  return (
    <>
      <p className="sr-only" id={instructions}>
        {t("heatmapInstructions")}
      </p>
      <div className="activity-scroll">
        <div
          className="heatmap"
          role="group"
          aria-label={t("activity")}
          aria-describedby={instructions}
        >
          {days.map((day, index) => {
            const label =
              dates.format(new Date(day + "T12:00:00Z")) +
              ": " +
              (activity[day] ?? 0) +
              " " +
              t("units");
            return (
              <span
                role="img"
                key={day}
                ref={(node) => {
                  cells.current[index] = node;
                }}
                tabIndex={focused === index ? 0 : -1}
                onFocus={() => setFocused(index)}
                onKeyDown={(event) => navigate(event, index)}
                title={label}
                aria-label={label}
                className={
                  "heat heat-" +
                  Math.min(4, Math.ceil((activity[day] ?? 0) / 2))
                }
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function Stats({
  plan,
  onWeek,
}: {
  plan: Plan;
  onWeek: (start: string) => void;
}) {
  const { t } = useTranslation(),
    stats = statistics(plan),
    names = t("mobileShort").split(",");
  if (!stats.count.length)
    return (
      <div className="page-empty">
        <h2>{t("stats")}</h2>
        <p>{t("emptyStats")}</p>
      </div>
    );
  const max = Math.max(...stats.count.map((w) => w.total), 1),
    days = Array.from({ length: 365 }, (_, i) => shiftDate(today(), i - 364));
  const yearDone = days.reduce((sum, d) => sum + (stats.activity[d] ?? 0), 0);
  const distribution = stats.doneDays.map((done) =>
    stats.scheduledDone ? Math.round((done / stats.scheduledDone) * 100) : 0,
  );
  const maxDistribution = Math.max(...distribution, 1);
  return (
    <div className="stats-page">
      <div className="stat-strip">
        <div>
          <span>{t("avg")}</span>
          <strong>
            {stats.percent}
            <small>%</small>
          </strong>
          <p>
            {stats.done}/{stats.total} {t("units")}
          </p>
        </div>
        <div>
          <span>{t("best")}</span>
          <strong>
            {stats.best
              ? statistics({ ...plan, weeks: [stats.best] }).percent
              : 0}
            <small>%</small>
          </strong>
          <button
            className="text-button"
            onClick={() => stats.best && onWeek(stats.best.start)}
          >
            {stats.best?.start}
          </button>
        </div>
        <div>
          <span>{t("streak")}</span>
          <strong>{stats.streak}</strong>
          <p>{t("streakHint")}</p>
        </div>
        <div>
          <span>{t("tracked")}</span>
          <strong>{stats.count.length}</strong>
          <p>
            {t("units")}: {stats.total}
          </p>
        </div>
      </div>
      <section className="chart-section">
        <div className="chart-heading">
          <h2>{t("weekByWeek")}</h2>
          <div className="chart-legend">
            <span>
              <i className="planned-key" />
              {t("plannedUnits")}
            </span>
            <span>
              <i className="completed-key" />
              {t("completedUnits")}
            </span>
          </div>
        </div>
        <div className="week-chart">
          {[...stats.count]
            .reverse()
            .slice(-12)
            .map((w) => (
              <button
                key={w.week.id}
                className="chart-column"
                aria-label={w.week.start + " · " + w.percent + "%"}
                onClick={() => onWeek(w.week.start)}
              >
                <span className="chart-value">{w.percent}%</span>
                <span className="chart-bars">
                  <span className="chart-bar-wrap">
                    <small>{w.total}</small>
                    <i
                      className="chart-planned"
                      style={{
                        height: w.total
                          ? Math.max(4, (w.total / max) * 150)
                          : 0,
                      }}
                    />
                  </span>
                  <span className="chart-bar-wrap">
                    <small>{w.done}</small>
                    <i
                      className="chart-completed"
                      style={{
                        height: w.done ? Math.max(4, (w.done / max) * 150) : 0,
                      }}
                    />
                  </span>
                </span>
                <span>{w.week.start.slice(5)}</span>
              </button>
            ))}
        </div>
      </section>
      <div className="stats-detail-row">
        <section className="chart-section activity-section">
          <h2>{t("activity")}</h2>
          <p className="muted">{t("completedYear", { count: yearDone })}</p>
          <ActivityHeatmap days={days} activity={stats.activity} />
        </section>
        <section className="chart-section distribution-section">
          <h2>{t("distribution")}</h2>
          <div className="distribution-chart">
            {distribution.map((value, i) => (
              <div key={i}>
                <strong>{value}%</strong>
                <i
                  style={{
                    height: value
                      ? Math.max(4, (value / maxDistribution) * 130)
                      : 0,
                  }}
                />
                <span>{names[i]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="chart-section">
        <h2>{t("follow")}</h2>
        <div className="weekday-bars">
          {stats.doneDays.map((done, i) => {
            const value = stats.plannedDays[i]
              ? Math.round((done / stats.plannedDays[i]) * 100)
              : 0;
            return (
              <div key={i}>
                <span>{names[i]}</span>
                <div className="mini-track">
                  <i style={{ width: value + "%" }} />
                </div>
                <strong>{value}%</strong>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
