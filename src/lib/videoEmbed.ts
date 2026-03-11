export function normalizeVideoEmbedUrl(url: string): string {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return "";

    let parsedUrlStr = trimmedUrl;
    if (!/^https?:\/\//i.test(parsedUrlStr)) {
        parsedUrlStr = `https://${parsedUrlStr}`;
    }

    try {
        const parsedUrl = new URL(parsedUrlStr);
        const hostname = parsedUrl.hostname.replace(/^www\./, "");
        const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

        if (hostname === "youtu.be") {
            const videoId = pathParts[0];
            return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : parsedUrlStr;
        }

        if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtube-nocookie.com") {
            const videoId =
                parsedUrl.searchParams.get("v") ||
                (pathParts[0] === "embed" ? pathParts[1] : undefined) ||
                (pathParts[0] === "shorts" ? pathParts[1] : undefined) ||
                (pathParts[0] === "live" ? pathParts[1] : undefined) ||
                (pathParts[0] === "v" ? pathParts[1] : undefined);

            return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : parsedUrlStr;
        }

        if (hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
            const videoId = pathParts.find((part) => /^\d+$/.test(part));
            return videoId ? `https://player.vimeo.com/video/${videoId}` : parsedUrlStr;
        }

        if (hostname === "drive.google.com") {
            const fileId =
                parsedUrl.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
                parsedUrl.searchParams.get("id");

            return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : parsedUrlStr;
        }
    } catch {
        return parsedUrlStr;
    }

    return parsedUrlStr;
}
