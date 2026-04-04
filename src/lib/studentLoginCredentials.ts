import bcrypt from "bcryptjs";

function normalizeNamePart(value: string | null | undefined, fallback: string) {
    const normalized = (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");

    return normalized || fallback;
}

export function getSchoolInitials(schoolName: string) {
    if (!schoolName) return "SCH";

    const cleanName = schoolName.replace(/[^a-zA-Z0-9 ]/g, "");
    const words = cleanName.split(" ").filter((word) => word.length > 0);

    if (words.length === 0) return "SCH";
    if (words.length === 1) return words[0].slice(0, 4).toUpperCase();

    return words.map((word) => word[0]).join("").toUpperCase();
}

export async function ensureUniqueStudentEmail(
    client: any,
    params: {
        firstName: string;
        lastName: string;
        schoolName: string;
        excludeUserId?: string | null;
    }
) {
    const firstNamePart = normalizeNamePart(params.firstName, "student");
    const lastNamePart = normalizeNamePart(params.lastName, "user");
    const schoolInitials = getSchoolInitials(params.schoolName).toLowerCase();
    const localBase = `${firstNamePart}.${lastNamePart}`;
    const domain = `${schoolInitials}.com`;

    let suffix = 0;

    while (true) {
        const email = suffix === 0
            ? `${localBase}@${domain}`
            : `${localBase}${suffix + 1}@${domain}`;

        const existingUser = await client.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (!existingUser || existingUser.id === params.excludeUserId) {
            return email;
        }

        suffix += 1;
    }
}

export function generateStudentDefaultPassword(params: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    schoolName: string;
}) {
    const schoolInitials = getSchoolInitials(params.schoolName);
    const nameInitials = `${normalizeNamePart(params.firstName, "s")[0] || "s"}${normalizeNamePart(params.lastName, "u")[0] || "u"}`
        .toUpperCase();
    const admissionToken = params.admissionNumber
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(-6)
        .padStart(6, "0");

    return `${schoolInitials}@${nameInitials}${admissionToken}`;
}

export async function generateStudentDefaultPasswordHash(params: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    schoolName: string;
}) {
    const password = generateStudentDefaultPassword(params);
    const passwordHash = await bcrypt.hash(password, 12);

    return {
        password,
        passwordHash,
    };
}

export async function syncStudentTemporaryLoginCredentials(
    client: any,
    params: {
        userId: string;
        firstName: string;
        lastName: string;
        admissionNumber: string;
        schoolName: string;
        mustChangePassword?: boolean | null;
        isActive?: boolean | null;
    }
) {
    const email = await ensureUniqueStudentEmail(client, {
        firstName: params.firstName,
        lastName: params.lastName,
        schoolName: params.schoolName,
        excludeUserId: params.userId,
    });

    const updateData: Record<string, unknown> = {
        email,
        firstName: params.firstName,
        lastName: params.lastName,
    };

    if (typeof params.isActive === "boolean") {
        updateData.isActive = params.isActive;
    }

    let password: string | null = null;

    if (params.mustChangePassword) {
        const generated = await generateStudentDefaultPasswordHash({
            firstName: params.firstName,
            lastName: params.lastName,
            admissionNumber: params.admissionNumber,
            schoolName: params.schoolName,
        });

        password = generated.password;
        updateData.passwordHash = generated.passwordHash;
        updateData.mustChangePassword = true;
    }

    await client.user.update({
        where: { id: params.userId },
        data: updateData,
    });

    return {
        email,
        password,
        defaultPasswordActive: Boolean(params.mustChangePassword),
    };
}
