import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4100),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("info"),
  POSTGRES_ADMIN: z.string().min(1),
  ADMIN_SERVICE_KEY_SECRET: z.string().min(32).default("change-me-admin-service-key-secret-32chars"),
  ADMIN_SERVICE_KEY_TTL_DAYS: z.coerce.number().default(90),
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
  MAIN_CRM_ORGANIZATIONS_URL: z.string().url().default("http://localhost:5206/api/organizations/all"),
  MAIN_CRM_CHANGE_TYPE_URL: z.string().url().default("http://localhost:5206/api/organizations/{id}/change-type"),
  MAIN_CRM_CHANGE_STATUS_URL: z.string().url().default("http://localhost:5206/api/organizations/{id}/change-status"),
  MAIN_CRM_M2M_TOKEN_URL: z.string().url().default("http://localhost:5206/api/m2m/token"),
  MAIN_CRM_AUTH_URL: z.string().url().default("http://localhost:5206/api/auth/login"),
  MAIN_CRM_API_TOKEN: z.string().optional(),
  MAIN_CRM_SERVICE_ORGANIZATION_ID: z.string().optional(),
  MAIN_CRM_SERVICE_LOGIN: z.string().optional(),
  MAIN_CRM_SERVICE_PASSWORD: z.string().optional(),
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
