import { env } from "./config/env.js";
import { buildApp } from "./app.js";

const app = buildApp();

async function start(): Promise<void> {
  try {
    await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info(`Server started on http://${env.HOST}:${env.PORT}`);
  } catch (error: unknown) {
    app.log.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

start();
