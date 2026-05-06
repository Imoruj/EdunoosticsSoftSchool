import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Assignment, Lesson, Quiz } from "@/lib/db/types";
import { resolveAudienceStudents } from "@/lib/studentAudience";
import { createUserNotifications } from "@/lib/userNotifications";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

type PublishedContentType = "lesson" | "quiz" | "assignment";
type PublishedContentPayload = Lesson | Quiz | Assignment;

type PublishedContentInput = {
    type: PublishedContentType;
    payload: PublishedContentPayload;
};

const BLOB_TYPE_BY_CONTENT_TYPE: Record<PublishedContentType, string> = {
    lesson: "published_lesson",
    quiz: "published_quiz",
    assignment: "published_assignment",
};

const CONTENT_TYPE_BY_BLOB_TYPE = Object.fromEntries(
    Object.entries(BLOB_TYPE_BY_CONTENT_TYPE).map(([contentType, blobType]) => [blobType, contentType as PublishedContentType])
) as Record<string, PublishedContentType>;

function isPublishedContentType(value: string | null): value is PublishedContentType {
    return value === "lesson" || value === "quiz" || value === "assignment";
}

function normalizeRequestedTypes(rawType: string | null): PublishedContentType[] {
    if (!rawType) {
        return ["lesson", "quiz", "assignment"];
    }

    const requested = rawType
        .split(",")
        .map((value) => value.trim())
        .filter(isPublishedContentType);

    return requested.length > 0 ? Array.from(new Set(requested)) : ["lesson", "quiz", "assignment"];
}

function serializePayload(payload: PublishedContentPayload) {
    return Buffer.from(JSON.stringify(payload), "utf8");
}

function parsePayload<T>(bytes: Uint8Array | Buffer): T {
    return JSON.parse(Buffer.from(bytes).toString("utf8")) as T;
}

async function syncPublishedItem(schoolId: string, item: PublishedContentInput) {
    const blobType = BLOB_TYPE_BY_CONTENT_TYPE[item.type];
    const payload = item.payload as Partial<PublishedContentPayload> & {
        id?: string;
        isPublished?: boolean;
        assignedTo?: string[];
        classArmIds?: string[];
        subjectId?: string;
    };

    if (!payload.id) {
        throw new Error(`Published ${item.type} is missing an id.`);
    }

    if (!payload.isPublished) {
        await prisma.encryptedBlob.deleteMany({
            where: {
                blobType,
                entityId: payload.id,
            },
        });

        return {
            entityId: payload.id,
            type: item.type,
            syncedUsers: 0,
        };
    }

    const targetStudents = await resolveAudienceStudents({
        schoolId,
        assignedTo: payload.assignedTo,
        classArmIds: payload.classArmIds,
        subjectId: payload.subjectId,
    });
    const targetUserIds = Array.from(
        new Set(
            targetStudents
                .map((student) => student.userId)
                .filter((userId): userId is string => typeof userId === "string" && userId.length > 0)
        )
    );

    if (targetUserIds.length === 0) {
        await prisma.encryptedBlob.deleteMany({
            where: {
                blobType,
                entityId: payload.id,
            },
        });

        return {
            entityId: payload.id,
            type: item.type,
            syncedUsers: 0,
        };
    }

    const existingRecipients = await prisma.encryptedBlob.findMany({
        where: {
            blobType,
            entityId: payload.id,
        },
        select: { userId: true },
    });
    const existingRecipientIds = new Set(existingRecipients.map((entry) => entry.userId));
    const newlyAddedUserIds = targetUserIds.filter((userId) => !existingRecipientIds.has(userId));

    const serialized = serializePayload(item.payload);

    await prisma.$transaction([
        prisma.encryptedBlob.deleteMany({
            where: {
                blobType,
                entityId: payload.id,
                userId: { notIn: targetUserIds },
            },
        }),
        ...targetUserIds.map((userId) =>
            prisma.encryptedBlob.upsert({
                where: {
                    userId_blobType_entityId: {
                        userId,
                        blobType,
                        entityId: payload.id!,
                    },
                },
                update: {
                    encryptedData: serialized,
                    iv: "server-published-json",
                    signature: null,
                    expiresAt: null,
                },
                create: {
                    userId,
                    blobType,
                    entityId: payload.id!,
                    encryptedData: serialized,
                    iv: "server-published-json",
                    signature: null,
                },
            })
        ),
    ]);

    if (newlyAddedUserIds.length > 0) {
        const href =
            item.type === "assignment"
                ? "/dashboard/assignments"
                : item.type === "lesson"
                    ? "/dashboard/lessons"
                    : "/dashboard/quizzes";
        const title =
            item.type === "assignment"
                ? "New Assignment Published"
                : item.type === "lesson"
                    ? "New Lesson Published"
                    : "New Quiz Published";
        const itemTitle = typeof payload.title === "string" && payload.title.trim().length > 0
            ? payload.title.trim()
            : `A ${item.type}`;

        await createUserNotifications(newlyAddedUserIds, {
            schoolId,
            type: "RESULT_PUBLISHED",
            title,
            message: `${itemTitle} is now available in your portal.`,
            href,
            metadata: {
                contentType: item.type,
                entityId: payload.id,
            },
        });
    }

    return {
        entityId: payload.id,
        type: item.type,
        syncedUsers: targetUserIds.length,
    };
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const requestedTypes = normalizeRequestedTypes(req.nextUrl.searchParams.get("type"));
        const requestedId = req.nextUrl.searchParams.get("id")?.trim() || undefined;
        const blobTypes = requestedTypes.map((type) => BLOB_TYPE_BY_CONTENT_TYPE[type]);

        const blobs = await prisma.encryptedBlob.findMany({
            where: {
                userId: user.id,
                blobType: { in: blobTypes },
                ...(requestedId ? { entityId: requestedId } : {}),
            },
            orderBy: { updatedAt: "desc" },
        });

        const grouped = {
            lessons: [] as Lesson[],
            quizzes: [] as Quiz[],
            assignments: [] as Assignment[],
        };

        for (const blob of blobs) {
            const contentType = CONTENT_TYPE_BY_BLOB_TYPE[blob.blobType];
            if (!contentType) {
                continue;
            }

            try {
                const parsed = parsePayload<PublishedContentPayload>(blob.encryptedData);
                if (!parsed || typeof parsed !== "object" || !(parsed as any).isPublished) {
                    continue;
                }

                if (contentType === "lesson") {
                    grouped.lessons.push(parsed as Lesson);
                } else if (contentType === "quiz") {
                    grouped.quizzes.push(parsed as Quiz);
                } else if (contentType === "assignment") {
                    grouped.assignments.push(parsed as Assignment);
                }
            } catch (error) {
                console.error("Failed to parse published LMS blob:", error);
            }
        }

        return NextResponse.json(grouped);
    } catch (error) {
        console.error("Failed to fetch published LMS content:", error);
        return NextResponse.json({ error: "Failed to fetch published LMS content" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const isStudent = user.loginType === "student" || (Array.isArray(user.roles) && user.roles.includes("STUDENT"));

        if (!schoolId) {
            return NextResponse.json({ error: "School not found in session" }, { status: 400 });
        }

        if (isStudent) {
            return NextResponse.json({ error: "Students cannot publish LMS content" }, { status: 403 });
        }

        const body = await req.json().catch(() => null);
        const items = Array.isArray(body?.items) ? (body.items as PublishedContentInput[]) : [];

        if (items.length === 0) {
            return NextResponse.json({ error: "No LMS items provided" }, { status: 400 });
        }

        const invalidItem = items.find(
            (item) =>
                !item ||
                !isPublishedContentType((item as PublishedContentInput).type) ||
                !(item as PublishedContentInput).payload ||
                typeof (item as PublishedContentInput).payload !== "object"
        );

        if (invalidItem) {
            return NextResponse.json({ error: "Invalid LMS item payload" }, { status: 400 });
        }

        const results = [];
        for (const item of items) {
            results.push(await syncPublishedItem(schoolId, item));
        }

        return NextResponse.json({ synced: results });
    } catch (error) {
        console.error("Failed to sync published LMS content:", error);
        return NextResponse.json({ error: "Failed to sync published LMS content" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const isStudent = user.loginType === "student" || (Array.isArray(user.roles) && user.roles.includes("STUDENT"));

        if (isStudent) {
            return NextResponse.json({ error: "Students cannot delete published LMS content" }, { status: 403 });
        }

        const body = await req.json().catch(() => null);
        const type = typeof body?.type === "string" ? body.type : null;
        const id = typeof body?.id === "string" ? body.id.trim() : "";

        if (!isPublishedContentType(type) || !id) {
            return NextResponse.json({ error: "A valid content type and id are required" }, { status: 400 });
        }

        await prisma.encryptedBlob.deleteMany({
            where: {
                blobType: BLOB_TYPE_BY_CONTENT_TYPE[type],
                entityId: id,
            },
        });

        return NextResponse.json({ deleted: true });
    } catch (error) {
        console.error("Failed to delete published LMS content:", error);
        return NextResponse.json({ error: "Failed to delete published LMS content" }, { status: 500 });
    }
}
