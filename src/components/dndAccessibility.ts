import { useTranslation } from "react-i18next";
import { DndContext } from "@dnd-kit/core";
import { useRef, type ComponentProps } from "react";
export function useDndAccessibility(): ComponentProps<
  typeof DndContext
>["accessibility"] {
  const { t } = useTranslation();
  const lastDestination = useRef<string | null>(null);
  const target = (data: Record<string, unknown> | undefined) =>
    typeof data?.day === "number" && ["day", "step"].includes(String(data.type))
      ? (data.label ? String(data.label) + " · " : "") +
        t("dayNames").split(",")[data.day]
      : String(data?.label ?? t("subtasks"));
  const destination = (data: Record<string, unknown> | undefined) => {
    const name = target(data);
    return data?.insertionEdge === "before"
      ? t("dragBefore", { name })
      : data?.insertionEdge === "after"
        ? t("dragAfter", { name })
        : name;
  };
  const announceDestination = (data: Record<string, unknown> | undefined) => {
    if (!data) {
      lastDestination.current = null;
      return undefined;
    }
    const name = destination(data);
    if (name === lastDestination.current) return undefined;
    lastDestination.current = name;
    return t("dragOver", { name });
  };
  return {
    screenReaderInstructions: { draggable: t("dragInstructions") },
    announcements: {
      onDragStart: ({ active }) => {
        lastDestination.current = null;
        return t("dragPicked", { name: target(active.data.current) });
      },
      onDragMove: ({ over }) => announceDestination(over?.data.current),
      onDragOver: ({ over }) => announceDestination(over?.data.current),
      onDragEnd: ({ over }) =>
        over
          ? t("dragDropped", { name: destination(over.data.current) })
          : t("dragCanceled"),
      onDragCancel: () => t("dragCanceled"),
    },
  };
}
