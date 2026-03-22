import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { unauthorized } from "@/lib/errors";

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "SALES" | "PM" | "DELIVERY" | "FINANCE";
};

const encoder = new TextEncoder();

function getSecret() {
  return encoder.encode(process.env.SESSION_SECRET ?? "ltc-dev-session-secret");
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string) {
  const verified = await jwtVerify<SessionUser>(token, getSecret());
  return verified.payload;
}

export async function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifySession(token);
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
