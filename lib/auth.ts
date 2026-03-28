import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { defaultRolePermissionCodes, legacyRoleFallbackMap, roleLabelMap, type RoleCode } from "@/lib/permissions";

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: string;
  roleName: string;
  roles: Array<{
    id: string;
    code: string;
    name: string;
    isSystem: boolean;
  }>;
  permissions: string[];
};

type SessionToken = {
  id: string;
  username: string;
  name: string;
};

const encoder = new TextEncoder();

function getSecret() {
  return encoder.encode(process.env.SESSION_SECRET ?? "ltc-dev-session-secret");
}

export async function signSession(user: Pick<SessionUser, "id" | "username" | "name">) {
  return new SignJWT(user as SessionToken)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string) {
  const verified = await jwtVerify<SessionToken>(token, getSecret());
  return verified.payload;
}

export async function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await verifySession(token);
    const user = await prisma.user.findFirst({
      where: { id: verified.id, isDeleted: false },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive || user.isDeleted) {
      return null;
    }

    const assignedRoles = user.userRoles.map((item) => item.role);
    const derivedRoleCode =
      assignedRoles[0]?.code ??
      legacyRoleFallbackMap[user.role] ??
      "VIEWER";
    const permissions = assignedRoles.length
      ? Array.from(
          new Set(
            assignedRoles.flatMap((role) => role.rolePermissions.map((item) => item.permission.code))
          )
        )
      : defaultRolePermissionCodes[derivedRoleCode as RoleCode] ?? [];

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: derivedRoleCode,
      roleName: assignedRoles[0]?.name ?? roleLabelMap[derivedRoleCode as RoleCode] ?? derivedRoleCode,
      roles: assignedRoles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        isSystem: role.isSystem
      })),
      permissions
    } satisfies SessionUser;
  } catch {
    return null;
  }
}

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireApiUser() {
  const user = await getSessionUser();

  if (!user) {
    throw unauthorized();
  }

  return user;
}
