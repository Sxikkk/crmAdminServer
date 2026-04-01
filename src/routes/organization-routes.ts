import type { FastifyInstance } from "fastify";
import { mainPool } from "../db/pools.js";
import { requireAuth } from "../plugins/auth.js";
import { updateOrganizationStatusSchema, updateOrganizationTypeSchema } from "../schemas.js";

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/organizations", { preHandler: requireAuth }, async (request, reply) => {
    const query = request.query as { page?: string; pageSize?: string; search?: string };
    const page = Number(query.page ?? 1);
    const pageSize = Math.min(Number(query.pageSize ?? 20), 100);
    const offset = (page - 1) * pageSize;
    const search = (query.search ?? "").trim();

    const result = await mainPool.query(
      `
        SELECT
          "Id" AS id,
          "Name" AS name,
          "Inn" AS inn,
          "Ogrn" AS ogrn,
          "Email" AS email,
          "Phone" AS phone,
          "Website" AS website,
          "City" AS city,
          "Type" AS type,
          "Status" AS status,
          "CreateDate" AS "createDate"
        FROM "Organizations"
        WHERE ($1::text = '' OR "Name" ILIKE '%' || $1 || '%' OR "Inn" = $1 OR "Ogrn" = $1)
        ORDER BY "CreateDate" DESC
        LIMIT $2 OFFSET $3
      `,
      [search, pageSize, offset]
    );

    const total = await mainPool.query(
      `
        SELECT count(*)::int AS count
        FROM "Organizations"
        WHERE ($1::text = '' OR "Name" ILIKE '%' || $1 || '%' OR "Inn" = $1 OR "Ogrn" = $1)
      `,
      [search]
    );

    return reply.send({
      items: result.rows,
      page,
      pageSize,
      total: total.rows[0]?.count ?? 0
    });
  });

  app.patch("/organizations/:id/type", { preHandler: requireAuth }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = updateOrganizationTypeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Validation error", issues: parsed.error.issues });
    }

    const updated = await mainPool.query(
      `
        UPDATE "Organizations"
        SET "Type" = $1
        WHERE "Id" = $2
        RETURNING "Id" AS id, "Name" AS name, "Type" AS type
      `,
      [parsed.data.organizationType, params.id]
    );

    if (updated.rowCount === 0) {
      return reply.code(404).send({ message: "Organization not found" });
    }

    return reply.send(updated.rows[0]);
  });

  app.patch("/organizations/:id/status", { preHandler: requireAuth }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = updateOrganizationStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Validation error", issues: parsed.error.issues });
    }

    const updated = await mainPool.query(
      `
        UPDATE "Organizations"
        SET "Status" = $1
        WHERE "Id" = $2
        RETURNING "Id" AS id, "Name" AS name, "Status" AS status
      `,
      [parsed.data.organizationStatus, params.id]
    );

    if (updated.rowCount === 0) {
      return reply.code(404).send({ message: "Organization not found" });
    }

    return reply.send(updated.rows[0]);
  });
}
