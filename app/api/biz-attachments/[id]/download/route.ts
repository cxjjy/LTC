import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { bizAttachmentService } from "@/modules/biz-attachments/service";

export const dynamic = "force-dynamic";

function buildContentDisposition(fileName: string) {
  const normalizedName = fileName.replace(/[\r\n"]/g, "_");
  const safeAsciiName = normalizedName.replace(/[^\x20-\x7E]+/g, "_");
  const encodedName = encodeURIComponent(fileName);
  return `attachment; filename="${normalizedName || safeAsciiName || "attachment"}"; filename*=UTF-8''${encodedName}`;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireApiUser();
    const payload = await bizAttachmentService.getDownloadPayload(params.id, user);

    return new NextResponse(payload.buffer, {
      status: 200,
      headers: {
        "Content-Type": payload.mimeType,
        "Content-Length": String(payload.buffer.byteLength),
        "Content-Disposition": buildContentDisposition(payload.fileName),
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
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
