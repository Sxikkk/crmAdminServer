import { env } from "../config/env.js";
import { getServiceKeyMaterial, hashServiceKeyMaterial } from "./service-keys.js";
import type { OrganizationStatus, OrganizationType } from "../types.js";

type CreateOrganizationPayload = {
  organizationName: string;
  organizationType: OrganizationType;
  inn: string | null;
  ogrn: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
};

export type MainOrganization = {
  id: string;
  name: string;
  inn: string | null;
  ogrn: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  type: OrganizationType;
  status: OrganizationStatus;
  createDate: string;
};

type MainCrmOrganizationListItem = {
  id: string;
  name: string;
  description?: string | null;
};

type CachedToken = {
  token: string;
  expiresAtMs: number;
  cacheKey: string;
};

const organizationTypeValue: Record<OrganizationType, number> = {
  Company: 0,
  Individual: 1,
  Other: 2
};

const organizationStatusValue: Record<OrganizationStatus, number> = {
  Active: 0,
  Blocked: 1
};

let cachedToken: CachedToken | null = null;

function extractToken(responseBody: unknown): string | null {
  if (!responseBody || typeof responseBody !== "object") {
    return null;
  }

  const body = responseBody as Record<string, unknown>;
  const accessToken = body.accessToken ?? body.AccessToken ?? body.token ?? body.Token;
  return typeof accessToken === "string" && accessToken.length > 0 ? accessToken : null;
}

function decodeJwtExpMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = Buffer.from(normalized, "base64").toString("utf-8");
    const payload = JSON.parse(json) as { exp?: number };

    if (typeof payload.exp !== "number") {
      return null;
    }

    return payload.exp * 1000;
  } catch {
    return null;
  }
}

async function requestMainCrmM2mToken(adminUserId: string | null): Promise<{ token: string; cacheKey: string }> {
  const material = await getServiceKeyMaterial(adminUserId);
  const response = await fetch(env.MAIN_CRM_M2M_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-key": material.adminKey
    },
    body: JSON.stringify({
      login: material.login
    })
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Main CRM m2m token request failed: ${response.status} ${bodyText}`);
  }

  const body = (await response.json()) as unknown;
  const token = extractToken(body);
  if (!token) {
    throw new Error("Main CRM m2m token request failed: access token was not returned");
  }

  return {
    token,
    cacheKey: hashServiceKeyMaterial(material.login, material.adminKey)
  };
}

async function getMainCrmAccessToken(adminUserId: string | null, forceRefresh = false): Promise<string> {
  const material = await getServiceKeyMaterial(adminUserId);
  const cacheKey = hashServiceKeyMaterial(material.login, material.adminKey);
  if (!forceRefresh && cachedToken && cachedToken.cacheKey === cacheKey && Date.now() < cachedToken.expiresAtMs) {
    return cachedToken.token;
  }

  const tokenResponse = await requestMainCrmM2mToken(adminUserId);
  const expMs = decodeJwtExpMs(tokenResponse.token);
  cachedToken = {
    token: tokenResponse.token,
    expiresAtMs: expMs ? expMs - 10_000 : Date.now() + 5 * 60_000,
    cacheKey: tokenResponse.cacheKey
  };

  return tokenResponse.token;
}

async function mainCrmJsonRequest<T>(
  url: string,
  method: "GET" | "POST" | "PUT",
  adminUserId: string | null,
  body?: unknown,
  retried = false
): Promise<T> {
  const token = await getMainCrmAccessToken(adminUserId, false);

  const response = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      authorization: `Bearer ${token}`
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  if ((response.status === 401 || response.status === 403) && !retried) {
    await getMainCrmAccessToken(adminUserId, true);
    return mainCrmJsonRequest<T>(url, method, adminUserId, body, true);
  }

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Main CRM request failed: ${response.status} ${bodyText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null as T;
  }

  return (await response.json()) as T;
}

function parseOrganizationDescription(description: string | null | undefined): {
  inn: string | null;
  organizationType: OrganizationType;
  ogrn: string | null;
  phone: string | null;
} {
  const [rawInn = "", rawType = "", rawOgrn = "", rawPhone = ""] = (description ?? "").split(" - ");

  const cleanedInn = rawInn.trim();
  const cleanedType = rawType.trim();
  const cleanedOgrn = rawOgrn.trim();
  const cleanedPhone = rawPhone.trim();

  const inn = /^\d{10}(\d{2})?$/.test(cleanedInn) ? cleanedInn : null;
  const ogrn = /^\d{13}$/.test(cleanedOgrn) ? cleanedOgrn : null;

  const organizationType: OrganizationType =
    cleanedType === "Company" || cleanedType === "Individual" || cleanedType === "Other" ? cleanedType : "Company";

  return {
    inn,
    organizationType,
    ogrn,
    phone: cleanedPhone.length > 0 ? cleanedPhone : null
  };
}

export async function fetchOrganizationsFromMainCrm(search: string, adminUserId: string | null): Promise<MainOrganization[]> {
  const organizations = await mainCrmJsonRequest<MainCrmOrganizationListItem[]>(
    env.MAIN_CRM_ORGANIZATIONS_URL,
    "GET",
    adminUserId
  );

  const normalized = organizations.map((item) => {
    const parsed = parseOrganizationDescription(item.description);
    return {
      id: item.id,
      name: item.name,
      inn: parsed.inn,
      ogrn: parsed.ogrn,
      email: null,
      phone: parsed.phone,
      website: null,
      city: null,
      type: parsed.organizationType,
      status: "Active" as const,
      createDate: new Date(0).toISOString()
    };
  });

  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) {
    return normalized;
  }

  return normalized.filter((item) => {
    const target = [item.name, item.inn ?? "", item.ogrn ?? ""].join(" ").toLowerCase();
    return target.includes(normalizedSearch);
  });
}

export async function existsOrganizationOnMainCrm(
  inn: string | null,
  ogrn: string | null,
  adminUserId: string | null
): Promise<boolean> {
  if (!inn && !ogrn) {
    return false;
  }

  const organizations = await fetchOrganizationsFromMainCrm("", adminUserId);
  return organizations.some((item) => (inn ? item.inn === inn : false) || (ogrn ? item.ogrn === ogrn : false));
}

export async function checkMainCrmAvailability(): Promise<void> {
  await mainCrmJsonRequest<MainCrmOrganizationListItem[]>(env.MAIN_CRM_ORGANIZATIONS_URL, "GET", null);
}

export async function createOrganizationOnMainCrm(
  payload: CreateOrganizationPayload,
  adminUserId: string | null
): Promise<string | null> {
  const body = await mainCrmJsonRequest<unknown>(env.MAIN_CRM_CREATE_ORG_URL, "POST", adminUserId, {
    organizationName: payload.organizationName,
    organizationType: organizationTypeValue[payload.organizationType],
    inn: payload.inn,
    ogrn: payload.ogrn,
    email: payload.email,
    phone: payload.phone,
    website: payload.website
  });

  if (typeof body === "string") {
    return body;
  }

  if (body && typeof body === "object" && "id" in body && typeof (body as { id: unknown }).id === "string") {
    return (body as { id: string }).id;
  }

  return null;
}

export async function changeOrganizationTypeOnMainCrm(
  organizationId: string,
  organizationType: OrganizationType,
  adminUserId: string | null
): Promise<void> {
  const endpoint = env.MAIN_CRM_CHANGE_TYPE_URL.replace("{id}", organizationId);
  await mainCrmJsonRequest<unknown>(
    `${endpoint}${endpoint.includes("?") ? "&" : "?"}organizationId=${organizationId}`,
    "PUT",
    adminUserId,
    organizationTypeValue[organizationType]
  );
}

export async function changeOrganizationStatusOnMainCrm(
  organizationId: string,
  organizationStatus: OrganizationStatus,
  adminUserId: string | null
): Promise<void> {
  const endpoint = env.MAIN_CRM_CHANGE_STATUS_URL.replace("{id}", organizationId);
  await mainCrmJsonRequest<unknown>(
    `${endpoint}${endpoint.includes("?") ? "&" : "?"}organizationId=${organizationId}`,
    "PUT",
    adminUserId,
    organizationStatusValue[organizationStatus]
  );
}
