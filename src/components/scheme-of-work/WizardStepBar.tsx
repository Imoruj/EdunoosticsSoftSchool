"use client";

import { useRouter } from "next/navigation";

interface Props {
    sowId: string;
    currentStep: 2 | 3 | 4;
    totalWeeks: number;
}

const STEPS = [
    { n: 1, label: "Setup" },
    { n: 2, label: "Add Weeks" },
    { n: 3, label: "Objectives" },
    { n: 4, label: "Resources" },
];

export function WizardStepBar({ sowId, currentStep, totalWeeks }: Props) {
    const router = useRouter();

    const navigate = (step: number) => {
        if (step === 1) {
            router.push(`/dashboard/scheme-of-work/${sowId}`);
        } else {
            router.push(`/dashboard/scheme-of-work/${sowId}?step=${step}`);
        }
    };

    const canAdvance = currentStep === 2 ? totalWeeks > 0 : true;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            {/* Step indicators */}
            <div className="flex items-center justify-between mb-4">
                {STEPS.map((step, i) => {
                    const done = step.n < currentStep || step.n === 1;
                    const active = step.n === currentStep;
                    const accessible = step.n <= currentStep || (step.n === currentStep + 1 && canAdvance);

                    return (
                        <div key={step.n} className="flex items-center flex-1 last:flex-none">
                            <button
                                onClick={() => accessible || done ? navigate(step.n) : undefined}
                                disabled={!accessible && !done}
                                className="flex flex-col items-center gap-1 group disabled:cursor-not-allowed"
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                                    done
                                        ? "bg-green-500 border-green-500 text-white"
                                        : active
                                        ? "bg-primary-600 border-primary-600 text-white"
                                        : "bg-white border-gray-300 text-gray-400"
                                }`}>
                                    {done ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        step.n
                                    )}
                                </div>
                                <span className={`text-xs font-medium hidden sm:block ${
                                    active ? "text-primary-600" : done ? "text-green-600" : "text-gray-400"
                                }`}>
                                    {step.label}
                                </span>
                            </button>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 ${step.n < currentStep ? "bg-green-400" : "bg-gray-200"}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Navigation row */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <button
                    onClick={() => navigate(currentStep - 1)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {currentStep === 2 ? "Back to Overview" : "Previous"}
                </button>

                <span className="text-xs text-gray-400">Step {currentStep} of 4</span>

                {currentStep < 4 ? (
                    <button
                        onClick={() => canAdvance && navigate(currentStep + 1)}
                        disabled={!canAdvance}
                        title={currentStep === 2 && !canAdvance ? "Add at least one week first" : undefined}
                        className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Next: {STEPS[currentStep].label}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                ) : (
                    <button
                        onClick={() => navigate(1)}
                        className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                        Done — View Overview
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
