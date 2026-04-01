import type {
  AuthResponse,
  MainOrganization,
  OrganizationRequest,
  OrganizationStatus,
  OrganizationType,
  RequestDetails,
  RequestStatus
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4100/api";

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export async function createRequest(payload: {
  organizationName: string;
  organizationType: OrganizationType;
  inn?: string;
  ogrn?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  requestedByEmail: string;
}): Promise<OrganizationRequest> {
  return request<OrganizationRequest>("/requests", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getRequests(
  token: string,
  status: RequestStatus | "ALL"
): Promise<{ items: OrganizationRequest[] }> {
  const search = status === "ALL" ? "" : `?status=${status}`;
  return request<{ items: OrganizationRequest[] }>(`/requests${search}`, undefined, token);
}

export async function getRequestById(token: string, id: string): Promise<RequestDetails> {
  return request<RequestDetails>(`/requests/${id}`, undefined, token);
}

export async function approveRequest(token: string, id: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/requests/${id}/approve`, { method: "POST", body: "{}" }, token);
}

export async function rejectRequest(token: string, id: string, comment: string): Promise<{ status: string }> {
  return request<{ status: string }>(
    `/requests/${id}/reject`,
    { method: "POST", body: JSON.stringify({ comment }) },
    token
  );
}

export async function getOrganizations(token: string, search: string): Promise<{ items: MainOrganization[] }> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return request<{ items: MainOrganization[] }>(`/organizations${query}`, undefined, token);
}

export async function updateOrganizationType(
  token: string,
  id: string,
  organizationType: OrganizationType
): Promise<MainOrganization> {
  return request<MainOrganization>(
    `/organizations/${id}/type`,
    { method: "PATCH", body: JSON.stringify({ organizationType }) },
    token
  );
}

export async function updateOrganizationStatus(
  token: string,
  id: string,
  organizationStatus: OrganizationStatus
): Promise<MainOrganization> {
  return request<MainOrganization>(
    `/organizations/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ organizationStatus }) },
    token
  );
}
