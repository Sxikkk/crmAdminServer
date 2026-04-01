import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4100),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("info"),
  POSTGRES_ADMIN: z.string().min(1),
  POSTGRES_MAIN: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("8h"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("no-reply@crm-admin.local"),
  MAIN_CRM_CREATE_ORG_URL: z.string().url().default("http://localhost:5206/api/organizations/create"),
  MAIN_CRM_API_TOKEN: z.string().optional(),
  ADMIN_REGISTRATION_TOKEN: z.string().optional(),
  SEED_ADMIN_USERNAME: z.string().default("admin"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  SEED_ADMIN_PASSWORD: z.string().default("admin123")
});

export const env = envSchema.parse(process.env);

export function toPostgresUri(value: string): string {
  if (value.startsWith("postgres://") || value.startsWith("postgresql://")) {
    return value;
  }

  const parts = value
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [rawKey, ...rest] = chunk.split("=");
      return [rawKey?.toLowerCase(), rest.join("=")] as const;
    });

  const map = Object.fromEntries(parts);
  const host = map.host ?? "localhost";
  const port = map.port ?? "5432";
  const database = map.database ?? map.db ?? "";
  const user = map.username ?? map.user ?? "postgres";
  const password = map.password ?? "";

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}
