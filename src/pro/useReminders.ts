import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Plan } from "../domain";
import {
  clearReminderInbox,
  defaultReminderSettings,
  dismissReminder,
  readReminderInbox,
  pruneReminderInbox,
  scanDeadlineReminders,
  type ReminderItem,
  type ReminderSettings,
} from "./reminders";

export async function requestBrowserReminderPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

interface MonitorOptions {
  uid: string;
  plan: Plan;
  settings: ReminderSettings;
  entitled: boolean;
  canUsePro?: () => boolean;
  onItems: (items: ReminderItem[]) => void;
  onError?: (error: Error) => void;
  onChange?: () => void;
}
/** The browser-facing controller also lets account cancellation be verified independently. */
export function createReminderMonitor(options: MonitorOptions) {
  let stopped = false;
  let revision = 0;
  let current = options;
  return {
    update(
      next: Pick<
        MonitorOptions,
        "plan" | "settings" | "entitled" | "canUsePro"
      >,
    ) {
      revision++;
      current = { ...current, ...next };
    },
    stop() {
      stopped = true;
      revision++;
    },
    async scan(reopened = false) {
      if (stopped) return;
      const snapshot = current;
      const expectedRevision = revision;
      try {
        const allowed = snapshot.entitled && (snapshot.canUsePro?.() ?? true);
        const result = allowed
          ? await scanDeadlineReminders(
              snapshot.uid,
              snapshot.plan,
              snapshot.settings,
              Date.now(),
              reopened,
            )
          : {
              items: await pruneReminderInbox(
                snapshot.uid,
                snapshot.plan,
                snapshot.settings,
                Date.now(),
              ),
              newItems: [],
            };
        if (stopped || revision !== expectedRevision) return;
        snapshot.onItems(result.items);
        if (result.newItems.length) snapshot.onChange?.();
        if (
          allowed &&
          (snapshot.canUsePro?.() ?? true) &&
          snapshot.settings.browserNotifications &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        )
          for (const item of result.newItems)
            if (!item.missed) {
              try {
                new Notification(item.title, {
                  body: `${item.projectName ? item.projectName + " · " : ""}${item.deadline}`,
                  tag: `weekdam-deadline:${snapshot.uid}:${item.id}`,
                });
              } catch {
                /* Mobile browsers may disallow this constructor. In-app inbox still works. */
              }
            }
      } catch (error) {
        if (!stopped && revision === expectedRevision)
          snapshot.onError?.(
            error instanceof Error ? error : new Error(String(error)),
          );
      }
    },
  };
}

export interface UseRemindersOptions {
  plan: Plan;
  uid: string | null | undefined;
  entitled: boolean;
  canUsePro?: () => boolean;
  settings?: ReminderSettings;
}

export function useReminders({
  plan,
  uid,
  entitled,
  canUsePro,
  settings,
}: UseRemindersOptions) {
  const resolvedSettings = useMemo(
    () => settings ?? plan.pro?.reminders ?? defaultReminderSettings(),
    [settings, plan.pro?.reminders],
  );
  const [state, setState] = useState<{
    uid: string | null | undefined;
    items: ReminderItem[];
    error?: string;
  }>({ uid, items: [] });
  const monitor = useRef<ReturnType<typeof createReminderMonitor> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const latest = useRef({
    plan,
    settings: resolvedSettings,
    entitled,
    canUsePro,
  });
  latest.current = { plan, settings: resolvedSettings, entitled, canUsePro };

  useEffect(() => {
    if (!uid) {
      monitor.current = null;
      return;
    }
    let cancelled = false;
    const broadcast =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("weekdam-deadline-reminders");
    channel.current = broadcast;
    const publish = (items: ReminderItem[]) => {
      if (!cancelled) setState({ uid, items });
    };
    const instance = createReminderMonitor({
      uid,
      ...latest.current,
      onItems: publish,
      onError: (error) => {
        if (!cancelled)
          setState((previous) => ({
            uid,
            items: previous.uid === uid ? previous.items : [],
            error: error.message,
          }));
      },
      onChange: () => broadcast?.postMessage({ uid }),
    });
    monitor.current = instance;
    const scan = () => {
      void instance.scan(false);
    };
    const focus = () => {
      void instance.scan(true);
    };
    const visible = () => {
      if (document.visibilityState === "visible") focus();
    };
    const receive = (event: MessageEvent) => {
      if (event.data?.uid === uid)
        void readReminderInbox(uid)
          .then(publish)
          .catch(() => {});
    };
    broadcast?.addEventListener("message", receive);
    const interval = window.setInterval(scan, 30000);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visible);
    void instance.scan(true);
    return () => {
      cancelled = true;
      instance.stop();
      window.clearInterval(interval);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visible);
      broadcast?.removeEventListener("message", receive);
      broadcast?.close();
      if (monitor.current === instance) monitor.current = null;
      if (channel.current === broadcast) channel.current = null;
    };
  }, [uid]);

  useEffect(() => {
    if (!monitor.current) return;
    monitor.current.update({
      plan,
      settings: resolvedSettings,
      entitled,
      canUsePro,
    });
    void monitor.current.scan(true);
  }, [plan, resolvedSettings, entitled, canUsePro, uid]);

  const dismiss = useCallback(
    async (id: string) => {
      if (!uid) return;
      await dismissReminder(uid, id);
      const items = await readReminderInbox(uid);
      setState((previous) =>
        previous.uid === uid ? { uid, items } : previous,
      );
      channel.current?.postMessage({ uid });
    },
    [uid],
  );
  const clear = useCallback(async () => {
    if (!uid) return;
    await clearReminderInbox(uid);
    setState((previous) =>
      previous.uid === uid ? { uid, items: [] } : previous,
    );
    channel.current?.postMessage({ uid });
  }, [uid]);
  return {
    items: state.uid === uid && uid ? state.items : [],
    error: state.uid === uid ? state.error : undefined,
    dismiss,
    clear,
  };
}
