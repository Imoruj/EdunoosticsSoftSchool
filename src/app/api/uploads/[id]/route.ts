import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeTransparentSignature } from "@/lib/signature-images";

type UploadedFileRecord = Awaited<ReturnType<typeof getUploadedFile>>;

async function getUploadedFile(id: string) {
  return prisma.uploadedFile.findUnique({
    where: { id },
    select: {
      mimeType: true,
      size: true,
      originalName: true,
      uploadType: true,
      data: true,
    },
  });
}

async function resolveUploadedFileResponse(file: NonNullable<UploadedFileRecord>) {
    const originalBuffer = Buffer.from(file.data);
    const originalBody = new Uint8Array(originalBuffer);

  if (file.uploadType !== "signature" || !file.mimeType.startsWith("image/")) {
    return {
      body: originalBody,
      mimeType: file.mimeType,
      size: file.size,
      originalName: file.originalName,
    };
  }

    const processedSignature = await makeTransparentSignature(originalBuffer);
    const normalizedName = file.originalName.replace(/\.[^.]+$/, "") || "signature";

    return {
        body: new Uint8Array(processedSignature.buffer),
        mimeType: processedSignature.mimeType,
        size: processedSignature.size,
        originalName: `${normalizedName}.png`,
    };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const file = await getUploadedFile(id);

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const resolvedFile = await resolveUploadedFileResponse(file);
  const range = request.headers.get("range");

  if (range) {
    const matches = /bytes=(\d+)-(\d*)/.exec(range);
    if (matches) {
      const start = parseInt(matches[1], 10);
      const end = matches[2]
        ? parseInt(matches[2], 10)
        : resolvedFile.body.length - 1;

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start >= resolvedFile.body.length ||
        end >= resolvedFile.body.length ||
        start > end
      ) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${resolvedFile.body.length}`,
          },
        });
      }

      const chunk = resolvedFile.body.subarray(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          "Content-Type": resolvedFile.mimeType,
          "Content-Length": String(chunk.length),
          "Content-Range": `bytes ${start}-${end}/${resolvedFile.body.length}`,
          "Accept-Ranges": "bytes",
          "Content-Disposition": `inline; filename="${resolvedFile.originalName}"`,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  return new NextResponse(resolvedFile.body, {
    status: 200,
    headers: {
      "Content-Type": resolvedFile.mimeType,
      "Content-Length": String(resolvedFile.body.length),
      "Content-Disposition": `inline; filename="${resolvedFile.originalName}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    },
  });
}

export async function HEAD(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const file = await getUploadedFile(id);

  if (!file) {
    return new NextResponse(null, { status: 404 });
  }

  const resolvedFile = await resolveUploadedFileResponse(file);

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": resolvedFile.mimeType,
      "Content-Length": String(resolvedFile.body.length),
      "Content-Disposition": `inline; filename="${resolvedFile.originalName}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    },
  });
}
