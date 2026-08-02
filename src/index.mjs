import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { app, boot } from "./app.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env"), quiet: true });
config({ path: join(root, ".env.local"), quiet: true });

// Prefer platform PORT when present; Hostinger often omits it — fall back to 3000.
const PORT = Number(process.env.PORT || 3000);

let bootError = null;

// Liveness: process is up (Hostinger / probes). Do not tie this to DB boot.
app.get("/health", (_req, res) => {
  return res.json({ ok: true, service: "kemena-mixing-api" });
});

// Readiness: includes DB/boot status.
app.get("/", (_req, res) => {
  if (bootError) {
    return res.status(503).json({
      ok: false,
      error: bootError,
      hint: "Check MYSQL_* env vars. Use MYSQL_HOST=127.0.0.1 (not localhost).",
    });
  }
  return res.json({ ok: true, service: "kemena-mixing-api" });
});

try {
  await boot();
} catch (err) {
  bootError = err?.message || String(err);
  console.error("Failed to boot Mixing API:", err);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Mixing API listening on ${PORT}`);
  if (bootError) {
    console.error(`Boot incomplete: ${bootError}`);
  } else {
    console.log(`Health: http://localhost:${PORT}/health`);
  }
});
