import { sanitizeCsv } from "@/lib/csvUtils";

export interface LoginCredentialRow {
    name: string;
    loginIdentifier: string;
    context: string;
    accountStatus: string;
    temporaryPassword?: string;
}

export interface LoginCredentialExportPayload {
    title: string;
    schoolName: string;
    portalUrl: string;
    loginInstructions: string;
    loginIdentifierLabel: string;
    contextLabel: string;
    temporaryPasswordLabel?: string;
    rows: LoginCredentialRow[];
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function downloadLoginCredentialsCsv(payload: LoginCredentialExportPayload, filename: string) {
    const includeTemporaryPasswords = payload.rows.some((row) => Boolean(row.temporaryPassword));
    const headers = [
        "Name",
        payload.contextLabel,
        payload.loginIdentifierLabel,
        ...(includeTemporaryPasswords ? [payload.temporaryPasswordLabel || "Temporary Password"] : []),
        "Portal URL",
        "Login Instructions",
        "Account Status",
    ];

    const rows = payload.rows.map((row) => [
        sanitizeCsv(row.name),
        sanitizeCsv(row.context),
        sanitizeCsv(row.loginIdentifier),
        ...(includeTemporaryPasswords ? [sanitizeCsv(row.temporaryPassword || "")] : []),
        sanitizeCsv(payload.portalUrl),
        sanitizeCsv(payload.loginInstructions),
        sanitizeCsv(row.accountStatus),
    ]);

    const csvContent = [
        headers.map((header) => sanitizeCsv(header)).join(","),
        ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff", csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function printLoginCredentials(payload: LoginCredentialExportPayload) {
    const win = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
    if (!win) {
        throw new Error("Popup blocked. Please allow popups to print the credential sheet.");
    }

    const includeTemporaryPasswords = payload.rows.some((row) => Boolean(row.temporaryPassword));
    const generatedAt = new Date().toLocaleString();
    const rowsHtml = payload.rows.map((row, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.context)}</td>
            <td>${escapeHtml(row.loginIdentifier)}</td>
            ${includeTemporaryPasswords ? `<td>${escapeHtml(row.temporaryPassword || "")}</td>` : ""}
            <td>${escapeHtml(payload.portalUrl)}</td>
            <td>${escapeHtml(row.accountStatus)}</td>
        </tr>
    `).join("");

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(payload.title)}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
        .header { margin-bottom: 18px; }
        .title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
        .meta { font-size: 13px; color: #4b5563; margin: 2px 0; }
        .note { margin-top: 12px; padding: 12px; background: #f3f4f6; border-radius: 8px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        th, td { border: 1px solid #d1d5db; padding: 10px 8px; text-align: left; font-size: 12px; vertical-align: top; }
        th { background: #f9fafb; font-weight: 700; }
        @media print {
            body { margin: 10mm; }
            .note { break-inside: avoid; }
            table { break-inside: auto; }
            tr { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <p class="title">${escapeHtml(payload.title)}</p>
        <p class="meta"><strong>School:</strong> ${escapeHtml(payload.schoolName)}</p>
        <p class="meta"><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p>
    </div>
    <div class="note">
        <div><strong>Portal URL:</strong> ${escapeHtml(payload.portalUrl)}</div>
        <div><strong>Login:</strong> ${escapeHtml(payload.loginInstructions)}</div>
        <div><strong>Password:</strong> ${includeTemporaryPasswords ? "Temporary passwords are included below. Students should change them after first login." : "Excluded by design."}</div>
    </div>
    <table>
        <thead>
            <tr>
                <th>S/N</th>
                <th>Name</th>
                <th>${escapeHtml(payload.contextLabel)}</th>
                <th>${escapeHtml(payload.loginIdentifierLabel)}</th>
                ${includeTemporaryPasswords ? `<th>${escapeHtml(payload.temporaryPasswordLabel || "Temporary Password")}</th>` : ""}
                <th>Portal URL</th>
                <th>Account Status</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml}
        </tbody>
    </table>
    <script>
        window.onload = function () {
            window.print();
        };
    </script>
</body>
</html>`);
    win.document.close();
}
