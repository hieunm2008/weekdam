import { useTranslation } from "react-i18next";
import { statistics, shiftDate, today, type Plan } from "../domain";
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
        <h2>{t("weekByWeek")}</h2>
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
                <span
                  className="chart-workload"
                  style={{ height: Math.max(8, (w.total / max) * 150) }}
                >
                  <i style={{ height: w.percent + "%" }} />
                </span>
                <span>{w.week.start.slice(5)}</span>
              </button>
            ))}
        </div>
      </section>
      <section className="chart-section">
        <h2>{t("activity")}</h2>
        <p className="muted">{t("completedYear", { count: yearDone })}</p>
        <div className="activity-scroll">
          <div className="heatmap">
            {days.map((day) => (
              <span
                role="img"
                key={day}
                tabIndex={0}
                title={
                  day + ": " + (stats.activity[day] ?? 0) + " " + t("units")
                }
                aria-label={
                  day + ": " + (stats.activity[day] ?? 0) + " " + t("units")
                }
                className={
                  "heat heat-" +
                  Math.min(4, Math.ceil((stats.activity[day] ?? 0) / 2))
                }
              />
            ))}
          </div>
        </div>
      </section>
      <div className="weekday-charts">
        {[
          [
            "follow",
            stats.doneDays.map((done, i) =>
              stats.plannedDays[i]
                ? Math.round((done / stats.plannedDays[i]) * 100)
                : 0,
            ),
          ],
          [
            "distribution",
            stats.doneDays.map((done) =>
              stats.scheduledDone
                ? Math.round((done / stats.scheduledDone) * 100)
                : 0,
            ),
          ],
        ].map(([title, values]) => (
          <section className="chart-section" key={title as string}>
            <h2>{t(title as string)}</h2>
            <div className="weekday-bars">
              {(values as number[]).map((value, i) => (
                <div key={i}>
                  <span>{names[i]}</span>
                  <div className="mini-track">
                    <i style={{ width: value + "%" }} />
                  </div>
                  <strong>{value}%</strong>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
