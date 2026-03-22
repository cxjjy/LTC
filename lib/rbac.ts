import type { UserRole } from "@prisma/client";

import { forbidden } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth";

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
  | "contract"
  | "delivery"
  | "cost"
  | "receivable"
  | "auditLog";

const allowAll = new Set<ResourceAction>([
  "view",
  "create",
  "update",
  "delete",
  "convert",
  "status",
  "payment"
]);

const permissions: Record<UserRole, Partial<Record<ResourceName, Set<ResourceAction>>>> = {
  ADMIN: {
    dashboard: allowAll,
    customer: allowAll,
    lead: allowAll,
    opportunity: allowAll,
    project: allowAll,
    contract: allowAll,
    delivery: allowAll,
    cost: allowAll,
    receivable: allowAll,
    auditLog: allowAll
  },
  SALES: {
    dashboard: new Set(["view"]),
    customer: new Set(["view", "create", "update"]),
    lead: new Set(["view", "create", "update", "convert"]),
    opportunity: new Set(["view", "create", "update", "convert"]),
    project: new Set(["view"]),
    contract: new Set(["view"]),
    delivery: new Set(["view"]),
    cost: new Set(["view"]),
    receivable: new Set(["view"]),
    auditLog: new Set(["view"])
  },
  PM: {
    dashboard: new Set(["view"]),
    customer: new Set(["view"]),
    lead: new Set(["view"]),
    opportunity: new Set(["view"]),
    project: new Set(["view", "create", "update", "status"]),
    contract: new Set(["view"]),
    delivery: new Set(["view", "create", "update", "status"]),
    cost: new Set(["view", "create", "update"]),
    receivable: new Set(["view"]),
    auditLog: new Set(["view"])
  },
  DELIVERY: {
    dashboard: new Set(["view"]),
    customer: new Set(["view"]),
    lead: new Set(["view"]),
    opportunity: new Set(["view"]),
    project: new Set(["view"]),
    contract: new Set(["view"]),
    delivery: new Set(["view", "create", "update", "status"]),
    cost: new Set(["view"]),
    receivable: new Set(["view"]),
    auditLog: new Set(["view"])
  },
  FINANCE: {
    dashboard: new Set(["view"]),
    customer: new Set(["view"]),
    lead: new Set(["view"]),
    opportunity: new Set(["view"]),
    project: new Set(["view"]),
    contract: new Set(["view", "update", "status"]),
    delivery: new Set(["view"]),
    cost: new Set(["view"]),
    receivable: new Set(["view", "create", "update", "payment"]),
    auditLog: new Set(["view"])
  }
};

export function requireRole(user: SessionUser, role: UserRole) {
  if (user.role !== "ADMIN" && user.role !== role) {
    throw forbidden(`需要 ${role} 角色权限`);
  }
}

export function requireAnyRole(user: SessionUser, roles: UserRole[]) {
  if (user.role !== "ADMIN" && !roles.includes(user.role)) {
    throw forbidden("当前角色无权执行此操作");
  }
}

export function canAccessRecord(user: SessionUser, resource: ResourceName, action: ResourceAction) {
  if (user.role === "ADMIN") {
    return true;
  }

  return permissions[user.role]?.[resource]?.has(action) ?? false;
}

export function assertCanAccessRecord(user: SessionUser, resource: ResourceName, action: ResourceAction) {
  if (!canAccessRecord(user, resource, action)) {
    throw forbidden("当前角色无权执行此操作");
  }
}
