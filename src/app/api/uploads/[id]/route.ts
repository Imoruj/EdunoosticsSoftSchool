import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function buildContentDisposition(fileName: string, download: boolean) {
    const safeFileName = fileName.replace(/["\r\n]/g, "_");
    const encodedFileName = encodeURIComponent(fileName);
    const dispositionType = download ? "attachment" : "inline";
    return `${dispositionType}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`;
}

function buildBaseHeaders(file: { mimeType: string; size: number; originalName: string }, download: boolean) {
    return {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": String(file.size),
        "Content-Disposition": buildContentDisposition(file.originalName, download),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
    };
}

function parseRange(rangeHeader: string, size: number) {
    const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/i);
    if (!match) return null;

    const startRaw = match[1];
    const endRaw = match[2];

    let start = startRaw ? Number(startRaw) : 0;
    let end = endRaw ? Number(endRaw) : size - 1;

    if (Number.isNaN(start) || Number.isNaN(end)) return null;

    if (!startRaw && endRaw) {
        const tailLength = Number(endRaw);
        if (Number.isNaN(tailLength) || tailLength <= 0) return null;
        start = Math.max(size - tailLength, 0);
        end = size - 1;
    }

    if (start < 0 || end < start || start >= size) return null;

    end = Math.min(end, size - 1);

    return { start, end };
}

async function getUploadedFile(id: string) {
    return prisma.uploadedFile.findUnique({
        where: { id },
        select: {
            mimeType: true,
            size: true,
            originalName: true,
            data: true,
        },
    });
}

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const file = await getUploadedFile(id);

    if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const download = req.nextUrl.searchParams.get("download") === "1";
    const body = Buffer.from(file.data);
    const rangeHeader = req.headers.get("range");

    if (rangeHeader) {
        const parsedRange = parseRange(rangeHeader, body.length);
        if (!parsedRange) {
            return new NextResponse(null, {
                status: 416,
                headers: {
                    "Content-Range": `bytes */${body.length}`,
                    "Accept-Ranges": "bytes",
                },
            });
        }

        const chunk = body.subarray(parsedRange.start, parsedRange.end + 1);
        return new NextResponse(chunk, {
            status: 206,
            headers: {
                ...buildBaseHeaders(file, download),
                "Content-Length": String(chunk.length),
                "Content-Range": `bytes ${parsedRange.start}-${parsedRange.end}/${body.length}`,
            },
        });
    }

    return new NextResponse(body, {
        status: 200,
        headers: buildBaseHeaders(file, download),
    });
}

export async function HEAD(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const file = await prisma.uploadedFile.findUnique({
        where: { id },
        select: {
            mimeType: true,
            size: true,
            originalName: true,
        },
    });

    if (!file) {
        return new NextResponse(null, { status: 404 });
    }

    const download = req.nextUrl.searchParams.get("download") === "1";

    return new NextResponse(null, {
        status: 200,
        headers: buildBaseHeaders(file, download),
    });
}
