import type { FastifyInstance } from "fastify";
import { requireRole } from "../plugins/auth.js";
import { updateOrganizationStatusSchema, updateOrganizationTypeSchema } from "../schemas.js";
import {
  changeOrganizationStatusOnMainCrm,
  changeOrganizationTypeOnMainCrm,
  fetchOrganizationsFromMainCrm
} from "../services/main-crm.js";

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/organizations", { preHandler: requireRole("admin", "manager", "reviewer") }, async (request, reply) => {
    const query = request.query as { page?: string; pageSize?: string; search?: string };
    const page = Number(query.page ?? 1);
    const pageSize = Math.min(Number(query.pageSize ?? 20), 100);
    const offset = (page - 1) * pageSize;
    const search = (query.search ?? "").trim();

    try {
      const organizations = await fetchOrganizationsFromMainCrm(search, request.user?.userId ?? null);
      const items = organizations.slice(offset, offset + pageSize);
      const total = organizations.length;

      return reply.send({
        items,
        page,
        pageSize,
        total
      });
    } catch (error: unknown) {
      app.log.error({ error }, "Failed to fetch organizations from main CRM");
      return reply.code(502).send({
        message: "Failed to fetch organizations from main CRM",
        details: (error as Error).message
      });
    }
  });

  app.patch("/organizations/:id/type", { preHandler: requireRole("admin", "manager") }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = updateOrganizationTypeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Validation error", issues: parsed.error.issues });
    }

    try {
      await changeOrganizationTypeOnMainCrm(params.id, parsed.data.organizationType, request.user?.userId ?? null);
      return reply.send({ id: params.id, type: parsed.data.organizationType });
    } catch (error: unknown) {
      return reply.code(502).send({ message: (error as Error).message });
    }
  });

  app.patch("/organizations/:id/status", { preHandler: requireRole("admin", "manager") }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = updateOrganizationStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Validation error", issues: parsed.error.issues });
    }

    try {
      await changeOrganizationStatusOnMainCrm(params.id, parsed.data.organizationStatus, request.user?.userId ?? null);
      return reply.send({ id: params.id, status: parsed.data.organizationStatus });
    } catch (error: unknown) {
      return reply.code(502).send({ message: (error as Error).message });
    }
  });
}
