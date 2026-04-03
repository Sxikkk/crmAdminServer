import type { FastifyInstance } from "fastify";
import type { PoolClient } from "pg";
import { adminPool } from "../db/pools.js";
import { requireRole } from "../plugins/auth.js";
import { createRequestSchema, rejectSchema, requestFilterSchema } from "../schemas.js";
import { sendEmail } from "../services/mailer.js";
import { createOrganizationOnMainCrm, existsOrganizationOnMainCrm } from "../services/main-crm.js";

async function addRequestEvent(
  client: PoolClient,
  requestId: string,
  eventType: string,
  actorUserId: string | null,
  message: string
): Promise<void> {
  await client.query(
    `
      INSERT INTO request_events (request_id, event_type, actor_user_id, message)
      VALUES ($1, $2, $3, $4)
    `,
    [requestId, eventType, actorUserId, message]
  );
}

export async function requestRoutes(app: FastifyInstance): Promise<void> {
  app.post("/requests", async (request, reply) => {
    const parsed = createRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Validation error", issues: parsed.error.issues });
    }

    const data = parsed.data;

    if (data.inn || data.ogrn) {
      const existsOnMainCrm = await existsOrganizationOnMainCrm(data.inn ?? null, data.ogrn ?? null, null);
      if (existsOnMainCrm) {
        return reply.code(409).send({ message: "Organization with same INN/OGRN already exists in main CRM" });
      }
    }

    const dupPending = await adminPool.query(
      `
        SELECT 1
        FROM organization_requests
        WHERE status = 'PENDING'
          AND (($1::text IS NOT NULL AND inn = $1) OR ($2::text IS NOT NULL AND ogrn = $2))
        LIMIT 1
      `,
      [data.inn ?? null, data.ogrn ?? null]
    );
    if ((dupPending.rowCount ?? 0) > 0) {
      return reply.code(409).send({ message: "Pending request with same INN/OGRN already exists" });
    }

    const created = await adminPool.query(
      `
        INSERT INTO organization_requests
        (
          organization_name, organization_type, inn, ogrn, email, phone, website, city,
          requested_by_email, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
        RETURNING *
      `,
      [
        data.organizationName,
        data.organizationType,
        data.inn ?? null,
        data.ogrn ?? null,
        data.email ?? null,
        data.phone ?? null,
        data.website ?? null,
        data.city ?? null,
        data.requestedByEmail
      ]
    );

    const requestRow = created.rows[0];
    await adminPool.query(
      `
        INSERT INTO request_events (request_id, event_type, actor_user_id, message)
        VALUES ($1, 'CREATED', NULL, $2)
      `,
      [requestRow.id, "Request created"]
    );

    try {
      await sendEmail(
        data.requestedByEmail,
        "Organization request received",
        `Your request for organization "${data.organizationName}" has been accepted for review.`
      );
    } catch (error: unknown) {
      app.log.warn({ error }, "Failed to send creation email");
    }

    return reply.code(201).send(requestRow);
  });

  app.get("/requests", { preHandler: requireRole("admin", "manager", "reviewer") }, async (request, reply) => {
    const parsed = requestFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Validation error", issues: parsed.error.issues });
    }

    const { status, page, pageSize } = parsed.data;
    const offset = (page - 1) * pageSize;

    const items = await adminPool.query(
      `
        SELECT *
        FROM organization_requests
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [status ?? null, pageSize, offset]
    );

    const total = await adminPool.query(
      `
        SELECT count(*)::int AS count
        FROM organization_requests
        WHERE ($1::text IS NULL OR status = $1)
      `,
      [status ?? null]
    );

    return reply.send({
      items: items.rows,
      page,
      pageSize,
      total: total.rows[0]?.count ?? 0
    });
  });

  app.get("/requests/:id", { preHandler: requireRole("admin", "manager", "reviewer") }, async (request, reply) => {
    const params = request.params as { id: string };
    const result = await adminPool.query("SELECT * FROM organization_requests WHERE id = $1", [params.id]);
    if (result.rowCount === 0) {
      return reply.code(404).send({ message: "Request not found" });
    }

    const events = await adminPool.query(
      "SELECT * FROM request_events WHERE request_id = $1 ORDER BY created_at ASC",
      [params.id]
    );

    return reply.send({ request: result.rows[0], events: events.rows });
  });

  app.post("/requests/:id/approve", { preHandler: requireRole("admin", "manager") }, async (request, reply) => {
    const params = request.params as { id: string };
    const actorUserId = request.user?.userId ?? null;
    const client = await adminPool.connect();

    try {
      await client.query("BEGIN");

      const selected = await client.query(
        `
          SELECT *
          FROM organization_requests
          WHERE id = $1
          FOR UPDATE
        `,
        [params.id]
      );

      if (selected.rowCount === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ message: "Request not found" });
      }

      const row = selected.rows[0] as {
        id: string;
        status: string;
        organization_name: string;
        organization_type: "Company" | "Individual" | "Other";
        inn: string | null;
        ogrn: string | null;
        email: string | null;
        phone: string | null;
        website: string | null;
        requested_by_email: string;
      };

      if (row.status !== "PENDING") {
        await client.query("ROLLBACK");
        return reply.code(409).send({ message: "Request already processed" });
      }

      let createdOrgId: string | null = null;
      try {
        createdOrgId = await createOrganizationOnMainCrm({
          organizationName: row.organization_name,
          organizationType: row.organization_type,
          inn: row.inn,
          ogrn: row.ogrn,
          email: row.email,
          phone: row.phone,
          website: row.website
        }, actorUserId);
      } catch (error: unknown) {
        await client.query(
          `
            UPDATE organization_requests
            SET status = 'FAILED',
                decision_comment = $2,
                processed_by_user_id = $3,
                updated_at = NOW()
            WHERE id = $1
          `,
          [row.id, (error as Error).message, actorUserId]
        );
        await addRequestEvent(client, row.id, "APPROVE_FAILED", actorUserId, (error as Error).message);
        await client.query("COMMIT");

        try {
          await sendEmail(
            row.requested_by_email,
            "Organization request failed",
            `Technical error while creating organization "${row.organization_name}": ${(error as Error).message}`
          );
        } catch (mailError: unknown) {
          app.log.warn({ mailError }, "Failed to send failed-approval email");
        }

        return reply.code(502).send({
          message: "Failed to create organization on main CRM",
          details: (error as Error).message
        });
      }

      await client.query(
        `
          UPDATE organization_requests
          SET status = 'APPROVED',
              approved_at = NOW(),
              processed_by_user_id = $2,
              external_organization_id = $3,
              updated_at = NOW()
          WHERE id = $1
        `,
        [row.id, actorUserId, createdOrgId]
      );

      await addRequestEvent(client, row.id, "APPROVED", actorUserId, "Request approved and sent to main CRM");
      await client.query("COMMIT");

      try {
        await sendEmail(
          row.requested_by_email,
          "Organization request approved",
          `Your request for organization "${row.organization_name}" has been approved.`
        );
      } catch (error: unknown) {
        app.log.warn({ error }, "Failed to send approval email");
      }

      return reply.send({ status: "APPROVED", organizationId: createdOrgId });
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      app.log.error({ error }, "Approve request failed");
      return reply.code(500).send({ message: "Internal server error" });
    } finally {
      client.release();
    }
  });

  app.post("/requests/:id/reject", { preHandler: requireRole("admin", "manager") }, async (request, reply) => {
    const params = request.params as { id: string };
    const actorUserId = request.user?.userId ?? null;

    const parsed = rejectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Validation error", issues: parsed.error.issues });
    }

    const client = await adminPool.connect();
    try {
      await client.query("BEGIN");

      const selected = await client.query(
        `
          SELECT *
          FROM organization_requests
          WHERE id = $1
          FOR UPDATE
        `,
        [params.id]
      );

      if (selected.rowCount === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ message: "Request not found" });
      }

      const row = selected.rows[0] as {
        id: string;
        status: string;
        organization_name: string;
        requested_by_email: string;
      };

      if (row.status !== "PENDING") {
        await client.query("ROLLBACK");
        return reply.code(409).send({ message: "Request already processed" });
      }

      await client.query(
        `
          UPDATE organization_requests
          SET status = 'REJECTED',
              rejected_at = NOW(),
              processed_by_user_id = $2,
              decision_comment = $3,
              updated_at = NOW()
          WHERE id = $1
        `,
        [row.id, actorUserId, parsed.data.comment]
      );

      await addRequestEvent(client, row.id, "REJECTED", actorUserId, parsed.data.comment);
      await client.query("COMMIT");

      try {
        await sendEmail(
          row.requested_by_email,
          "Organization request rejected",
          `Your request for organization "${row.organization_name}" has been rejected.\nReason: ${parsed.data.comment}`
        );
      } catch (error: unknown) {
        app.log.warn({ error }, "Failed to send rejection email");
      }

      return reply.send({ status: "REJECTED" });
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      app.log.error({ error }, "Reject request failed");
      return reply.code(500).send({ message: "Internal server error" });
    } finally {
      client.release();
    }
  });
}
