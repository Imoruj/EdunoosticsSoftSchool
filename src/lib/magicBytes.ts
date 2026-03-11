/**
 * Magic-byte file type validation.
 * Checks the actual binary content of a file rather than trusting
 * the client-supplied Content-Type / file.type value.
 */

type MimeType = string;

interface Signature {
    bytes: number[];
    /** Byte offset at which the signature starts (default 0). */
    offset?: number;
}

// Map from MIME type → accepted byte signatures
const SIGNATURES: Record<MimeType, Signature[]> = {
    "image/jpeg":  [{ bytes: [0xff, 0xd8, 0xff] }],
    "image/png":   [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
    "image/gif":   [{ bytes: [0x47, 0x49, 0x46, 0x38] }],
    "image/webp":  [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
    "application/pdf": [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
    // Office Open XML (docx, xlsx, pptx) and ZIP share the PK header
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":       [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
    // Legacy Office formats use Compound Document (D0 CF 11 E0)
    "application/msword":          [{ bytes: [0xd0, 0xcf, 0x11, 0xe0] }],
    "application/vnd.ms-excel":    [{ bytes: [0xd0, 0xcf, 0x11, 0xe0] }],
    "application/vnd.ms-powerpoint": [{ bytes: [0xd0, 0xcf, 0x11, 0xe0] }],
    // Plain text: no magic bytes — skip check (allow any)
    "text/plain": [],
};

function matchesSignature(buf: Uint8Array, sig: Signature): boolean {
    const offset = sig.offset ?? 0;
    if (buf.length < offset + sig.bytes.length) return false;
    return sig.bytes.every((b, i) => buf[offset + i] === b);
}

/**
 * Returns true when the file's content matches the declared MIME type.
 * Types with no registered signatures (e.g. text/plain) are always accepted.
 */
export async function validateMagicBytes(file: File): Promise<boolean> {
    const sigs = SIGNATURES[file.type];

    // Unknown type — not in our allow-list at all
    if (sigs === undefined) return false;

    // No signature required for this type (e.g. text/plain)
    if (sigs.length === 0) return true;

    // Read only the bytes we need (max offset + max sig length)
    const neededBytes = sigs.reduce((acc, s) => Math.max(acc, (s.offset ?? 0) + s.bytes.length), 0);
    const slice = file.slice(0, neededBytes);
    const buf = new Uint8Array(await slice.arrayBuffer());

    // WEBP needs two separate signatures to both match
    if (file.type === "image/webp") {
        return sigs.every(sig => matchesSignature(buf, sig));
    }

    return sigs.some(sig => matchesSignature(buf, sig));
}
