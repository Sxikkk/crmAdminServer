import "fastify";
import type { JwtPayload } from "../lib/security.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}
