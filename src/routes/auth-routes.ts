import type { FastifyInstance } from "fastify";
import { adminPool } from "../db/pools.js";
import { hashPassword, signToken, verifyPassword } from "../lib/security.js";
import { loginSchema, registerSchema } from "../schemas.js";
import { env } from "../config/env.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Validation error", issues: parsed.error.issues });
    }

    if (env.ADMIN_REGISTRATION_TOKEN) {
      const token = request.headers["x-admin-registration-token"];
      if (token !== env.ADMIN_REGISTRATION_TOKEN) {
        return reply.code(403).send({ message: "Invalid registration token" });
      }
    }

    const { username, email, password, role } = parsed.data;
    const passwordHash = await hashPassword(password);

    try {
      const result = await adminPool.query(
        `
          INSERT INTO admin_users (username, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
          RETURNING id, username, email, role, created_at
        `,
        [username, email, passwordHash, role]
      );

      return reply.code(201).send(result.rows[0]);
    } catch (error: unknown) {
      app.log.error({ error }, "Failed to register admin user");
      return reply.code(409).send({ message: "Username or email already exists" });
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Validation error", issues: parsed.error.issues });
    }

    const { username, password } = parsed.data;
    const result = await adminPool.query(
      "SELECT id, username, email, password_hash, role FROM admin_users WHERE username = $1",
      [username]
    );

    if (result.rowCount === 0) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const user = result.rows[0] as {
      id: string;
      username: string;
      email: string;
      password_hash: string;
      role: string;
    };

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    return reply.send({
      accessToken: token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  });
}
