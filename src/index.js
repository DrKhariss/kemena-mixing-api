import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { app, boot } from "./app.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env") });
config({ path: join(root, ".env.local") });

const PORT = Number(process.env.PORT || 3001);

let bootError = null;

app.get("/", (_req, res) => {
  if (bootError) {
    return res.status(503).json({
      ok: false,
      error: bootError,
      hint: "Check MYSQL_* env vars. Use MYSQL_HOST=127.0.0.1 (not localhost). Do not set PORT on Hostinger.",
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

// Always listen so Hostinger proxies to a live process (avoids opaque CDN 503).
app.listen(PORT, () => {
  console.log(`Mixing API listening on port ${PORT}`);
  if (bootError) {
    console.error(`Boot incomplete: ${bootError}`);
  } else {
    console.log(`Health: http://localhost:${PORT}/mixing/api/config`);
  }
});
