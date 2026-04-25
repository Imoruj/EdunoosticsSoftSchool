import { SchemeOfWorkDetailClient } from "@/components/scheme-of-work/SchemeOfWorkDetailClient";

export const metadata = { title: "Scheme of Work" };

export default async function SchemeOfWorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <SchemeOfWorkDetailClient id={id} />;
}
