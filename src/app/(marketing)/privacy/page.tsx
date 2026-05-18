import type { Metadata } from "next";

const teal = "#00A99A";
const wrap = { width: "min(860px, calc(100% - 40px))", margin: "0 auto" } as const;

const sections = [
    {
        title: "1. Information we collect",
        body: `We collect information you provide directly when registering a school, adding staff, or entering student records. This includes school name and contact details, administrator and teacher names and email addresses, student names, class assignments, academic scores, attendance records, and conduct notes.\n\nWe also collect usage data automatically such as pages visited, features used, and device type, to improve the platform and diagnose issues.`,
    },
    {
        title: "2. How we use your information",
        body: `We use the information we collect to operate and improve the Edunostics platform, generate report cards and academic records, send transactional communications such as report card notifications, provide customer support, detect and prevent fraudulent or unauthorised use, and comply with our legal obligations.\n\nWe do not use student data for advertising purposes. We do not sell or rent any personal data to third parties.`,
    },
    {
        title: "3. Data sharing",
        body: `We share data only as required to deliver our services. This includes cloud infrastructure providers who host Edunostics under strict data processing agreements, email service providers for transactional messages, and payment processors for subscription billing.\n\nAll third-party providers are contractually required to handle data with the same level of care we apply. We do not share student data with any party for marketing, analytics resale, or research without explicit written consent from the school.`,
    },
    {
        title: "4. Data security",
        body: `All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Access to production data is restricted to authorised Edunostics personnel who require it for their work. All such access is logged and audited.\n\nWe perform automated daily backups and maintain a documented incident response plan. In the event of a data breach, we will notify affected schools within 72 hours of confirming the incident.`,
    },
    {
        title: "5. Data retention",
        body: `We retain school and student data for the duration of an active subscription plus 12 months after cancellation. During this period, schools may export their complete data at any time. After 12 months following subscription termination, data is permanently deleted from all systems.\n\nSchools may request earlier deletion at any time by contacting us in writing.`,
    },
    {
        title: "6. Your rights",
        body: `As a school administrator, you have the right to access all data held about your school and its students, correct any inaccurate records, request deletion of data subject to our retention policy, export data in machine-readable format, and withdraw consent for data processing which will result in service termination.\n\nTo exercise any of these rights, contact us at privacy@edunostics.com.`,
    },
    {
        title: "7. Cookies",
        body: `Edunostics uses session cookies strictly necessary for authentication and platform functionality. We do not use third-party tracking cookies, advertising cookies, or analytics cookies that report to external services.\n\nYou can disable cookies in your browser settings, though this will prevent you from logging in to the platform.`,
    },
    {
        title: "8. Changes to this policy",
        body: `We may update this Privacy Policy from time to time. When we make material changes, we will notify school administrators by email at least 14 days before the changes take effect. Continued use of Edunostics after that date constitutes acceptance of the updated policy.`,
    },
    {
        title: "9. Contact",
        body: `For questions, concerns, or to exercise your data rights, contact our privacy team at privacy@edunostics.com. We aim to respond to all privacy requests within 5 business days.`,
    },
];

export const metadata: Metadata = {
    title: "Privacy Policy — Edunostics",
    description: "Read the Edunostics privacy policy to understand how we collect, use, and protect your school's data in compliance with Nigerian data protection regulations.",
    alternates: { canonical: "https://www.edunostics.com/privacy" },
    openGraph: { url: "https://www.edunostics.com/privacy", title: "Privacy Policy | Edunostics", description: "How we collect, use, and protect your school's data." },
};

export default function PrivacyPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 60px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Legal</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-.02em", margin: "0 0 20px", color: "var(--foreground)" }}>
                    Privacy Policy
                </h1>
                <p style={{ fontSize: ".9rem", color: "var(--muted-foreground)", margin: 0, lineHeight: 1.75 }}>
                    Last updated: 1 January 2026. This policy explains how Edunostics collects, uses, and protects information about schools, staff, and students.
                </p>
            </section>

            <section style={{ ...wrap, padding: "0 0 96px", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 48, paddingTop: 56 }}>
                    {sections.map(({ title, body }) => (
                        <div key={title} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 48 }}>
                            <h2 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 16px", color: "var(--foreground)" }}>{title}</h2>
                            {body.split("\n\n").map((para, i) => (
                                <p key={i} style={{ fontSize: ".9rem", color: "var(--muted-foreground)", lineHeight: 1.85, margin: i > 0 ? "16px 0 0" : 0 }}>{para}</p>
                            ))}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
