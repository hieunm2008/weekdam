import { useTranslation } from "react-i18next";
import { DndContext } from "@dnd-kit/core";
import type { ComponentProps } from "react";
export function useDndAccessibility(): ComponentProps<
  typeof DndContext
>["accessibility"] {
  const { t } = useTranslation();
  const target = (data: Record<string, unknown> | undefined) =>
    typeof data?.day === "number" && ["day", "step"].includes(String(data.type))
      ? t("dayNames").split(",")[data.day]
      : String(data?.label ?? t("subtasks"));
  return {
    screenReaderInstructions: { draggable: t("dragInstructions") },
    announcements: {
      onDragStart: ({ active }) =>
        t("dragPicked", { name: target(active.data.current) }),
      onDragOver: ({ over }) =>
        over ? t("dragOver", { name: target(over.data.current) }) : undefined,
      onDragEnd: ({ over }) =>
        over
          ? t("dragDropped", { name: target(over.data.current) })
          : t("dragCanceled"),
      onDragCancel: () => t("dragCanceled"),
    },
  };
}
