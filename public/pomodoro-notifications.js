self.addEventListener("notificationclick", (event) => {
  if (!event.notification.tag.startsWith("pomodoro-")) return;
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const app = windows.find(
        (client) => new URL(client.url).pathname.replace(/\/+$/, "") === "/app",
      );
      if (app) {
        await app.focus();
        app.postMessage({ type: "OPEN_POMODORO" });
      } else await self.clients.openWindow("/app#pomodoro");
    })(),
  );
});
