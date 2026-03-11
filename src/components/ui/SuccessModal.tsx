"use client";

import React from "react";

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string | React.ReactNode;
    buttonText?: string;
}

export default function SuccessModal({
    isOpen,
    onClose,
    title,
    message,
    buttonText = "Got it, thanks!"
}: SuccessModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 animate-scaleIn text-center border border-gray-100">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 scale-110">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h3>
                <div className="text-sm text-gray-500 mb-8 font-medium leading-relaxed px-2">
                    {message}
                </div>
                <button
                    onClick={onClose}
                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
}
