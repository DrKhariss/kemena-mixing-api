import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { app, boot } from "./app.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env") });
config({ path: join(root, ".env.local") });

const PORT = Number(process.env.PORT || 3001);

try {
  await boot();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mixing API running on http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/mixing/api/config`);
  });
} catch (err) {
  console.error("Failed to start Mixing API:", err.message);
  process.exit(1);
}
