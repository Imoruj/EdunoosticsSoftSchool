import { Prisma } from "@prisma/client";

export type StudentWorkflowRecord = {
    id: string;
    userId: string | null;
    parentId: string | null;
    firstName: string;
    lastName: string;
    otherNames: string | null;
    admissionNumber: string;
    gender: string;
    dateOfBirth: Date | null;
    classArmId: string | null;
    stateOfOrigin: string | null;
    address: string | null;
    parentName: string | null;
    parentPhone: string | null;
    parentEmail: string | null;
    photoUrl: string | null;
    isActive: boolean;
    classArm?: {
        id: string;
        armName: string;
        class: {
            name: string;
        };
    } | null;
};

export type StudentUpdatePayload = {
    firstName?: string;
    lastName?: string;
    otherNames?: string | null;
    gender?: string;
    dateOfBirth?: string | null;
    classArmId?: string | null;
    stateOfOrigin?: string | null;
    address?: string | null;
    parentName?: string | null;
    parentPhone?: string | null;
    parentEmail?: string | null;
    photoUrl?: string | null;
    isActive?: boolean;
};

const OPTIONAL_STRING_FIELDS = [
    "otherNames",
    "classArmId",
    "stateOfOrigin",
    "address",
    "parentName",
    "parentPhone",
    "parentEmail",
    "photoUrl",
] as const;

const REQUIRED_STRING_FIELDS = [
    "firstName",
    "lastName",
    "gender",
] as const;

const STUDENT_EDIT_FIELD_LABELS: Record<keyof StudentUpdatePayload, string> = {
    firstName: "First name",
    lastName: "Last name",
    otherNames: "Other names",
    gender: "Gender",
    dateOfBirth: "Date of birth",
    classArmId: "Class",
    stateOfOrigin: "State of origin",
    address: "Address",
    parentName: "Parent name",
    parentPhone: "Parent phone",
    parentEmail: "Parent email",
    photoUrl: "Photo",
    isActive: "Status",
};

function normalizeOptionalString(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") return String(value);

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredString(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : "";
}

function normalizeDateInput(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    if (value instanceof Date) {
        return value.toISOString().split("T")[0];
    }
    return String(value);
}

function normalizeBoolean(value: unknown): boolean | undefined {
    return typeof value === "boolean" ? value : undefined;
}

function normalizeComparableValue(key: keyof StudentUpdatePayload, value: unknown) {
    if (key === "dateOfBirth") {
        if (!value) return null;
        if (value instanceof Date) return value.toISOString().split("T")[0];
        return String(value);
    }

    if (key === "isActive") {
        return typeof value === "boolean" ? value : null;
    }

    if (value === undefined || value === null || value === "") return null;
    return String(value);
}

export function getStudentClassLabel(student: Pick<StudentWorkflowRecord, "classArm">) {
    if (!student.classArm) return null;
    return `${student.classArm.class.name} ${student.classArm.armName}`.trim();
}

export function createStudentSnapshot(student: StudentWorkflowRecord) {
    return {
        firstName: student.firstName,
        lastName: student.lastName,
        otherNames: student.otherNames,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split("T")[0] : null,
        classArmId: student.classArmId,
        classLabel: getStudentClassLabel(student),
        stateOfOrigin: student.stateOfOrigin,
        address: student.address,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail,
        photoUrl: student.photoUrl,
        isActive: student.isActive,
    };
}

export function normalizeStudentUpdatePayload(input: Record<string, unknown>): StudentUpdatePayload {
    const normalized: StudentUpdatePayload = {};

    for (const key of REQUIRED_STRING_FIELDS) {
        const value = normalizeRequiredString(input[key]);
        if (value !== undefined) {
            normalized[key] = value;
        }
    }

    for (const key of OPTIONAL_STRING_FIELDS) {
        const value = normalizeOptionalString(input[key]);
        if (value !== undefined) {
            normalized[key] = value;
        }
    }

    const dateOfBirth = normalizeDateInput(input.dateOfBirth);
    if (dateOfBirth !== undefined) {
        normalized.dateOfBirth = dateOfBirth;
    }

    const isActive = normalizeBoolean(input.isActive);
    if (isActive !== undefined) {
        normalized.isActive = isActive;
    }

    return normalized;
}

export function getChangedStudentData(
    currentStudent: StudentWorkflowRecord,
    requestedData: StudentUpdatePayload
) {
    const currentSnapshot = createStudentSnapshot(currentStudent);
    const changedData: StudentUpdatePayload = {};

    for (const [rawKey, value] of Object.entries(requestedData)) {
        const key = rawKey as keyof StudentUpdatePayload;
        if (value === undefined) continue;

        const currentValue = normalizeComparableValue(key, currentSnapshot[key as keyof typeof currentSnapshot]);
        const nextValue = normalizeComparableValue(key, value);

        if (currentValue !== nextValue) {
            (changedData as Record<string, unknown>)[key] = value;
        }
    }

    return changedData;
}

export function isPhotoOnlyUpdate(changedData: StudentUpdatePayload) {
    const keys = Object.keys(changedData);
    return keys.length === 1 && keys[0] === "photoUrl";
}

export function buildStudentChangeSummary(params: {
    action: "EDIT" | "DELETE";
    changedData?: StudentUpdatePayload;
    requestedClassLabel?: string | null;
}) {
    if (params.action === "DELETE") {
        return "Delete student record";
    }

    const changedData = params.changedData || {};
    const entries = Object.entries(changedData);
    if (entries.length === 0) return "No field changes";

    return entries
        .map(([rawKey, rawValue]) => {
            const key = rawKey as keyof StudentUpdatePayload;
            const label = STUDENT_EDIT_FIELD_LABELS[key] || rawKey;

            if (key === "photoUrl") {
                return `${label}: Updated`;
            }

            if (key === "classArmId") {
                return `${label}: ${params.requestedClassLabel || "Updated"}`;
            }

            if (key === "isActive") {
                return `${label}: ${rawValue ? "Active" : "Inactive"}`;
            }

            if (key === "dateOfBirth") {
                return `${label}: ${rawValue || "Cleared"}`;
            }

            return `${label}: ${rawValue || "Cleared"}`;
        })
        .join(" | ");
}

export async function applyStudentUpdateTransaction(
    tx: Prisma.TransactionClient,
    studentId: string,
    data: StudentUpdatePayload
) {
    const parsedDateOfBirth =
        data.dateOfBirth === undefined
            ? undefined
            : data.dateOfBirth
                ? new Date(data.dateOfBirth)
                : null;

    const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
            firstName: data.firstName,
            lastName: data.lastName,
            otherNames: data.otherNames,
            gender: data.gender as any,
            dateOfBirth: parsedDateOfBirth,
            classArmId: data.classArmId,
            stateOfOrigin: data.stateOfOrigin,
            address: data.address,
            parentName: data.parentName,
            parentPhone: data.parentPhone,
            parentEmail: data.parentEmail,
            photoUrl: data.photoUrl,
            isActive: data.isActive,
        },
        include: {
            classArm: {
                include: { class: true },
            },
        },
    });

    if (updatedStudent.userId) {
        await tx.user.update({
            where: { id: updatedStudent.userId },
            data: {
                firstName: data.firstName !== undefined ? data.firstName : undefined,
                lastName: data.lastName !== undefined ? data.lastName : undefined,
                isActive: data.isActive !== undefined ? data.isActive : undefined,
            },
        });
    }

    if (updatedStudent.parentId) {
        const parent = await tx.parent.findUnique({
            where: { id: updatedStudent.parentId },
            include: { user: true },
        });

        if (parent) {
            const parentNames = data.parentName !== undefined
                ? (data.parentName || "").trim().split(/\s+/).filter(Boolean)
                : null;

            await tx.user.update({
                where: { id: parent.userId },
                data: {
                    phone: data.parentPhone !== undefined ? data.parentPhone : undefined,
                    email: data.parentEmail ? data.parentEmail : undefined,
                    firstName: parentNames && parentNames.length > 0 ? parentNames[0] : undefined,
                    lastName: parentNames && parentNames.length > 1 ? parentNames.slice(1).join(" ") : undefined,
                },
            });

            await tx.student.updateMany({
                where: {
                    parentId: parent.id,
                    id: { not: updatedStudent.id },
                },
                data: {
                    parentName: data.parentName !== undefined ? data.parentName : undefined,
                    parentPhone: data.parentPhone !== undefined ? data.parentPhone : undefined,
                    parentEmail: data.parentEmail !== undefined ? data.parentEmail : undefined,
                },
            });
        }
    }

    return updatedStudent;
}
