function parseScoreValue(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed || trimmed === "-") {
            return null;
        }

        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    return null;
}

export function formatScore(value: unknown, fallback = "-"): string {
    const parsed = parseScoreValue(value);
    return parsed === null ? fallback : parsed.toFixed(1);
}

export function formatScoreOrBlank(value: unknown): string {
    return formatScore(value, "");
}

export function formatNonZeroScoreOrBlank(value: unknown): string {
    const parsed = parseScoreValue(value);
    return parsed === null || parsed === 0 ? "" : parsed.toFixed(1);
}
