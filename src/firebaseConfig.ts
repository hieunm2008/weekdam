export function resolveFirebaseConfig(env: Record<string, string | undefined>) {
  const emulatorMode = env.VITE_USE_FIREBASE_EMULATORS !== "false";
  const projectId =
    env.VITE_FIREBASE_PROJECT_ID || (emulatorMode ? "demo-weekdam-pro" : "");
  const isolated = projectId !== "weekdam-hieu-2026";
  const configured =
    isolated &&
    (emulatorMode
      ? projectId.startsWith("demo-")
      : Boolean(
          env.VITE_FIREBASE_PRO_SANDBOX === "true" &&
          !projectId.startsWith("demo-") &&
          env.VITE_FIREBASE_API_KEY &&
          projectId &&
          env.VITE_FIREBASE_AUTH_DOMAIN &&
          env.VITE_FIREBASE_APP_ID,
        ));
  return { emulatorMode, projectId, configured };
}
