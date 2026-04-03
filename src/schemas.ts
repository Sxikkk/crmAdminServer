import { z } from "zod";
import { organizationStatuses, organizationTypes, requestStatuses } from "./types.js";

export const adminRoles = ["admin", "manager", "reviewer"] as const;

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().max(256),
  password: z.string().min(8).max(100),
  role: z.enum(adminRoles).default("reviewer")
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export const createRequestSchema = z.object({
  organizationName: z.string().min(2).max(300),
  organizationType: z.enum(organizationTypes).default("Company"),
  inn: z.string().min(10).max(12).optional(),
  ogrn: z.string().min(13).max(13).optional(),
  email: z.string().email().max(256).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().max(200).optional(),
  city: z.string().max(100).optional(),
  requestedByEmail: z.string().email().max(256)
});

export const requestFilterSchema = z.object({
  status: z.enum(requestStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const rejectSchema = z.object({
  comment: z.string().min(2).max(1000)
});

export const updateOrganizationTypeSchema = z.object({
  organizationType: z.enum(organizationTypes)
});

export const updateOrganizationStatusSchema = z.object({
  organizationStatus: z.enum(organizationStatuses)
});
