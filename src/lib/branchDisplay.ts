export function normalizeEntityName(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function inferBranchName(schoolName: string, organizationName: string, isHeadBranch = false) {
    if (isHeadBranch) return "Head Branch";

    const normalizedSchool = normalizeEntityName(schoolName);
    const normalizedOrganization = normalizeEntityName(organizationName);
    if (normalizedSchool.startsWith(normalizedOrganization)) {
        const suffix = schoolName.slice(organizationName.length).replace(/^[-\s]+/, "").trim();
        if (suffix) return suffix;
    }

    return schoolName;
}

export function getSharedSchoolName(school: { name: string; organization?: { name: string } | null }) {
    return school.organization?.name || school.name;
}

export function getBranchName(school: {
    name: string;
    branchCode?: string | null;
    isHeadBranch?: boolean | null;
    organization?: { name: string } | null;
}) {
    const organizationName = getSharedSchoolName(school);
    return school.branchCode?.trim() || inferBranchName(school.name, organizationName, school.isHeadBranch === true);
}
