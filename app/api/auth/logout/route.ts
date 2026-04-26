import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { withApiHandler } from "@/lib/api";

export async function POST() {
  return withApiHandler(async () => {
    cookies().delete(SESSION_COOKIE_NAME);
    return { ok: true };
  });
}
