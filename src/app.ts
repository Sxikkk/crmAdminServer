import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "./config/env.js";
import { authRoutes } from "./routes/auth-routes.js";
import { requestRoutes } from "./routes/request-routes.js";
import { organizationRoutes } from "./routes/organization-routes.js";
import { adminPool, mainPool } from "./db/pools.js";

export function buildApp() {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL }
  });

  app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-admin-registration-token"]
  });

  app.register(swagger, {
    openapi: {
      info: {
        title: "CRM Admin Server API",
        version: "1.0.0"
      }
    }
  });
  app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", async () => {
    const [adminStatus, mainStatus] = await Promise.all([
      adminPool.query("SELECT 1"),
      mainPool.query("SELECT 1")
    ]);

    return {
      ok: adminStatus.rowCount === 1 && mainStatus.rowCount === 1
    };
  });

  app.register(authRoutes, { prefix: "/api" });
  app.register(requestRoutes, { prefix: "/api" });
  app.register(organizationRoutes, { prefix: "/api" });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error({ error }, "Unhandled error");
    reply.status(500).send({ message: "Internal server error" });
  });

  return app;
}
