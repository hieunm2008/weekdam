const fs = require("node:fs/promises");
const auth = require("firebase-tools/lib/auth");
const projectId = "weekdam-hieu-2026";

async function main() {
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error("Firebase CLI login is required");
  const token = await auth.getAccessToken(
    account.tokens.refresh_token,
    account.tokens.scopes,
  );
  async function read(url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!response.ok)
      throw new Error(`Project metadata check failed: HTTP ${response.status}`);
    return response.json();
  }
  const [billing, database] = await Promise.all([
    read(
      `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`,
    ),
    read(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`,
    ),
  ]);
  const report = {
    projectId,
    checkedAt: new Date().toISOString(),
    billingEnabled: billing.billingEnabled,
    database: {
      edition: database.databaseEdition,
      type: database.type,
      location: database.locationId,
      freeTier: database.freeTier,
    },
  };
  const output =
    process.argv[2] || "docs/design/glass-v1/validation/free-tier.json";
  await fs.mkdir(require("node:path").dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
  if (billing.billingEnabled !== false || database.freeTier !== true)
    process.exitCode = 1;
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
