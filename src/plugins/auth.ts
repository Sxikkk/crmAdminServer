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
