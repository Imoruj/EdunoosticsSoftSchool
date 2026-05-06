export function normalizeLoginNamePart(value: string | null | undefined) {
    return (value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

export function buildNameLoginPrefix(firstName: string | null | undefined, lastName: string | null | undefined) {
    const first = normalizeLoginNamePart(firstName);
    const last = normalizeLoginNamePart(lastName);
    return first && last ? `${first}.${last}` : "";
}

export function getEmailLocalPart(email: string | null | undefined) {
    return (email ?? "").trim().toLowerCase().split("@")[0] ?? "";
}

export function emailMatchesNameLoginPrefix(
    email: string | null | undefined,
    firstName: string | null | undefined,
    lastName: string | null | undefined
) {
    const expectedPrefix = buildNameLoginPrefix(firstName, lastName);
    if (!expectedPrefix) return false;

    return getEmailLocalPart(email) === expectedPrefix;
}
