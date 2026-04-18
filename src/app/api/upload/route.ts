export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaDirect } from "@/lib/prisma";
import { validateMagicBytes } from "@/lib/magicBytes";
import { checkCsrf } from "@/lib/csrf";
import { makeTransparentSignature } from "@/lib/signature-images";
import { isTransientPrismaError, withPrismaRetry } from "@/lib/prisma-transient";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB for student/user photos
const MAX_RICH_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB for lesson and quiz images
const MAX_ATTACHMENT_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB for assignment/submission files
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
};
const ALLOWED_ATTACHMENT_TYPES: Record<string, string> = {
    ...ALLOWED_IMAGE_TYPES,
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/plain": ".txt",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/aac": ".aac",
};
const STUDENT_PHOTO_UPLOAD_ROLES = new Set(["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER"]);
const STAFF_SIGNATURE_ROLES = new Set(["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER"]);

type UploadType =
    | "student_photo"
    | "avatar"
    | "signature"
    | "lesson_image"
    | "lesson_audio"
    | "quiz_image"
    | "quiz_option_image"
    | "assignment_attachment"
    | "submission_attachment"
    | "sow_reference";

const EXPLICIT_UPLOAD_TYPES = new Set<UploadType>([
    "student_photo",
    "avatar",
    "signature",
    "lesson_image",
    "lesson_audio",
    "quiz_image",
    "quiz_option_image",
    "assignment_attachment",
    "submission_attachment",
    "sow_reference",
]);

const LARGE_IMAGE_UPLOAD_TYPES = new Set<UploadType>([
    "lesson_image",
    "quiz_image",
    "quiz_option_image",
]);

const ATTACHMENT_UPLOAD_TYPES = new Set<UploadType>([
    "assignment_attachment",
    "submission_attachment",
    "sow_reference",
    "lesson_audio",
]);

function getAllowedTypes(uploadType: UploadType) {
    return ATTACHMENT_UPLOAD_TYPES.has(uploadType) ? ALLOWED_ATTACHMENT_TYPES : ALLOWED_IMAGE_TYPES;
}

function getAllowedTypesLabel(uploadType: UploadType) {
    return ATTACHMENT_UPLOAD_TYPES.has(uploadType)
        ? "PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MP3, WAV, OGG, M4A, AAC, JPG, PNG, GIF, or WEBP"
        : "JPG, PNG, GIF, or WEBP";
}

function getMaxUploadSize(uploadType: UploadType) {
    if (ATTACHMENT_UPLOAD_TYPES.has(uploadType)) {
        return MAX_ATTACHMENT_FILE_SIZE_BYTES;
    }

    if (LARGE_IMAGE_UPLOAD_TYPES.has(uploadType)) {
        return MAX_RICH_IMAGE_SIZE_BYTES;
    }

    return MAX_FILE_SIZE_BYTES;
}

function buildStoredFileName(uploadType: UploadType, userId: string, ext: string, studentId?: string) {
    switch (uploadType) {
        case "student_photo":
            return `student-${studentId}-${randomUUID()}${ext}`;
        case "lesson_image":
            return `lesson-${userId}-${randomUUID()}${ext}`;
        case "lesson_audio":
            return `lesson-audio-${userId}-${randomUUID()}${ext}`;
        case "quiz_image":
        case "quiz_option_image":
            return `quiz-${userId}-${randomUUID()}${ext}`;
        case "assignment_attachment":
            return `assignment-${userId}-${randomUUID()}${ext}`;
        case "submission_attachment":
            return `submission-${userId}-${randomUUID()}${ext}`;
        case "sow_reference":
            return `sow-reference-${userId}-${randomUUID()}${ext}`;
        case "signature":
            return `user-${userId}-signature-${randomUUID()}${ext}`;
        default:
            return `user-${userId}-${uploadType}-${randomUUID()}${ext}`;
    }
}

function getUploadErrorMessage(error: unknown) {
    return error instanceof Error && error.message ? error.message : "Upload failed";
}

function uploadBusyResponse() {
    return NextResponse.json(
        { error: "Upload is temporarily unavailable because the database is busy. Please retry." },
        { status: 503 }
    );
}

export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    let uploadType: UploadType | null = null;
    let uploadContext: Record<string, string | number | null> = {};

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = session.user as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];

        const formData = await req.formData();
        const file = formData.get("file");
        const studentIdRaw = formData.get("studentId");
        const requestedTypeRaw = formData.get("type");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "File is required" }, { status: 400 });
        }

        const studentId = typeof studentIdRaw === "string" ? studentIdRaw.trim() : "";
        const requestedType = typeof requestedTypeRaw === "string" ? requestedTypeRaw.trim().toLowerCase() : "";

        if (EXPLICIT_UPLOAD_TYPES.has(requestedType as UploadType)) {
            uploadType = requestedType as UploadType;
        } else if (studentId && studentId !== "user-avatar") {
            uploadType = "student_photo";
        } else {
            uploadType = "avatar";
        }

        const resolvedUploadType = uploadType;

        uploadContext = {
            userId: user.id,
            schoolId: user.schoolId ?? null,
            fileName: file.name || null,
            fileType: file.type || null,
            fileSize: file.size,
        };

        const allowedTypes = getAllowedTypes(resolvedUploadType);
        const ext = allowedTypes[file.type];
        if (!ext) {
            return NextResponse.json(
                { error: `Unsupported file type. Use ${getAllowedTypesLabel(resolvedUploadType)}.` },
                { status: 400 }
            );
        }

        // Check file size limits
        const maxSize = getMaxUploadSize(resolvedUploadType);
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024);
            return NextResponse.json({ error: `File size must be ${maxSizeMB}MB or less.` }, { status: 400 });
        }

        // Validate actual file content against declared MIME type (magic-byte check).
        // This prevents renamed executables / polyglots from bypassing MIME filtering.
        const magicValid = await validateMagicBytes(file);
        if (!magicValid) {
            return NextResponse.json(
                { error: "File content does not match the declared file type. Please upload a valid file." },
                { status: 400 },
            );
        }

        // Validate permissions
        if (resolvedUploadType === "student_photo") {
            const canUploadStudentPhoto = roles.some((role) => STUDENT_PHOTO_UPLOAD_ROLES.has(role));
            if (!canUploadStudentPhoto) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            if (!studentId || studentId === "user-avatar") {
                return NextResponse.json({ error: "Valid student ID is required for student photo upload" }, { status: 400 });
            }

        } else if (resolvedUploadType === "signature") {
            const canUploadSignature = roles.some((role) => STAFF_SIGNATURE_ROLES.has(role));
            if (!canUploadSignature) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const byteView = new Uint8Array(bytes);
        const buffer: Buffer = Buffer.from(byteView);

        let storedBuffer: Buffer = buffer;
        let storedMimeType = file.type;
        let storedExt = ext;

        if (resolvedUploadType === "signature") {
            const processedSignature = await makeTransparentSignature(buffer);
            storedBuffer = Buffer.from(processedSignature.buffer);
            storedMimeType = processedSignature.mimeType;
            storedExt = processedSignature.extension;
        }

        const storedName = buildStoredFileName(resolvedUploadType, user.id, storedExt, studentId || undefined);

        if (resolvedUploadType === "student_photo") {
            const savedStudentPhoto = await withPrismaRetry("/api/upload student photo save", () =>
                prismaDirect.$transaction(async (tx) => {
                    const uploadedFile = await tx.uploadedFile.create({
                        data: {
                            schoolId: user.schoolId ?? null,
                            uploadedById: user.id,
                            uploadType: resolvedUploadType,
                            originalName: file.name || storedName,
                            storedName,
                            mimeType: storedMimeType,
                            extension: storedExt,
                            size: storedBuffer.length,
                            data: storedBuffer,
                        },
                        select: { id: true },
                    });

                    const url = `/api/uploads/${uploadedFile.id}`;
                    const updatedStudents = await tx.student.updateMany({
                        where: {
                            id: studentId,
                            schoolId: user.schoolId,
                        },
                        data: { photoUrl: url },
                    });

                    if (updatedStudents.count === 0) {
                        throw new Error("Student not found");
                    }

                    return { id: uploadedFile.id, url };
                })
            );

            return NextResponse.json(savedStudentPhoto);
        }

        const uploadedFile = await withPrismaRetry("/api/upload file create", () =>
            prismaDirect.uploadedFile.create({
                data: {
                    schoolId: user.schoolId ?? null,
                    uploadedById: user.id,
                    uploadType: resolvedUploadType,
                    originalName: file.name || storedName,
                    storedName,
                    mimeType: storedMimeType,
                    extension: storedExt,
                    size: storedBuffer.length,
                    data: storedBuffer,
                },
                select: { id: true },
            })
        );

        return NextResponse.json({ id: uploadedFile.id, url: `/api/uploads/${uploadedFile.id}` });
    } catch (error) {
        const message = getUploadErrorMessage(error);
        console.error("Error uploading file:", {
            message,
            uploadType,
            ...uploadContext,
            error,
        });

        if (isTransientPrismaError(error)) {
            return uploadBusyResponse();
        }

        return NextResponse.json(
            { error: process.env.NODE_ENV === "development" ? message : "Upload failed" },
            { status: 500 }
        );
    }
}

