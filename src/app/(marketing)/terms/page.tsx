const teal = "#00A99A";
const wrap = { width: "min(860px, calc(100% - 40px))", margin: "0 auto" } as const;

const sections = [
    {
        title: "1. Acceptance of terms",
        body: `By registering a school on the Edunostics platform, you agree to be bound by these Terms of Service. If you register on behalf of a school or organisation, you represent that you have the authority to bind that entity to these terms.\n\nThese terms apply to all users of Edunostics including administrators, teachers, parents, and students, though certain provisions apply only to the school administrator who holds the primary account.`,
    },
    {
        title: "2. Description of service",
        body: `Edunostics provides a cloud-based school management platform offering features including assessment tracking, report card generation, attendance recording, parent communication, and school analytics. The platform is provided on a subscription basis and is designed for use by accredited secondary schools.\n\nWe reserve the right to modify, suspend, or discontinue any feature of the service at any time, with reasonable advance notice provided to active subscribers.`,
    },
    {
        title: "3. Account registration and security",
        body: `You must provide accurate and complete information when registering your school. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.\n\nYou must notify us immediately at support@edunostics.com if you become aware of any unauthorised access to your account. We are not liable for losses arising from compromised credentials where you failed to notify us promptly.`,
    },
    {
        title: "4. Subscription and payment",
        body: `Access to Edunostics is provided on a subscription basis with fees as described at the time of purchase. Subscriptions are billed per term or per academic session as selected at signup. All fees are non-refundable except as required by applicable law.\n\nFailure to pay subscription fees within 14 days of the due date may result in suspension of access. We will provide at least 7 days notice before any suspension.`,
    },
    {
        title: "5. School data and student records",
        body: `You retain full ownership of all data you upload to Edunostics, including student academic records. You grant Edunostics a limited licence to store, process, and display this data solely for the purpose of delivering the platform services.\n\nYou are responsible for ensuring that you have the necessary consents and legal basis to upload student data to Edunostics, and that doing so complies with applicable laws in your jurisdiction.`,
    },
    {
        title: "6. Acceptable use",
        body: `You agree not to use Edunostics to upload unlawful content, attempt to gain unauthorised access to other schools data, use the platform to harass, abuse, or harm students or staff, engage in automated scraping or data extraction, or circumvent access controls or security measures.\n\nViolation of these terms may result in immediate account suspension without refund.`,
    },
    {
        title: "7. Intellectual property",
        body: `The Edunostics platform, including its design, code, branding, and documentation, is the exclusive intellectual property of Edunostics. Nothing in these terms grants you ownership of any platform components.\n\nYou may not reproduce, copy, sell, resell, or exploit any portion of the service without our express written permission.`,
    },
    {
        title: "8. Limitation of liability",
        body: `To the maximum extent permitted by applicable law, Edunostics shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including loss of data, loss of revenue, or interruption of school operations.\n\nOur total liability to any school for any claim shall not exceed the total fees paid by that school in the three months preceding the claim.`,
    },
    {
        title: "9. Termination",
        body: `Either party may terminate the subscription at the end of a billing period with written notice. Edunostics may terminate immediately for material breach of these terms. Upon termination, you may export your data within the period described in our Privacy Policy. After that period, data will be permanently deleted.`,
    },
    {
        title: "10. Governing law",
        body: `These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved first through good-faith negotiation, and thereafter through arbitration in Lagos, Nigeria under the rules of the Lagos Court of Arbitration.`,
    },
    {
        title: "11. Changes to terms",
        body: `We may update these Terms of Service from time to time. Material changes will be communicated to school administrators by email at least 14 days before they take effect. Continued use of Edunostics after the effective date constitutes acceptance of the revised terms.`,
    },
    {
        title: "12. Contact",
        body: `For questions about these terms, contact us at legal@edunostics.com.`,
    },
];

export default function TermsPage() {
    return (
        <div>
            <section style={{ ...wrap, padding: "90px 0 60px" }}>
                <p style={{ color: teal, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", margin: "0 0 20px" }}>Legal</p>
                <h1 style={{ fontFamily: "'Satoshi','Inter',system-ui,sans-serif", fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-.02em", margin: "0 0 20px", color: "var(--foreground)" }}>
                    Terms of Service
                </h1>
                <p style={{ fontSize: ".9rem", color: "var(--muted-foreground)", margin: 0, lineHeight: 1.75 }}>
                    Last updated: 1 January 2026. These terms govern your use of the Edunostics platform. Please read them carefully before registering your school.
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
