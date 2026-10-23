import { useTranslation } from "react-i18next";
import type { Weight } from "../domain";

export function DifficultyBadge({ value }: { value: Weight }) {
  const { t } = useTranslation();
  const label = t(["easy", "medium", "hard"][value - 1]);
  const description = t("difficulty") + ": " + label;
  return (
    <span
      role="img"
      className="difficulty-badge"
      data-difficulty={value}
      aria-label={description}
      title={description}
    >
      <span className="difficulty-pips" aria-hidden="true">
        {[1, 2, 3].map((level) => (
          <i key={level} className={level <= value ? "filled" : ""} />
        ))}
      </span>
      {label}
    </span>
  );
}
