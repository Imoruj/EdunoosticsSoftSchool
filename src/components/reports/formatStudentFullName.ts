type StudentNameLike = {
    firstName?: string | null;
    otherNames?: string | null;
    lastName?: string | null;
};

function capitalizeNameSegment(segment: string) {
    if (!segment) return "";

    return segment
        .split(/([-'])/)
        .map((part) => {
            if (part === "-" || part === "'") {
                return part;
            }

            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("");
}

function normalizeNamePart(value?: string | null) {
    if (!value) return "";

    return value
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(capitalizeNameSegment)
        .join(" ");
}

export function formatStudentFullName(student: StudentNameLike) {
    return [student.firstName, student.otherNames, student.lastName]
        .map(normalizeNamePart)
        .filter(Boolean)
        .join(" ");
}
