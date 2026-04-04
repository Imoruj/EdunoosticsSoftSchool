import { useState } from "react";

interface RejectSchoolModalProps {
    schoolName: string;
    isBusy: boolean;
    onConfirm: (reason: string) => Promise<void>;
    onClose: () => void;
}

export default function RejectSchoolModal({
    schoolName,
    isBusy,
    onConfirm,
    onClose,
}: RejectSchoolModalProps) {
    const [rejectionReason, setRejectionReason] = useState("");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Reject Registration</h3>
                <p className="text-sm text-gray-500 mb-4">
                    You are rejecting <span className="font-semibold text-gray-700">{schoolName}</span>. Optionally provide a reason that the school admin will see when they attempt to log in.
                </p>
                <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Reason for rejection (optional)"
                    rows={3}
                    className="input w-full resize-none mb-4"
                />
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="btn-secondary px-4 py-2 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(rejectionReason)}
                        disabled={isBusy}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {isBusy ? "Rejecting…" : "Reject Registration"}
                    </button>
                </div>
            </div>
        </div>
    );
}
