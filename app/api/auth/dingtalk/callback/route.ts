import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";

import { AppError } from "@/lib/errors";
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
import { generateUniqueReadableUsername, normalizeDisplayName } from "@/lib/user-identity";
import { auditLogService } from "@/modules/core/audit-log.service";

export const dynamic = "force-dynamic";

const APP_ORIGIN_ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXTAUTH_URL",
  "APP_URL",
  "BASE_URL",
  "SITE_URL"
];

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "");
}

function maskValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  if (value.length <= 8) {
    return "***";
  }
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function getConfiguredAppOrigin() {
  for (const key of APP_ORIGIN_ENV_KEYS) {
    const value = process.env[key];
    if (value && /^https?:\/\//i.test(value)) {
      return normalizeOrigin(value);
    }
  }
  return null;
}

function getAppOrigin(req: NextRequest) {
  const configuredOrigin = getConfiguredAppOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const requestOrigin = req.nextUrl.origin;
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(requestOrigin)) {
    return "https://ltc.ssalcloud.com";
  }

  return normalizeOrigin(requestOrigin);
}

function redirectToLogin(req: NextRequest, error: string, debug?: string) {
  const url = new URL("/login", getAppOrigin(req));
  url.searchParams.set("error", error);
  if (debug) {
    url.searchParams.set("debug", debug);
  }
  return NextResponse.redirect(url);
}

async function createUserFromDingTalk(profile: DingTalkUserProfile) {
  const displayName = normalizeDisplayName(profile.nick);

  console.info("DingTalk callback creating local user", {
    providerUserId: maskValue(profile.providerUserId),
    dingUserId: maskValue(profile.userId ?? null),
    displayName,
    email: profile.email ?? null,
    mobile: maskValue(profile.mobile)
  });

  const viewerRole = await prisma.role.findFirst({
    where: {
      code: ROLE_CODES.VIEWER,
      isDeleted: false
    }
  });

  const fallbackPasswordHash = await bcrypt.hash("DINGTALK_LOGIN_ONLY", 10);
  const username = await generateUniqueReadableUsername(displayName);

  const created = await prisma.user.create({
    data: {
      dingUserId: profile.userId || profile.providerUserId,
      displayName,
      username,
      name: displayName,
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
  const rawCode = url.searchParams.get("code");
  const rawAuthCode = url.searchParams.get("authCode");
  const state = url.searchParams.get("state");
  const savedState = cookies().get("dingtalk_oauth_state")?.value;

  console.info("DingTalk callback entered", {
    requestUrl: request.url,
    hasCode: Boolean(rawCode),
    hasAuthCode: Boolean(rawAuthCode),
    hasState: Boolean(state),
    code: maskValue(code),
    state: maskValue(state),
    cookieState: maskValue(savedState)
  });

  cookies().delete("dingtalk_oauth_state");

  const isStateValid =
    Boolean(code) &&
    Boolean(state) &&
    Boolean(savedState) &&
    state === savedState &&
    isValidDingTalkState(state);

  console.info("DingTalk callback state validation finished", {
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasSavedState: Boolean(savedState),
    stateMatched: Boolean(state && savedState && state === savedState),
    isStateValid
  });

  if (!isStateValid) {
    console.warn("DingTalk callback rejected by state validation", {
      code: maskValue(code),
      state: maskValue(state),
      cookieState: maskValue(savedState)
    });
    return redirectToLogin(request, "dingtalk_state_invalid", "dingtalk_callback_hit");
  }

  const validatedCode = code!;

  try {
    console.info("DingTalk callback exchanging code for token", {
      code: maskValue(validatedCode)
    });
    const tokenResult = await exchangeCodeForToken(validatedCode);

    console.info("DingTalk callback fetching DingTalk user profile", {
      accessToken: maskValue(tokenResult.accessToken)
    });
    const profile = await fetchDingTalkUser(tokenResult);

    console.info("DingTalk callback querying auth binding", {
      provider: "dingtalk",
      providerUserId: maskValue(profile.providerUserId)
    });
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

    console.info("DingTalk callback auth binding query finished", {
      foundBinding: Boolean(binding),
      bindingUserId: binding?.userId ?? null
    });

    let user = binding?.user;

    if (!user) {
      console.info("DingTalk callback did not find local binding, creating user", {
        providerUserId: maskValue(profile.providerUserId)
      });
      user = await createUserFromDingTalk(profile);

      console.info("DingTalk callback local user created", {
        userId: user.id,
        username: user.username
      });

      console.info("DingTalk callback creating auth binding", {
        userId: user.id,
        providerUserId: maskValue(profile.providerUserId)
      });
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

      console.info("DingTalk callback auth binding created", {
        userId: user.id,
        providerUserId: maskValue(profile.providerUserId)
      });
    } else {
      const displayName = normalizeDisplayName(profile.nick);
      const nextDingUserId = profile.userId || profile.providerUserId;

      const shouldUpdateIdentity =
        user.displayName !== displayName ||
        user.name !== displayName ||
        user.dingUserId !== nextDingUserId ||
        (profile.email && user.email !== profile.email) ||
        (profile.mobile && user.phone !== profile.mobile);

      if (shouldUpdateIdentity) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            displayName,
            name: displayName,
            dingUserId: nextDingUserId,
            email: profile.email || user.email || null,
            phone: profile.mobile || user.phone || null
          },
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
    }

    if (!user || !user.isActive || user.isDeleted) {
      console.warn("DingTalk callback user is unavailable after binding lookup", {
        userId: user?.id ?? null,
        isActive: user?.isActive ?? null,
        isDeleted: user?.isDeleted ?? null
      });
      return redirectToLogin(request, "dingtalk_binding_failed");
    }

    console.info("DingTalk callback creating session", {
      userId: user.id,
      username: user.username
    });

    let token: string;
    try {
      token = await signSession({
        id: user.id,
        username: user.username,
        name: user.displayName
      });
    } catch (error) {
      console.error("DingTalk callback session signing failed", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return redirectToLogin(request, "dingtalk_session_failed");
    }

    cookies().set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    console.info("DingTalk callback session cookie written", {
      cookieName: SESSION_COOKIE_NAME,
      token: maskValue(token)
    });

    await auditLogService.log({
      entityType: "USER",
      entityId: user.id,
      entityCode: user.username,
      action: "LOGIN",
      actorId: user.id,
      message: "钉钉登录"
    });

    const redirectUrl = new URL("/dashboard", getAppOrigin(request));
    console.info("DingTalk callback completed successfully", {
      redirectTo: redirectUrl.toString(),
      userId: user.id
    });
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const appErrorCode = error instanceof AppError ? error.code : null;

    console.error("DingTalk callback failed", {
      code: appErrorCode,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      prismaCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
      prismaMeta: error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined,
      prismaMessage: error instanceof Prisma.PrismaClientInitializationError ? error.message : undefined
    });

    if (appErrorCode === "DINGTALK_USERINFO_FAILED") {
      return redirectToLogin(request, "dingtalk_userinfo_failed");
    }
    if (appErrorCode === "DINGTALK_TOKEN_FAILED") {
      return redirectToLogin(request, "dingtalk_token_failed");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientValidationError ||
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return redirectToLogin(request, "dingtalk_binding_failed");
    }
    return redirectToLogin(request, "dingtalk_oauth_failed");
  }
}
