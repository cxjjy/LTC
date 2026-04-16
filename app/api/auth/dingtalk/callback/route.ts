import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { signSession } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import {
  exchangeCodeForToken,
  fetchDingTalkUser,
  isValidDingTalkState,
  type DingTalkUserProfile
} from "@/lib/dingtalk";
import { prisma } from "@/lib/prisma";
import { ROLE_CODES } from "@/lib/permissions";
import { auditLogService } from "@/modules/core/audit-log.service";

function redirectToLogin(req: NextRequest, error: string, debug?: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  if (debug) {
    url.searchParams.set("debug", debug);
  }
  return NextResponse.redirect(url);
}

function buildUsername(profile: DingTalkUserProfile) {
  const base = `dd_${profile.providerUserId.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32) || Date.now()}`;
  return base.slice(0, 100);
}

async function createUserFromDingTalk(profile: DingTalkUserProfile) {
  const viewerRole = await prisma.role.findFirst({
    where: {
      code: ROLE_CODES.VIEWER,
      isDeleted: false
    }
  });

  const fallbackPasswordHash = await bcrypt.hash("DINGTALK_LOGIN_ONLY", 10);
  const username = buildUsername(profile);

  const created = await prisma.user.create({
    data: {
      username,
      name: profile.nick || "钉钉用户",
      role: UserRole.VIEWER,
      isActive: true,
      email: profile.email || null,
      phone: profile.mobile || null,
      passwordHash: fallbackPasswordHash,
      userRoles: viewerRole
        ? {
            create: {
              roleId: viewerRole.id
            }
          }
        : undefined
    },
  });

  return prisma.user.findFirstOrThrow({
    where: { id: created.id, isDeleted: false },
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
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || url.searchParams.get("authCode");
  const state = url.searchParams.get("state");
  const savedState = cookies().get("dingtalk_oauth_state")?.value;

  cookies().delete("dingtalk_oauth_state");

  if (!code || !state || !savedState || state !== savedState || !isValidDingTalkState(state)) {
    return redirectToLogin(request, "dingtalk_state_invalid", "dingtalk_callback_hit");
  }

  try {
    const tokenResult = await exchangeCodeForToken(code);
    const profile = await fetchDingTalkUser(tokenResult);

    let binding = await prisma.authBinding.findUnique({
      where: {
        provider_providerUserId: {
          provider: "dingtalk",
          providerUserId: profile.providerUserId
        }
      },
      include: {
        user: {
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
        }
      }
    });

    let user = binding?.user;

    if (!user) {
      user = await createUserFromDingTalk(profile);
      await prisma.authBinding.create({
        data: {
          userId: user.id,
          provider: "dingtalk",
          providerUserId: profile.providerUserId,
          unionId: profile.unionId || null,
          openId: profile.openId || null,
          nick: profile.nick || null,
          avatar: profile.avatar || null
        }
      });
    }

    if (!user || !user.isActive || user.isDeleted) {
      return redirectToLogin(request, "dingtalk_oauth_failed");
    }

    const token = await signSession({
      id: user.id,
      username: user.username,
      name: user.name
    });

    cookies().set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    await auditLogService.log({
      entityType: "USER",
      entityId: user.id,
      entityCode: user.username,
      action: "LOGIN",
      actorId: user.id,
      message: "钉钉登录"
    });

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("未获取到钉钉用户身份")) {
      return redirectToLogin(request, "dingtalk_userid_missing");
    }
    console.error("DingTalk callback failed", error);
    return redirectToLogin(request, "dingtalk_oauth_failed");
  }
}
