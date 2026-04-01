import { env } from "../config/env.js";
import type { OrganizationType } from "../types.js";

type CreateOrganizationPayload = {
  organizationName: string;
  organizationType: OrganizationType;
  inn: string | null;
  ogrn: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
};

export async function createOrganizationOnMainCrm(payload: CreateOrganizationPayload): Promise<string | null> {
  const organizationTypeValue: Record<OrganizationType, number> = {
    Company: 0,
    Individual: 1,
    Other: 2
  };

  const bodyPayload = {
    organizationName: payload.organizationName,
    organizationType: organizationTypeValue[payload.organizationType],
    inn: payload.inn,
    ogrn: payload.ogrn,
    email: payload.email,
    phone: payload.phone,
    website: payload.website
  };

  const response = await fetch(env.MAIN_CRM_CREATE_ORG_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(env.MAIN_CRM_API_TOKEN ? { authorization: `Bearer ${env.MAIN_CRM_API_TOKEN}` } : {})
    },
    body: JSON.stringify(bodyPayload)
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Main CRM create failed: ${response.status} ${bodyText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  const body = (await response.json()) as unknown;
  if (typeof body === "string") {
    return body;
  }

  if (body && typeof body === "object" && "id" in body && typeof body.id === "string") {
    return body.id;
  }

  return null;
}
