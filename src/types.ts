export const organizationTypes = ["Company", "Individual", "Other"] as const;
export type OrganizationType = (typeof organizationTypes)[number];

export const organizationStatuses = ["Active", "Blocked"] as const;
export type OrganizationStatus = (typeof organizationStatuses)[number];

export const requestStatuses = ["PENDING", "APPROVED", "REJECTED", "FAILED"] as const;
export type RequestStatus = (typeof requestStatuses)[number];
