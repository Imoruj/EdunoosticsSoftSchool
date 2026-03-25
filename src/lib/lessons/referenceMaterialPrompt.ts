import { prisma } from "@/lib/prisma";
import type { LessonReferenceMaterial } from "@/lib/db/types";

export type ReferenceMaterialPromptInput = Pick<
  LessonReferenceMaterial,
  "id" | "type" | "title" | "url" | "fileKey" | "description"
>;

function parseUploadedFileId(path?: string | null) {
  const match = path?.match(/^\/api\/uploads\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function compactText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeValue(value: string | null | undefined, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

async function extractUploadedReferenceExcerpt(fileId: string, excerptLength: number) {
  const uploadedFile = await prisma.uploadedFile.findUnique({
    where: { id: fileId },
    select: {
      originalName: true,
      mimeType: true,
      data: true,
    },
  });

  if (!uploadedFile) return null;

  try {
    if (uploadedFile.mimeType.startsWith("text/")) {
      return {
        fileName: uploadedFile.originalName,
        excerpt: compactText(Buffer.from(uploadedFile.data).toString("utf8"), excerptLength),
      };
    }

    if (uploadedFile.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(uploadedFile.data) });
      return {
        fileName: uploadedFile.originalName,
        excerpt: compactText(result.value || "", excerptLength),
      };
    }

    if (uploadedFile.mimeType === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: Buffer.from(uploadedFile.data) });
      try {
        const result = await parser.getText();
        return {
          fileName: uploadedFile.originalName,
          excerpt: compactText(result.text || "", excerptLength),
        };
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    }
  } catch (error) {
    console.warn("[lessons/reference-material-prompt] Failed to extract uploaded reference text:", error);
  }

  return {
    fileName: uploadedFile.originalName,
    excerpt: "",
  };
}

export async function buildReferenceMaterialsBlock(
  referenceMaterials: ReferenceMaterialPromptInput[] | undefined,
  options?: {
    heading?: string;
    maxItems?: number;
    excerptLength?: number;
  },
) {
  if (!Array.isArray(referenceMaterials) || referenceMaterials.length === 0) return "";

  const heading = options?.heading || "Reference materials selected for this lesson:";
  const maxItems = options?.maxItems ?? 6;
  const excerptLength = options?.excerptLength ?? 1200;
  const items: string[] = [];

  for (const [index, reference] of referenceMaterials.slice(0, maxItems).entries()) {
    try {
      const title = normalizeValue(reference?.title, "Untitled reference");
      const description = normalizeValue(reference?.description);
      const href = normalizeValue(reference?.fileKey) || normalizeValue(reference?.url);
      const type = normalizeValue(reference?.type, "REFERENCE");
      const lines = [`${index + 1}. ${type}: ${title}`];

      if (description) {
        lines.push(`Note: ${compactText(description, 280)}`);
      }

      if (href && !href.startsWith("/api/uploads/")) {
        lines.push(`Link: ${href}`);
      }

      const uploadedFileId = parseUploadedFileId(href);
      if (uploadedFileId) {
        const uploaded = await extractUploadedReferenceExcerpt(uploadedFileId, excerptLength);
        if (uploaded?.fileName) {
          lines.push(`Uploaded file: ${uploaded.fileName}`);
        }
        if (uploaded?.excerpt) {
          lines.push(`File excerpt: ${uploaded.excerpt}`);
        }
      }

      items.push(lines.join("\n"));
    } catch (error) {
      console.warn("[lessons/reference-material-prompt] Failed to process reference material:", error);
    }
  }

  return items.length > 0
    ? `\n${heading}\n${items.join("\n\n")}`
    : "";
}

