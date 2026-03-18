import { SchemeOfWorkDetailClient } from "@/components/scheme-of-work/SchemeOfWorkDetailClient";

export const metadata = { title: "Scheme of Work" };

export default function SchemeOfWorkDetailPage({ params }: { params: { id: string } }) {
    return <SchemeOfWorkDetailClient id={params.id} />;
}
