import { redirect } from "next/navigation";

import { forbidden } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth";
import {
  defaultRolePermissionCodes,
  legacyRoleFallbackMap,
  permissionCode,
  type PermissionAction,
  type PermissionModule,
  type RoleCode
} from "@/lib/permissions";

export type ResourceAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "convert"
  | "status"
  | "payment";

export type ResourceName =
  | "dashboard"
  | "customer"
  | "lead"
  | "opportunity"
  | "project"
  | "weeklyReport"
  | "projectWeekly"
  | "managementWeekly"
  | "contract"
  | "contractApproval"
  | "delivery"
  | "cost"
  | "receivable"
  | "auditLog"
  | "user"
  | "role"
  | "permission";

const resourceModuleMap: Record<ResourceName, PermissionModule> = {
  dashboard: "dashboard",
  customer: "customer",
  lead: "lead",
  opportunity: "opportunity",
  project: "project",
  weeklyReport: "weekly_report",
  projectWeekly: "project_weekly",
  managementWeekly: "management_weekly",
  contract: "contract",
  contractApproval: "contract_approval",
  delivery: "delivery",
  cost: "cost",
  receivable: "receivable",
  auditLog: "audit_log",
  user: "user",
  role: "role",
  permission: "permission"
};

const actionAliasMap: Record<ResourceAction, PermissionAction> = {
  view: "view",
  create: "create",
  update: "update",
  delete: "delete",
  convert: "convert",
  status: "change_status",
  payment: "update"
};

function getFallbackPermissions(user: SessionUser) {
  const roleCode = legacyRoleFallbackMap[user.role] ?? "VIEWER";
  return defaultRolePermissionCodes[roleCode as RoleCode] ?? [];
}

export function hasPermission(user: SessionUser, code: string) {
  if (user.role === "SUPER_ADMIN" || user.roles?.some((role) => role.code === "SUPER_ADMIN")) {
    return true;
  }

  const permissionSet = new Set([...(user.permissions ?? []), ...getFallbackPermissions(user)]);
  return permissionSet.has(code);
}

export function requirePermission(user: SessionUser, code: string) {
  if (!hasPermission(user, code)) {
    throw forbidden("当前账号缺少对应权限");
  }
}

export function requireAnyPermission(user: SessionUser, codes: string[]) {
  if (!codes.some((code) => hasPermission(user, code))) {
    throw forbidden("当前账号缺少对应权限");
  }
}

export function requireRole(user: SessionUser, role: string) {
  if (user.role === "SUPER_ADMIN" || user.roles?.some((item) => item.code === "SUPER_ADMIN")) {
    return;
  }

  const roleCodes = new Set([user.role, ...(user.roles?.map((item) => item.code) ?? [])]);
  if (!roleCodes.has(role)) {
    throw forbidden(`需要 ${role} 角色权限`);
  }
}

export function requireAnyRole(user: SessionUser, roles: string[]) {
  if (user.role === "SUPER_ADMIN" || user.roles?.some((item) => item.code === "SUPER_ADMIN")) {
    return;
  }

  const roleCodes = new Set([user.role, ...(user.roles?.map((item) => item.code) ?? [])]);
  if (!roles.some((role) => roleCodes.has(role))) {
    throw forbidden("当前角色无权执行此操作");
  }
}

export function canAccessRecord(user: SessionUser, resource: ResourceName, action: ResourceAction) {
  return hasPermission(user, permissionCode(resourceModuleMap[resource], actionAliasMap[action]));
}

export function assertCanAccessRecord(user: SessionUser, resource: ResourceName, action: ResourceAction) {
  if (!canAccessRecord(user, resource, action)) {
    throw forbidden("当前角色无权执行此操作");
  }
}

export async function requirePagePermission(
  user: Promise<SessionUser> | SessionUser,
  resource: ResourceName,
  action: ResourceAction,
  redirectTo = "/forbidden"
) {
  const resolvedUser = await user;
  if (!canAccessRecord(resolvedUser, resource, action)) {
    redirect(redirectTo);
  }
  return resolvedUser;
}
