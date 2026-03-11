/**
 * CSV injection (formula injection) protection.
 *
 * Spreadsheet applications execute cell values that begin with =, +, -, @, tab,
 * or carriage-return as formulas. This helper wraps every value in double-quotes,
 * escapes internal double-quotes (RFC 4180), and prepends a tab to values that
 * start with a formula-trigger character.
 */

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function sanitizeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '""';
    const str = String(value);
    // Neutralise formula triggers by prepending a tab character
    const safe = FORMULA_PREFIX.test(str) ? `\t${str}` : str;
    // Wrap in double-quotes; escape internal double-quotes per RFC 4180
    return `"${safe.replace(/"/g, '""')}"`;
}
