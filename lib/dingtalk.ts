import crypto from "crypto";

import { AppError, badRequest } from "@/lib/errors";

const CURRENT_AUTH_BASE = "https://login.dingtalk.com/oauth2/auth";
const DEFAULT_TOKEN_URL = "https://api.dingtalk.com/v1.0/oauth2/userAccessToken";
const DEFAULT_USERINFO_URL = "https://api.dingtalk.com/v1.0/contact/users/me";

type DingTalkTokenResult = {
  accessToken: string;
  refreshToken?: string | null;
  expireIn?: number | null;
  raw: unknown;
};

export type DingTalkUserProfile = {
  providerUserId: string;
  unionId?: string | null;
  openId?: string | null;
  userId?: string | null;
  nick?: string | null;
  avatar?: string | null;
  email?: string | null;
  mobile?: string | null;
  raw: unknown;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw badRequest(`缺少环境变量：${name}`);
  }
  return value;
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toStringValue(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function redact(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  if (value.length <= 8) {
    return "***";
  }
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function getStateSecret() {
  return getRequiredEnv("DINGTALK_STATE_SECRET");
}

export function createDingTalkState() {
  const nonce = crypto.randomBytes(16).toString("hex");
  const sig = crypto.createHmac("sha256", getStateSecret()).update(nonce).digest("hex");
  return `${nonce}.${sig}`;
}

export function isValidDingTalkState(state: string) {
  const [nonce, sig] = state.split(".");
  if (!nonce || !sig) {
    return false;
  }
  const expected = crypto.createHmac("sha256", getStateSecret()).update(nonce).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function buildDingTalkAuthUrl(state: string) {
  // 企业内部应用的浏览器网页登录方案，仅支持应用所属组织内用户登录。
  const url = new URL(CURRENT_AUTH_BASE);
  url.searchParams.set("client_id", getRequiredEnv("DINGTALK_CLIENT_ID"));
  url.searchParams.set("redirect_uri", getRequiredEnv("DINGTALK_REDIRECT_URI"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", getRequiredEnv("DINGTALK_SCOPE"));
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<DingTalkTokenResult> {
  console.info("DingTalk token exchange started", {
    code: redact(code)
  });

  const response = await fetch(process.env.DINGTALK_TOKEN_URL || DEFAULT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      clientId: getRequiredEnv("DINGTALK_CLIENT_ID"),
      clientSecret: getRequiredEnv("DINGTALK_CLIENT_SECRET"),
      code,
      grantType: "authorization_code"
    }),
    cache: "no-store"
  });

  const payload = await response.json().catch(() => ({}));
  const record = toRecord(payload);

  if (!response.ok) {
    console.error("DingTalk token exchange failed", {
      status: response.status,
      body: record,
      code: redact(code)
    });
    throw new AppError("钉钉授权失败，请稍后重试", 400, "DINGTALK_TOKEN_FAILED");
  }

  const accessToken = pickString(record, ["accessToken", "access_token"]);
  if (!accessToken) {
    console.error("DingTalk token exchange missing access token", {
      body: record,
      code: redact(code)
    });
    throw new AppError("钉钉授权失败，请稍后重试", 400, "DINGTALK_TOKEN_FAILED");
  }

  console.info("DingTalk token exchange succeeded", {
    expireIn: typeof record.expiresIn === "number" ? record.expiresIn : null,
    refreshToken: redact(pickString(record, ["refreshToken", "refresh_token"]))
  });

  return {
    accessToken,
    refreshToken: pickString(record, ["refreshToken", "refresh_token"]),
    expireIn: typeof record.expiresIn === "number" ? record.expiresIn : null,
    raw: payload
  };
}

export async function fetchDingTalkUser(tokenResult: DingTalkTokenResult): Promise<DingTalkUserProfile> {
  console.info("DingTalk user info request started", {
    url: process.env.DINGTALK_USERINFO_URL || DEFAULT_USERINFO_URL,
    accessToken: redact(tokenResult.accessToken),
    hasAccessTokenHeader: Boolean(tokenResult.accessToken)
  });

  const response = await fetch(process.env.DINGTALK_USERINFO_URL || DEFAULT_USERINFO_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-acs-dingtalk-access-token": tokenResult.accessToken,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => ({}));
  const record = toRecord(payload);
  const profile = toRecord(record.userInfo ?? record.user_info ?? record.data ?? record);

  if (!response.ok) {
    console.error("DingTalk user info request failed", {
      url: process.env.DINGTALK_USERINFO_URL || DEFAULT_USERINFO_URL,
      status: response.status,
      body: record,
      accessToken: redact(tokenResult.accessToken),
      hasAccessTokenHeader: Boolean(tokenResult.accessToken)
    });
    throw new AppError("钉钉用户信息获取失败，请稍后重试", 400, "DINGTALK_USERINFO_FAILED");
  }

  const unionId = pickString(profile, ["unionId", "union_id"]);
  const openId = pickString(profile, ["openId", "open_id"]);
  const userId = pickString(profile, ["userId", "userid", "user_id"]);
  const providerUserId = unionId || openId || userId;

  if (!providerUserId) {
    console.error("DingTalk user info missing stable identifier", {
      body: profile,
      accessToken: redact(tokenResult.accessToken)
    });
    throw new AppError("未获取到钉钉用户身份，请联系管理员", 400, "DINGTALK_USERINFO_FAILED");
  }

  console.info("DingTalk user info request succeeded", {
    url: process.env.DINGTALK_USERINFO_URL || DEFAULT_USERINFO_URL,
    unionId: redact(unionId),
    openId: redact(openId),
    userId: redact(userId),
    providerUserId: redact(providerUserId)
  });

  return {
    providerUserId,
    unionId,
    openId,
    userId,
    nick: pickString(profile, ["nick", "nickname", "name"]),
    avatar: pickString(profile, ["avatar", "avatarUrl", "avatar_url"]),
    email: pickString(profile, ["email", "mail"]),
    mobile: pickString(profile, ["mobile", "mobileNumber", "mobile_number"]),
    raw: payload
  };
}
