import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { signSession } from "@/lib/auth";
import { withApiHandler } from "@/lib/api";
import { authService } from "@/modules/auth/service";
import { loginSchema } from "@/modules/auth/validation";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = loginSchema.parse(await request.json());
    const user = await authService.login(body.username, body.password);
    const token = await signSession(user);

    cookies().set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return user;
  });
}
