export type OrganizationType = "Company" | "Individual" | "Other";
export type OrganizationStatus = "Active" | "Blocked";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "FAILED";

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
};

export type OrganizationRequest = {
  id: string;
  organization_name: string;
  organization_type: OrganizationType;
  inn: string | null;
  ogrn: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  requested_by_email: string;
  status: RequestStatus;
  decision_comment: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  external_organization_id: string | null;
};

export type RequestEvent = {
  id: number;
  request_id: string;
  event_type: string;
  actor_user_id: string | null;
  message: string;
  created_at: string;
};

export type RequestDetails = {
  request: OrganizationRequest;
  events: RequestEvent[];
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
