export function formatPublishedDate(publishedAt?: string | Date | null) {
    if (!publishedAt) {
        return "Date: __________";
    }

    const date = publishedAt instanceof Date ? publishedAt : new Date(publishedAt);

    if (Number.isNaN(date.getTime())) {
        return "Date: __________";
    }

    return `Date: ${date.toLocaleDateString("en-GB")}`;
}
