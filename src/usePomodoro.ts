import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  claimPomodoroChime,
  dispatchPomodoroAction,
  loadPomodoroRuntime,
} from "./storage";
import {
  remainingPomodoroMs,
  type PomodoroAction,
  type PomodoroRuntime,
} from "./pomodoro";
import {
  enablePomodoroNotifications,
  canRingPomodoro,
  primePomodoroAudio,
  ringPomodoro,
  showPomodoroNotification,
} from "./pomodoroAlerts";

export function usePomodoro(
  scope: string,
  enabled: boolean,
  onHistoryChanged: (scope: string) => Promise<void>,
) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    runtime: PomodoroRuntime;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const retry = useCallback(
    () => setReloadVersion((version) => version + 1),
    [],
  );
  const current = useRef<{ scope: string; runtime: PomodoroRuntime } | null>(
    null,
  );
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const channel = useRef<BroadcastChannel | null>(null);
  const completing = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const publish = useCallback((changedScope: string, revision: number) => {
    const data = { scope: changedScope, revision };
    channel.current?.postMessage(data);
    if (!channel.current) {
      try {
        localStorage.setItem(
          "weekdam:pomodoro-change",
          JSON.stringify({ ...data, at: Date.now() }),
        );
      } catch {
        /* The persisted state remains available on visibility/reload. */
      }
    }
  }, []);
  const accept = useCallback((nextScope: string, runtime: PomodoroRuntime) => {
    if (activeScope.current !== nextScope) return;
    const previous = current.current;
    if (
      previous?.scope === nextScope &&
      previous.runtime.revision > runtime.revision
    )
      return;
    current.current = { scope: nextScope, runtime };
    setSnapshot(current.current);
  }, []);
  const deliverChime = useCallback(
    async (runtime: PomodoroRuntime) => {
      if (
        activeScope.current !== scope ||
        !runtime.settings.sound ||
        !canRingPomodoro() ||
        runtime.completionRevision === undefined
      )
        return;
      if (await claimPomodoroChime(scope, runtime.completionRevision)) {
        if (activeScope.current === scope) ringPomodoro();
      }
    },
    [scope],
  );

  const action = useCallback(
    async (requested: PomodoroAction) => {
      const previous = current.current;
      if (
        !enabledRef.current ||
        !previous ||
        previous.scope !== scope ||
        activeScope.current !== scope
      )
        return;
      if (
        (["start", "next", "resume"].includes(requested.type) &&
          previous.runtime.settings.sound) ||
        (requested.type === "settings" && requested.settings.sound)
      ) {
        void primePomodoroAudio().catch(() => {});
      }
      try {
        const result = await dispatchPomodoroAction(scope, {
          ...requested,
          expectedRevision: previous.runtime.revision,
          expectedSessionId: previous.runtime.sessionId,
        });
        if (result.changed) publish(scope, result.runtime.revision);
        if (activeScope.current !== scope) return;
        const learnedCompletion =
          result.runtime.completionRevision !== undefined &&
          result.runtime.completionRevision >
            (previous.runtime.completionRevision ?? 0);
        accept(scope, result.runtime);
        setError("");
        if (result.session || learnedCompletion) await onHistoryChanged(scope);
        if (activeScope.current !== scope) return;
        if (result.phaseCompleted || learnedCompletion) {
          const message = t(
            result.runtime.completionPhase === "focus"
              ? "pomodoroFocusFinished"
              : "pomodoroBreakFinished",
          );
          setNotice(message);
          void deliverChime(result.runtime).catch(() => {});
          if (result.phaseCompleted && result.runtime.settings.notifications) {
            void showPomodoroNotification(
              "Pomodoro · weekdam",
              message,
              `pomodoro-${scope}-${result.runtime.revision}`,
            ).catch(() => {
              if (activeScope.current === scope)
                setNotice(t("pomodoroNotificationFailed"));
            });
          }
        } else if (result.session) setNotice(t("pomodoroStoppedSaved"));
        else if (result.changed) setNotice("");
      } catch {
        if (activeScope.current === scope) setError(t("pomodoroSaveError"));
      }
    },
    [scope, accept, onHistoryChanged, publish, deliverChime, t],
  );
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    const last = current.current;
    if (last && last.scope !== scope) {
      void dispatchPomodoroAction(last.scope, { type: "pause" })
        .then((result) => {
          if (result.changed) publish(last.scope, result.runtime.revision);
        })
        .catch(() => {});
    }
    current.current = null;
    setSnapshot(null);
    setError("");
    setNotice("");
    let active = true;
    const refresh = async () => {
      if (!enabledRef.current) return;
      try {
        const [runtime] = await Promise.all([
          loadPomodoroRuntime(scope),
          onHistoryChanged(scope),
        ]);
        if (!active || activeScope.current !== scope) return;
        const previous = current.current;
        accept(scope, runtime);
        if (
          previous?.scope === scope &&
          runtime.completionRevision !== undefined &&
          runtime.completionRevision >
            (previous.runtime.completionRevision ?? 0)
        ) {
          setNotice(
            t(
              runtime.completionPhase === "focus"
                ? "pomodoroFocusFinished"
                : "pomodoroBreakFinished",
            ),
          );
          void deliverChime(runtime).catch(() => {});
        }
        if (
          runtime.status === "running" &&
          remainingPomodoroMs(runtime, Date.now()) === 0
        ) {
          await actionRef.current({ type: "complete" });
        }
      } catch {
        if (active && activeScope.current === scope)
          setError(t("pomodoroLoadError"));
      }
    };
    const visibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const invalidate = (data: unknown) => {
      if (
        data &&
        typeof data === "object" &&
        "scope" in data &&
        data.scope === scope
      )
        void refresh();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === "weekdam:pomodoro-change" && event.newValue) {
        try {
          invalidate(JSON.parse(event.newValue));
        } catch {
          /* Ignore unrelated malformed values. */
        }
      }
    };
    const connection =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("weekdam:pomodoro")
        : null;
    channel.current = connection;
    if (connection) connection.onmessage = (event) => invalidate(event.data);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("storage", storage);
    if (enabled) void refresh();
    const timer = window.setInterval(() => {
      const snapshot = current.current;
      if (
        !enabledRef.current ||
        completing.current ||
        snapshot?.scope !== scope ||
        snapshot.runtime.status !== "running" ||
        remainingPomodoroMs(snapshot.runtime, Date.now()) > 0
      )
        return;
      completing.current = true;
      void actionRef.current({ type: "complete" }).finally(() => {
        completing.current = false;
      });
    }, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("storage", storage);
      connection?.close();
      if (channel.current === connection) channel.current = null;
    };
  }, [
    scope,
    enabled,
    accept,
    onHistoryChanged,
    publish,
    deliverChime,
    reloadVersion,
  ]);

  const enableNotifications = useCallback(async () => {
    try {
      const permission = await enablePomodoroNotifications();
      const snapshot = current.current;
      if (
        !snapshot ||
        snapshot.scope !== scope ||
        activeScope.current !== scope
      )
        return;
      await actionRef.current({
        type: "settings",
        settings: {
          ...snapshot.runtime.settings,
          notifications: permission === "granted",
        },
      });
      if (permission !== "granted")
        setNotice(
          t(
            permission === "unsupported"
              ? "pomodoroNotificationsUnsupported"
              : "pomodoroNotificationsDenied",
          ),
        );
    } catch {
      setNotice(t("pomodoroNotificationsDenied"));
    }
  }, [scope, t]);

  return {
    runtime: snapshot?.scope === scope ? snapshot.runtime : null,
    error,
    notice,
    action,
    enableNotifications,
    retry,
  };
}
