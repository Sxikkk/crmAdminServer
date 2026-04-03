import { createHash, createHmac, randomUUID } from "node:crypto";
import { adminPool } from "../db/pools.js";
import { env } from "../config/env.js";

type ServiceKeyRow = {
  id: string;
  admin_user_id: string;
  username: string;
};

type ServiceKeyMaterial = {
  adminUserId: string;
  login: string;
  adminKey: string;
};

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function signValue(value: string): string {
  return createHmac("sha256", env.ADMIN_SERVICE_KEY_SECRET).update(value).digest("base64url");
}

function buildRawServiceKey(serviceKeyId: string, adminUserId: string): string {
  const signature = signValue(`${serviceKeyId}:${adminUserId}`);
  return `ak_${serviceKeyId}.${signature}`;
}

async function getAdminUserById(adminUserId: string): Promise<{ id: string; username: string } | null> {
  const result = await adminPool.query("SELECT id, username FROM admin_users WHERE id = $1", [adminUserId]);
  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0] as { id: string; username: string };
}

async function getActiveServiceKeyByAdminUser(adminUserId: string): Promise<ServiceKeyRow | null> {
  const result = await adminPool.query(
    `
      SELECT sk.id, sk.admin_user_id, au.username
      FROM service_keys sk
      INNER JOIN admin_users au ON au.id = sk.admin_user_id
      WHERE sk.admin_user_id = $1
        AND sk.revoked_at IS NULL
        AND (sk.expires_at IS NULL OR sk.expires_at > NOW())
      ORDER BY sk.created_at DESC
      LIMIT 1
    `,
    [adminUserId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0] as ServiceKeyRow;
}

async function createServiceKeyForAdminUser(adminUserId: string): Promise<ServiceKeyRow> {
  const adminUser = await getAdminUserById(adminUserId);
  if (!adminUser) {
    throw new Error(`Admin user not found: ${adminUserId}`);
  }

  const serviceKeyId = randomUUID();
  const rawKey = buildRawServiceKey(serviceKeyId, adminUserId);
  const keyHash = hashValue(rawKey);

  const expiresAt =
    env.ADMIN_SERVICE_KEY_TTL_DAYS > 0
      ? new Date(Date.now() + env.ADMIN_SERVICE_KEY_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

  await adminPool.query(
    `
      INSERT INTO service_keys (id, admin_user_id, key_hash, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [serviceKeyId, adminUserId, keyHash, expiresAt]
  );

  return {
    id: serviceKeyId,
    admin_user_id: adminUserId,
    username: adminUser.username
  };
}

async function getAnyActiveServiceKey(): Promise<ServiceKeyRow | null> {
  const result = await adminPool.query(
    `
      SELECT sk.id, sk.admin_user_id, au.username
      FROM service_keys sk
      INNER JOIN admin_users au ON au.id = sk.admin_user_id
      WHERE sk.revoked_at IS NULL
        AND (sk.expires_at IS NULL OR sk.expires_at > NOW())
      ORDER BY sk.created_at DESC
      LIMIT 1
    `
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0] as ServiceKeyRow;
}

async function getAnyAdminUser(): Promise<{ id: string; username: string } | null> {
  const result = await adminPool.query("SELECT id, username FROM admin_users ORDER BY created_at ASC LIMIT 1");
  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0] as { id: string; username: string };
}

function toMaterial(row: ServiceKeyRow): ServiceKeyMaterial {
  return {
    adminUserId: row.admin_user_id,
    login: row.username,
    adminKey: buildRawServiceKey(row.id, row.admin_user_id)
  };
}

export async function getServiceKeyMaterial(adminUserId: string | null): Promise<ServiceKeyMaterial> {
  if (adminUserId) {
    const active = await getActiveServiceKeyByAdminUser(adminUserId);
    if (active) {
      return toMaterial(active);
    }

    const created = await createServiceKeyForAdminUser(adminUserId);
    return toMaterial(created);
  }

  const anyActive = await getAnyActiveServiceKey();
  if (anyActive) {
    return toMaterial(anyActive);
  }

  const fallbackUser = await getAnyAdminUser();
  if (!fallbackUser) {
    throw new Error("No admin users available to issue x-admin-key for m2m token");
  }

  const created = await createServiceKeyForAdminUser(fallbackUser.id);
  return toMaterial(created);
}

export async function ensureActiveServiceKeyForAdminUser(adminUserId: string): Promise<void> {
  const active = await getActiveServiceKeyByAdminUser(adminUserId);
  if (active) {
    return;
  }

  await createServiceKeyForAdminUser(adminUserId);
}

export function hashServiceKeyMaterial(login: string, adminKey: string): string {
  return hashValue(`${login}:${adminKey}`);
}
