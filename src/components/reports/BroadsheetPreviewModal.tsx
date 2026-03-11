import React from "react";
import { BroadsheetData } from "./broadsheetTypes";
import BroadsheetPreview from "./previews/BroadsheetPreview";

interface BroadsheetPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: BroadsheetData | null;
}

const BroadsheetPreviewModal: React.FC<BroadsheetPreviewModalProps> = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle" style={{ maxWidth: "95vw", width: "95vw" }}>
                    {/* Toolbar */}
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-between items-center border-b">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Broadsheet Preview &mdash; {data.classArm.className} {data.classArm.armName} &mdash; {data.term.name}
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                ({data.reportType === "halfTerm" ? "Half Term" : "End of Term"})
                            </span>
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 ml-4"
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content - landscape A4 oriented with horizontal scroll */}
                    <div className="bg-gray-100 p-4 sm:p-6 max-h-[85vh] overflow-auto">
                        <div className="bg-white shadow-md mx-auto" style={{ aspectRatio: "297 / 210", maxWidth: "100%" }}>
                            <BroadsheetPreview config={data.config} data={data} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BroadsheetPreviewModal;
