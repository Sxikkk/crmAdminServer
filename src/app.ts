import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { authRoutes } from "./routes/auth-routes.js";
import { requestRoutes } from "./routes/request-routes.js";
import { organizationRoutes } from "./routes/organization-routes.js";
import { adminPool } from "./db/pools.js";
import { checkMainCrmAvailability } from "./services/main-crm.js";

export function buildApp() {
  const app = Fastify({
    logger: { level: 'warn' }
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

  app.get("/health", async (_request, reply) => {
    const checks: {
      adminDb: { ok: boolean; error?: string };
      mainCrm: { ok: boolean; error?: string };
    } = {
      adminDb: { ok: false },
      mainCrm: { ok: false }
    };

    try {
      const adminStatus = await adminPool.query("SELECT 1");
      checks.adminDb.ok = adminStatus.rowCount === 1;
      if (!checks.adminDb.ok) {
        checks.adminDb.error = "Admin DB did not return a healthy response";
      }
    } catch (error: unknown) {
      checks.adminDb.ok = false;
      checks.adminDb.error = (error as Error).message;
    }

    try {
      await checkMainCrmAvailability();
      checks.mainCrm.ok = true;
    } catch (error: unknown) {
      checks.mainCrm.ok = false;
      checks.mainCrm.error = (error as Error).message;
    }

    const ok = checks.adminDb.ok && checks.mainCrm.ok;
    return reply.code(ok ? 200 : 503).send({ ok, checks });
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
