import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes conditionally
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format a date string for display
 */
export function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/**
 * Format a date for input fields (YYYY-MM-DD)
 */
export function formatDateInput(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
}

/**
 * Generate a random PIN for report card access
 */
export function generatePin(length: number = 6): string {
    const chars = "0123456789";
    let pin = "";
    for (let i = 0; i < length; i++) {
        pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Calculate grade based on total score
 */
export function calculateGrade(total: number): { grade: string; remark: string } {
    if (total >= 75) return { grade: "A1", remark: "Excellent" };
    if (total >= 70) return { grade: "B2", remark: "Very Good" };
    if (total >= 65) return { grade: "B3", remark: "Good" };
    if (total >= 60) return { grade: "C4", remark: "Credit" };
    if (total >= 55) return { grade: "C5", remark: "Credit" };
    if (total >= 50) return { grade: "C6", remark: "Credit" };
    if (total >= 45) return { grade: "D7", remark: "Pass" };
    if (total >= 40) return { grade: "E8", remark: "Pass" };
    return { grade: "F9", remark: "Fail" };
}

/**
 * Get grade color class for styling
 */
export function getGradeColorClass(grade: string): string {
    const colorMap: Record<string, string> = {
        A1: "grade-a1",
        B2: "grade-b2",
        B3: "grade-b3",
        C4: "grade-c4",
        C5: "grade-c5",
        C6: "grade-c6",
        D7: "grade-d7",
        E8: "grade-e8",
        F9: "grade-f9",
    };
    return colorMap[grade] || "bg-gray-100 text-gray-800";
}

/**
 * Format currency in Nigerian Naira
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 0,
    }).format(amount);
}

/**
 * Validate Nigerian phone number
 */
export function isValidNigerianPhone(phone: string): boolean {
    const regex = /^(\+234|0)[789][01]\d{8}$/;
    return regex.test(phone.replace(/\s/g, ""));
}

/**
 * Format Nigerian phone number
 */
export function formatNigerianPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("234")) {
        return `+${cleaned}`;
    }
    if (cleaned.startsWith("0")) {
        return `+234${cleaned.slice(1)}`;
    }
    return `+234${cleaned}`;
}

/**
 * Slugify a string
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * Truncate text to a specific length
 */
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.slice(0, length) + "...";
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100 * 10) / 10;
}
