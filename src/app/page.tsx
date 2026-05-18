import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
    title: "Edunostics — School Technology Platform for Nigerian Secondary Schools",
    description: "Edunostics connects assessment software, academic records, attendance, smart hardware, and parent communication into one trusted operating system for Nigerian secondary schools.",
    alternates: { canonical: "https://www.edunostics.com" },
    openGraph: {
        url: "https://www.edunostics.com",
        title: "Edunostics — School Technology Platform for Nigerian Secondary Schools",
        description: "Assessment, records, attendance, and parent communication — one operating system for secondary schools in Nigeria.",
    },
};

const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Edunostics Limited",
    url: "https://www.edunostics.com",
    logo: "https://www.edunostics.com/images/brand/logo-mark.png",
    description: "Educational hardware and software technology for Nigerian secondary schools.",
    foundingLocation: { "@type": "Place", addressCountry: "NG" },
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: "https://www.edunostics.com/contact" },
    sameAs: [],
};

const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Edunostics",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, iOS, Android",
    url: "https://www.edunostics.com",
    description: "School management platform for Nigerian secondary schools covering assessment, report cards, attendance, conduct, and parent communication.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN", description: "Contact for pricing" },
    featureList: [
        "Student assessment and score entry",
        "Automated report card generation",
        "Attendance tracking",
        "Affective and psychomotor skill assessment",
        "Parent communication portal",
        "Academic broadsheet generation",
        "Role-based staff access control",
        "Multi-branch school support",
    ],
    audience: { "@type": "EducationalAudience", educationalRole: "administrator" },
};

const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Edunostics",
    url: "https://www.edunostics.com",
    potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: "https://www.edunostics.com/documentation?q={search_term_string}" },
        "query-input": "required name=search_term_string",
    },
};

export default function Home() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />
            <LandingPage />
        </>
    );
}
