let audio: AudioContext | undefined;

export async function primePomodoroAudio(): Promise<void> {
  if (typeof AudioContext === "undefined") return;
  audio ??= new AudioContext();
  if (audio.state === "suspended") await audio.resume();
}

export function canRingPomodoro(): boolean {
  return audio?.state === "running";
}

export function ringPomodoro(): void {
  if (!audio || audio.state !== "running") return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.12, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.36);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

export async function enablePomodoroNotifications(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

export async function showPomodoroNotification(
  title: string,
  body: string,
  tag: string,
): Promise<void> {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  )
    return;
  const options: NotificationOptions = {
    body,
    icon: "/icon-192.png",
    tag,
    data: { url: "/app#pomodoro" },
  };
  const registration =
    "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration()
      : undefined;
  if (registration) await registration.showNotification(title, options);
  else new Notification(title, options);
}
