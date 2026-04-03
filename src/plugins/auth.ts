import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "../lib/security.js";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    reply.code(401).send({ message: "Unauthorized" });
    return;
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    request.user = verifyToken(token);
  } catch {
    reply.code(401).send({ message: "Invalid token" });
  }
}

export function requireRole(...allowedRoles: string[]) {
  const normalizedAllowedRoles = new Set(allowedRoles.map((role) => role.toLowerCase()));

  return async function roleGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await requireAuth(request, reply);
    if (reply.sent) {
      return;
    }

    const role = request.user?.role?.toLowerCase();
    if (!role || !normalizedAllowedRoles.has(role)) {
      reply.code(403).send({ message: "Forbidden" });
    }
  };
}
