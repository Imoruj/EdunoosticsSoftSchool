import Link from "next/link";
import { SchoolPortalCell } from "@/components/admin/SchoolPortalCell";

export interface PendingSchool {
    id: string;
    name: string;
    slug: string | null;
    portalUrl: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    createdAt: string;
    registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
    registrationRejectionReason: string | null;
    _count: { students: number; users: number };
}

interface PendingSchoolsListProps {
    pendingSchools: PendingSchool[];
    actioning: string | null;
    approveSchool: (id: string) => Promise<void>;
    openRejectModal: (school: PendingSchool) => void;
}

export default function PendingSchoolsList({
    pendingSchools,
    actioning,
    approveSchool,
    openRejectModal,
}: PendingSchoolsListProps) {
    if (pendingSchools.length === 0) return null;

    return (
        <div className="card overflow-hidden border-2 border-orange-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-orange-100 bg-orange-50">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <h3 className="font-semibold text-gray-900">
                        Pending School Registrations
                    </h3>
                    <span className="ml-1 text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                        {pendingSchools.length}
                    </span>
                </div>
                <Link href="/admin/schools" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
                    View all schools →
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-3">School</th>
                            <th className="px-6 py-3">Portal</th>
                            <th className="px-6 py-3">Contact</th>
                            <th className="px-6 py-3">Location</th>
                            <th className="px-6 py-3">Registered</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-50">
                        {pendingSchools.map((school) => {
                            const busy = actioning === school.id;
                            return (
                                <tr key={school.id} className="bg-orange-50/30 hover:bg-orange-50/60 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
                                                <span className="text-orange-700 font-bold text-sm">
                                                    {school.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{school.name}</p>
                                                <p className="text-xs text-gray-400">{school.id.slice(0, 8)}…</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <SchoolPortalCell slug={school.slug} portalUrl={school.portalUrl} />
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <p>{school.email ?? "—"}</p>
                                        <p className="text-xs text-gray-400">{school.phone ?? ""}</p>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {[school.city, school.state].filter(Boolean).join(", ") || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                        {new Date(school.createdAt).toLocaleDateString("en-NG", {
                                            day: "numeric", month: "short", year: "numeric",
                                        })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => approveSchool(school.id)}
                                                disabled={busy}
                                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-40"
                                            >
                                                {busy ? (
                                                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(school)}
                                                disabled={busy}
                                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 bg-white transition-colors disabled:opacity-40"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
