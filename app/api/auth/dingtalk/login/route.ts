import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildDingTalkAuthUrl, createDingTalkState } from "@/lib/dingtalk";

export async function GET() {
  const state = createDingTalkState();

  cookies().set("dingtalk_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10
  });

  return NextResponse.redirect(buildDingTalkAuthUrl(state));
}
