import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/errors";

export async function withApiHandler<T>(handler: () => Promise<T>) {
  try {
    const data = await handler();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "请求参数校验失败",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code
        },
        { status: error.statusCode }
      );
    }

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误"
      },
      { status: 500 }
    );
  }
}
