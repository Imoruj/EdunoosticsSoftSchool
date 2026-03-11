"use client";

import { useState } from "react";
import Link from "next/link";

export default function FeesPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
                <p className="text-gray-500 mt-1">Track payments, settle tuition, and manage school finances</p>
            </div>

            {/* Premium Placeholder Card */}
            <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-gray-100 p-8 lg:p-12">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-50 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>

                <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-8">
                    {/* Icon Container */}
                    <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl shadow-lg flex items-center justify-center transform rotate-6 hover:rotate-0 transition-transform duration-500">
                        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div className="space-y-4">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-bold tracking-widest uppercase border border-primary-100">
                            Coming Soon
                        </span>
                        <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
                            Elevated Financial <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">Experiences</span>
                        </h2>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            We're crafting a seamless way for you to manage school fees, view payment history, and generate receipts with single-click simplicity.
                        </p>
                    </div>

                    {/* Feature Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        {[
                            { title: "One-Click Payments", desc: "Pay tuition securely via Card or Transfer", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
                            { title: "Payment History", desc: "Track every transaction with live status", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
                            { title: "Instant Receipts", desc: "Download official e-receipts instantly", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                            { title: "Fee Schedules", desc: "Stay informed about upcoming obligations", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                        ].map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-left hover:bg-white hover:shadow-md transition-all duration-300">
                                <div className="p-2.5 bg-white rounded-xl text-primary-600 shadow-sm">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{feature.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 text-primary-600 font-bold hover:text-primary-700 transition-colors group"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
