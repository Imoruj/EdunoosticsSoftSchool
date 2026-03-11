
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import { validateMagicBytes } from "@/lib/magicBytes";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB for student/user photos
const MAX_RICH_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB for lesson and quiz images
const MAX_ATTACHMENT_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB for assignment/submission files
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": ".jpg",
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
};
const STUDENT_PHOTO_UPLOAD_ROLES = new Set(["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER"]);
const STAFF_SIGNATURE_ROLES = new Set(["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER"]);

type UploadType =
    | "student_photo"
    | "avatar"
    | "signature"
    | "lesson_image"
    | "quiz_image"
    | "quiz_option_image"
    | "assignment_attachment"
    | "submission_attachment";

const EXPLICIT_UPLOAD_TYPES = new Set<UploadType>([
    "student_photo",
    "avatar",
    "signature",
    "lesson_image",
    "quiz_image",
    "quiz_option_image",
    "assignment_attachment",
    "submission_attachment",
]);

const IMAGE_UPLOAD_TYPES = new Set<UploadType>([
    "student_photo",
    "avatar",
    "signature",
    "lesson_image",
    "quiz_image",
    "quiz_option_image",
]);

const LARGE_IMAGE_UPLOAD_TYPES = new Set<UploadType>([
    "lesson_image",
    "quiz_image",
    "quiz_option_image",
]);

const ATTACHMENT_UPLOAD_TYPES = new Set<UploadType>([
    "assignment_attachment",
    "submission_attachment",
]);

function getUploadFolder(uploadType: UploadType) {
    switch (uploadType) {
        case "student_photo":
            return "students";
        case "lesson_image":
            return "lessons";
        case "quiz_image":
        case "quiz_option_image":
            return "quizzes";
        case "assignment_attachment":
            return "assignments";
        case "submission_attachment":
            return "submissions";
        case "signature":
            return "signatures";
        default:
            return "avatars";
    }
}

function getAllowedTypes(uploadType: UploadType) {
    return ATTACHMENT_UPLOAD_TYPES.has(uploadType) ? ALLOWED_ATTACHMENT_TYPES : ALLOWED_IMAGE_TYPES;
}

function getAllowedTypesLabel(uploadType: UploadType) {
    return ATTACHMENT_UPLOAD_TYPES.has(uploadType)
        ? "PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, PNG, GIF, or WEBP"
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

// Check if Cloudinary is configured
const isCloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

// Configure Cloudinary if credentials are available
if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

// Upload to Cloudinary
async function uploadToCloudinary(buffer: Buffer, uploadType: UploadType, userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const upload_stream = cloudinary.uploader.upload_stream(
            {
                folder: `educare/${getUploadFolder(uploadType)}`,
                resource_type: IMAGE_UPLOAD_TYPES.has(uploadType) ? "image" : "auto",
                public_id: `${uploadType}-${userId}-${randomUUID()}`,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result!.secure_url);
            }
        );

        upload_stream.end(buffer);
    });
}

export async function POST(req: NextRequest) {
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

        let uploadType: UploadType;
        if (EXPLICIT_UPLOAD_TYPES.has(requestedType as UploadType)) {
            uploadType = requestedType as UploadType;
        } else if (studentId && studentId !== "user-avatar") {
            uploadType = "student_photo";
        } else {
            uploadType = "avatar";
        }

        const allowedTypes = getAllowedTypes(uploadType);
        const ext = allowedTypes[file.type];
        if (!ext) {
            return NextResponse.json(
                { error: `Unsupported file type. Use ${getAllowedTypesLabel(uploadType)}.` },
                { status: 400 }
            );
        }

        // Check file size limits
        const maxSize = getMaxUploadSize(uploadType);
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
        if (uploadType === "student_photo") {
            const canUploadStudentPhoto = roles.some((role) => STUDENT_PHOTO_UPLOAD_ROLES.has(role));
            if (!canUploadStudentPhoto) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            if (!studentId || studentId === "user-avatar") {
                return NextResponse.json({ error: "Valid student ID is required for student photo upload" }, { status: 400 });
            }

            const student = await prisma.student.findFirst({
                where: {
                    id: studentId,
                    schoolId: user.schoolId,
                },
                select: { id: true },
            });

            if (!student) {
                return NextResponse.json({ error: "Student not found" }, { status: 404 });
            }
        } else if (uploadType === "signature") {
            const canUploadSignature = roles.some((role) => STAFF_SIGNATURE_ROLES.has(role));
            if (!canUploadSignature) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary if configured (production), otherwise use local filesystem
        let fileUrl: string;
        if (isCloudinaryConfigured) {
            fileUrl = await uploadToCloudinary(buffer, uploadType, user.id);
        } else {
            // Local filesystem upload (development)
            let uploadDir = "";
            let fileUrlPrefix = "";
            let filename = "";

            if (uploadType === "student_photo") {
                filename = `student-${studentId}-${randomUUID()}${ext}`;
                uploadDir = path.join(process.cwd(), "public/uploads/students");
                fileUrlPrefix = "/uploads/students";
            } else if (uploadType === "lesson_image") {
                filename = `lesson-${user.id}-${randomUUID()}${ext}`;
                uploadDir = path.join(process.cwd(), "public/uploads/lessons");
                fileUrlPrefix = "/uploads/lessons";
            } else if (uploadType === "quiz_image" || uploadType === "quiz_option_image") {
                filename = `quiz-${user.id}-${randomUUID()}${ext}`;
                uploadDir = path.join(process.cwd(), "public/uploads/quizzes");
                fileUrlPrefix = "/uploads/quizzes";
            } else if (uploadType === "assignment_attachment") {
                filename = `assignment-${user.id}-${randomUUID()}${ext}`;
                uploadDir = path.join(process.cwd(), "public/uploads/assignments");
                fileUrlPrefix = "/uploads/assignments";
            } else if (uploadType === "submission_attachment") {
                filename = `submission-${user.id}-${randomUUID()}${ext}`;
                uploadDir = path.join(process.cwd(), "public/uploads/submissions");
                fileUrlPrefix = "/uploads/submissions";
            } else {
                const subDir = uploadType === "signature" ? "signatures" : "avatars";
                filename = `user-${user.id}-${uploadType}-${randomUUID()}${ext}`;
                uploadDir = path.join(process.cwd(), `public/uploads/users/${subDir}`);
                fileUrlPrefix = `/uploads/users/${subDir}`;
            }

            await mkdir(uploadDir, { recursive: true });
            const filepath = path.join(uploadDir, filename);
            await writeFile(filepath, buffer);
            fileUrl = `${fileUrlPrefix}/${filename}`;
        }

        return NextResponse.json({ url: fileUrl });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
