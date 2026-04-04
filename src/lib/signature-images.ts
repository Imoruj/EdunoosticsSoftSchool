import sharp from "sharp";
import { prisma } from "@/lib/prisma";

const SIGNATURE_OUTPUT_MIME = "image/png";
const SIGNATURE_OUTPUT_EXTENSION = ".png";
const IMAGE_DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i;

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function extractUploadedFileId(source: string) {
    const trimmedSource = source.trim();

    try {
        const parsed = trimmedSource.startsWith("http")
            ? new URL(trimmedSource)
            : new URL(trimmedSource, "http://localhost");
        const match = parsed.pathname.match(/\/api\/uploads\/([^/?#]+)/i);
        return match?.[1] ?? null;
    } catch {
        const match = trimmedSource.match(/\/api\/uploads\/([^/?#]+)/i);
        return match?.[1] ?? null;
    }
}

function buildDataUrl(buffer: Buffer) {
    return `data:${SIGNATURE_OUTPUT_MIME};base64,${buffer.toString("base64")}`;
}

export async function makeTransparentSignature(buffer: Buffer) {
    const decoded = await sharp(buffer, { failOn: "none" })
        .rotate()
        .flatten({ background: "#ffffff" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    if (!decoded.info.width || !decoded.info.height) {
        throw new Error("Invalid signature image");
    }

    const transformed = Buffer.alloc(decoded.data.length);

    for (let index = 0; index < decoded.data.length; index += 4) {
        const red = decoded.data[index];
        const green = decoded.data[index + 1];
        const blue = decoded.data[index + 2];

        const brightness = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
        const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
        const inkScore = (255 - brightness) + (saturation * 1.35);
        const alpha = inkScore <= 60 ? 0 : clamp(Math.round((inkScore - 60) * 4), 0, 255);

        transformed[index] = red;
        transformed[index + 1] = green;
        transformed[index + 2] = blue;
        transformed[index + 3] = alpha < 16 ? 0 : alpha;
    }

    const outputBuffer = await sharp(transformed, {
        raw: {
            width: decoded.info.width,
            height: decoded.info.height,
            channels: 4,
        },
    })
        .trim()
        .png()
        .toBuffer();

    return {
        buffer: outputBuffer,
        mimeType: SIGNATURE_OUTPUT_MIME,
        extension: SIGNATURE_OUTPUT_EXTENSION,
        size: outputBuffer.length,
        dataUrl: buildDataUrl(outputBuffer),
    };
}

export async function normalizeSignatureDataUrl(dataUrl: string) {
    const match = dataUrl.match(IMAGE_DATA_URL_PATTERN);
    if (!match) return dataUrl;

    const processed = await makeTransparentSignature(Buffer.from(match[2], "base64"));
    return processed.dataUrl;
}

export async function normalizeSignatureSource(source: string | null | undefined) {
    if (!source) return undefined;

    if (IMAGE_DATA_URL_PATTERN.test(source)) {
        return normalizeSignatureDataUrl(source);
    }

    const uploadedFileId = extractUploadedFileId(source);
    if (!uploadedFileId) {
        return source;
    }

    const uploadedFile = await prisma.uploadedFile.findUnique({
        where: { id: uploadedFileId },
        select: {
            uploadType: true,
            mimeType: true,
            data: true,
        },
    });

    if (!uploadedFile || uploadedFile.uploadType !== "signature" || !uploadedFile.mimeType.startsWith("image/")) {
        return source;
    }

    const processed = await makeTransparentSignature(Buffer.from(uploadedFile.data));
    return processed.dataUrl;
}
