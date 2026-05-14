"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SchoolData {
    schoolName: string;
    schoolAddress: string;
    schoolPhone: string;
}

export default function RegisterPage() {
    const router = useRouter();
    const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [step, setStep] = useState(1);
    const [schoolData, setSchoolData] = useState<SchoolData>({
        schoolName: "",
        schoolAddress: "",
        schoolPhone: "",
    });

    useEffect(() => {
        fetch("/api/auth/register/status")
            .then((r) => r.json())
            .then((d) => setSignupEnabled(d.signupEnabled ?? true))
            .catch(() => setSignupEnabled(true));
    }, []);

    const handleStep1Continue = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const schoolName = formData.get("schoolName") as string;
        if (!schoolName) {
            setError("School name is required");
            return;
        }

        setSchoolData({
            schoolName,
            schoolAddress: formData.get("schoolAddress") as string || "",
            schoolPhone: formData.get("schoolPhone") as string || "",
        });
        setError("");
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    schoolName: schoolData.schoolName,
                    schoolAddress: schoolData.schoolAddress,
                    schoolPhone: schoolData.schoolPhone,
                    adminFirstName: formData.get("firstName"),
                    adminLastName: formData.get("lastName"),
                    adminEmail: formData.get("email"),
                    adminPassword: password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Registration failed");
            }

            // Show pending approval message instead of auto-login
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "flex h-11 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#08070b]/50 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00A99A] focus:border-transparent transition-all";
    const btnClasses = "flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#00A99A] to-[#008f82] hover:from-[#00bdae] hover:to-[#00A99A] shadow-lg shadow-[#00A99A]/20";
    const btnSecondaryClasses = "flex items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:text-white transition-all bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10";

    const leftPanel = (
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 z-10 relative">
            <div>
                <Link href="/" className="flex items-center gap-3 w-fit">
                    <div className="bg-white p-2 rounded-xl shadow-sm flex items-center justify-center shrink-0"><img src="/images/brand/logo-mark.png" alt="" aria-hidden="true" style={{ height: 26, width: "auto" }} /></div>
                    <span className="text-gray-900 dark:text-white font-bold text-2xl font-['Satoshi',sans-serif]">Edunostics</span>
                </Link>
            </div>

            <div className="max-w-md">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6 font-['Satoshi',sans-serif]">Register Your School</h1>
                <p className="text-gray-600 dark:text-white/70 text-lg mb-8 font-['Manrope',sans-serif]">
                    Get started with Edunostics today. Set up your school in minutes and
                    start generating professional report cards.
                </p>
                <ul className="space-y-4 font-['Manrope',sans-serif]">
                    {["Automated report card generation", "Nigerian grading system (A1-F9)", "Parent & student portals", "SMS notifications"].map((item) => (
                        <li key={item} className="flex items-center gap-3 text-gray-700 dark:text-white/80">
                            <svg className="w-6 h-6 text-[#00A99A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="text-gray-500 dark:text-white/50 text-sm font-['Manrope',sans-serif]">
                Already using Edunostics?{" "}
                <Link href="/auth/login" className="text-gray-900 dark:text-white hover:text-[#00A99A] dark:hover:text-[#00A99A] transition-colors">
                    Sign in here
                </Link>
            </div>
        </div>
    );

    // Loading state
    if (signupEnabled === null) {
        return (
            <main className="ed-page min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-gray-200 dark:border-white/30 border-t-[#00A99A] dark:border-t-[#00A99A] rounded-full animate-spin" />
            </main>
        );
    }

    // Signup disabled
    if (!signupEnabled) {
        return (
            <main className="ed-page min-h-screen flex">
                {leftPanel}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10 relative">
                    <div className="w-full max-w-lg">
                        <div className="ed-glass-card rounded-2xl p-8 text-center shadow-2xl">
                            <div className="lg:hidden flex justify-center mb-8">
                                <Link href="/" className="flex items-center gap-3">
                                    <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center shrink-0"><img src="/images/brand/logo-mark.png" alt="" aria-hidden="true" style={{ height: 22, width: "auto" }} /></div>
                                    <span className="text-gray-900 dark:text-white font-bold text-xl font-['Satoshi',sans-serif]">Edunostics</span>
                                </Link>
                            </div>
                            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-orange-500 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-['Satoshi',sans-serif]">Registration Closed</h2>
                            <p className="text-gray-500 dark:text-white/60 mb-6 font-['Manrope',sans-serif]">
                                New school registrations are currently not being accepted. Please contact the platform administrator for assistance.
                            </p>
                            <Link href="/auth/login" className={btnClasses + " inline-block"}>
                                Go to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // Submission success — pending approval
    if (submitted) {
        return (
            <main className="ed-page min-h-screen flex">
                {leftPanel}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10 relative">
                    <div className="w-full max-w-lg">
                        <div className="ed-glass-card rounded-2xl p-8 text-center shadow-2xl">
                            <div className="lg:hidden flex justify-center mb-8">
                                <Link href="/" className="flex items-center gap-3">
                                    <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center shrink-0"><img src="/images/brand/logo-mark.png" alt="" aria-hidden="true" style={{ height: 22, width: "auto" }} /></div>
                                    <span className="text-gray-900 dark:text-white font-bold text-xl font-['Satoshi',sans-serif]">Edunostics</span>
                                </Link>
                            </div>
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-[#00A99A]/10 border border-emerald-200 dark:border-[#00A99A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-[#00A99A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-['Satoshi',sans-serif]">Registration Submitted!</h2>
                            <p className="text-gray-600 dark:text-white/60 mb-2 font-['Manrope',sans-serif]">
                                <span className="font-semibold text-gray-900 dark:text-white/90">{schoolData.schoolName}</span> has been registered successfully.
                            </p>
                            <p className="text-gray-500 dark:text-white/60 mb-6 font-['Manrope',sans-serif]">
                                Your registration is <span className="font-semibold text-[#00A99A]">pending approval</span> by the platform administrator. You will be notified once your account is activated.
                            </p>
                            <Link href="/auth/login" className={btnClasses + " inline-block"}>
                                Go to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="ed-page min-h-screen flex">
            {leftPanel}

            {/* Right Panel - Registration Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto z-10 relative">
                <div className="w-full max-w-lg">
                    <div className="ed-glass-card rounded-2xl p-8 shadow-2xl">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-8">
                            <Link href="/" className="flex items-center gap-3">
                                <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center shrink-0"><img src="/images/brand/logo-mark.png" alt="" aria-hidden="true" style={{ height: 22, width: "auto" }} /></div>
                                <span className="text-gray-900 dark:text-white font-bold text-xl font-['Satoshi',sans-serif]">Edunostics</span>
                            </Link>
                        </div>

                        {/* Progress Steps */}
                        <div className="flex items-center justify-center gap-2 mb-8">
                            <div className={`w-3 h-3 rounded-full ${step >= 1 ? "bg-[#00A99A] shadow-[0_0_8px_rgba(0,169,154,0.5)]" : "bg-gray-200 dark:bg-white/10"}`} />
                            <div className={`w-12 h-1 rounded-full ${step >= 2 ? "bg-[#00A99A] shadow-[0_0_8px_rgba(0,169,154,0.5)]" : "bg-gray-200 dark:bg-white/10"}`} />
                            <div className={`w-3 h-3 rounded-full ${step >= 2 ? "bg-[#00A99A] shadow-[0_0_8px_rgba(0,169,154,0.5)]" : "bg-gray-200 dark:bg-white/10"}`} />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2 font-['Satoshi',sans-serif]">
                            {step === 1 ? "School Information" : "Admin Account"}
                        </h2>
                        <p className="text-gray-500 dark:text-white/60 text-center mb-8 font-['Manrope',sans-serif]">
                            {step === 1
                                ? "Tell us about your school"
                                : "Create your administrator account"}
                        </p>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm font-['Manrope',sans-serif]">
                                {error}
                            </div>
                        )}

                        {step === 1 && (
                            <form onSubmit={handleStep1Continue} className="space-y-5 font-['Manrope',sans-serif]">
                                <div>
                                    <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                        School Name *
                                    </label>
                                    <input
                                        id="schoolName"
                                        name="schoolName"
                                        type="text"
                                        required
                                        className={inputClasses}
                                        placeholder="Victory Academy"
                                        defaultValue={schoolData.schoolName}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="schoolAddress" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                        Address
                                    </label>
                                    <input
                                        id="schoolAddress"
                                        name="schoolAddress"
                                        type="text"
                                        className={inputClasses}
                                        placeholder="123 Education Road, Lekki"
                                        defaultValue={schoolData.schoolAddress}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                            City
                                        </label>
                                        <input
                                            id="city"
                                            name="city"
                                            type="text"
                                            className={inputClasses}
                                            placeholder="Lagos"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                            State
                                        </label>
                                        <select id="state" name="state" className={inputClasses + " dark:[&>option]:bg-[#13111a] dark:[&>option]:text-white"}>
                                            <option value="">Select state</option>
                                            <option value="Lagos">Lagos</option>
                                            <option value="Abuja">Abuja (FCT)</option>
                                            <option value="Rivers">Rivers</option>
                                            <option value="Kano">Kano</option>
                                            <option value="Oyo">Oyo</option>
                                            <option value="Kaduna">Kaduna</option>
                                            <option value="Enugu">Enugu</option>
                                            <option value="Delta">Delta</option>
                                            <option value="Anambra">Anambra</option>
                                            <option value="Ogun">Ogun</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="schoolPhone" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                        School Phone
                                    </label>
                                    <input
                                        id="schoolPhone"
                                        name="schoolPhone"
                                        type="tel"
                                        className={inputClasses}
                                        placeholder="08012345678"
                                        defaultValue={schoolData.schoolPhone}
                                    />
                                </div>

                                <button type="submit" className={btnClasses}>
                                    Continue
                                </button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleSubmit} className="space-y-5 font-['Manrope',sans-serif]">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                            First Name *
                                        </label>
                                        <input
                                            id="firstName"
                                            name="firstName"
                                            type="text"
                                            required
                                            className={inputClasses}
                                            placeholder="John"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                            Last Name *
                                        </label>
                                        <input
                                            id="lastName"
                                            name="lastName"
                                            type="text"
                                            required
                                            className={inputClasses}
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        className={inputClasses}
                                        placeholder="admin@victoryacademy.edu.ng"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                        Phone Number *
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        required
                                        className={inputClasses}
                                        placeholder="08012345678"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                        Password *
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        minLength={8}
                                        className={inputClasses}
                                        placeholder="Min. 8 characters"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                        Confirm Password *
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        className={inputClasses}
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="flex items-start gap-2">
                                    <input
                                        id="terms"
                                        type="checkbox"
                                        required
                                        className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-[#00A99A] focus:ring-[#00A99A] focus:ring-offset-0 transition-colors"
                                    />
                                    <label htmlFor="terms" className="text-sm text-gray-600 dark:text-white/60">
                                        I agree to the{" "}
                                        <Link href="/terms" className="text-[#00A99A] hover:text-[#00bdae] transition-colors">
                                            Terms of Service
                                        </Link>{" "}
                                        and{" "}
                                        <Link href="/privacy" className="text-[#00A99A] hover:text-[#00bdae] transition-colors">
                                            Privacy Policy
                                        </Link>
                                    </label>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className={btnSecondaryClasses + " flex-1"}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={btnClasses + " flex-1"}
                                    >
                                        {isLoading ? "Submitting..." : "Submit Registration"}
                                    </button>
                                </div>
                            </form>
                        )}

                        <p className="text-center text-gray-500 dark:text-white/60 text-sm mt-8 lg:hidden font-['Manrope',sans-serif]">
                            Already have an account?{" "}
                            <Link href="/auth/login" className="text-[#00A99A] hover:text-[#00bdae] font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
