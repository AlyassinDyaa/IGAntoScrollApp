import { mkdir } from "node:fs/promises";
import { loadEnv } from "./config.js";
import { buildApp } from "./app.js";

const env = loadEnv();
await mkdir(env.UPLOAD_DIR, { recursive: true });
const app = await buildApp(env);

app.listen({ port: env.PORT, host: "0.0.0.0" }).then(() => {
  app.log.info(env.MOCK_META ? "Running with MOCK_META=1 (fixture data, no Meta calls)" : "Running against Meta Graph API");
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => void app.close().then(() => process.exit(0)));
}
