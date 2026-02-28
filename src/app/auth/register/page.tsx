"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

interface SchoolData {
    schoolName: string;
    schoolAddress: string;
    schoolPhone: string;
}

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [step, setStep] = useState(1);
    const [schoolData, setSchoolData] = useState<SchoolData>({
        schoolName: "",
        schoolAddress: "",
        schoolPhone: "",
    });

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

            // Auto-login after successful registration
            const loginResult = await signIn("credentials", {
                email: formData.get("email"),
                password: password,
                redirect: false,
            });

            if (loginResult?.ok) {
                router.push("/dashboard");
                router.refresh();
            } else {
                // Registration succeeded but login failed - redirect to login page
                router.push("/auth/login");
            }
        } catch (err: any) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
                <div>
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                            <span className="text-primary-600 font-bold text-2xl">E</span>
                        </div>
                        <span className="text-white font-semibold text-2xl">EduCare</span>
                    </Link>
                </div>

                <div className="max-w-md">
                    <h1 className="text-4xl font-bold text-white mb-6">
                        Register Your School
                    </h1>
                    <p className="text-white/70 text-lg mb-8">
                        Get started with EduCare today. Set up your school in minutes and
                        start generating professional report cards.
                    </p>

                    {/* Benefits List */}
                    <ul className="space-y-4">
                        <li className="flex items-center gap-3 text-white/80">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Automated report card generation
                        </li>
                        <li className="flex items-center gap-3 text-white/80">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Nigerian grading system (A1-F9)
                        </li>
                        <li className="flex items-center gap-3 text-white/80">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Parent & student portals
                        </li>
                        <li className="flex items-center gap-3 text-white/80">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            SMS notifications
                        </li>
                    </ul>
                </div>

                <div className="text-white/50 text-sm">
                    Already using EduCare?{" "}
                    <Link href="/auth/login" className="text-white hover:underline">
                        Sign in here
                    </Link>
                </div>
            </div>

            {/* Right Panel - Registration Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
                <div className="w-full max-w-lg">
                    <div className="bg-white rounded-2xl shadow-2xl p-8">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-8">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">E</span>
                                </div>
                                <span className="text-gray-900 font-semibold text-xl">EduCare</span>
                            </Link>
                        </div>

                        {/* Progress Steps */}
                        <div className="flex items-center justify-center gap-2 mb-8">
                            <div className={`w-3 h-3 rounded-full ${step >= 1 ? "bg-primary-600" : "bg-gray-200"}`} />
                            <div className={`w-12 h-1 ${step >= 2 ? "bg-primary-600" : "bg-gray-200"}`} />
                            <div className={`w-3 h-3 rounded-full ${step >= 2 ? "bg-primary-600" : "bg-gray-200"}`} />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                            {step === 1 ? "School Information" : "Admin Account"}
                        </h2>
                        <p className="text-gray-500 text-center mb-8">
                            {step === 1
                                ? "Tell us about your school"
                                : "Create your administrator account"}
                        </p>

                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
                                {error}
                            </div>
                        )}

                        {step === 1 && (
                            <form onSubmit={handleStep1Continue} className="space-y-5">
                                <div>
                                    <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-2">
                                        School Name *
                                    </label>
                                    <input
                                        id="schoolName"
                                        name="schoolName"
                                        type="text"
                                        required
                                        className="input"
                                        placeholder="Victory Academy"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="schoolAddress" className="block text-sm font-medium text-gray-700 mb-2">
                                        Address
                                    </label>
                                    <input
                                        id="schoolAddress"
                                        name="schoolAddress"
                                        type="text"
                                        className="input"
                                        placeholder="123 Education Road, Lekki"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                                            City
                                        </label>
                                        <input
                                            id="city"
                                            name="city"
                                            type="text"
                                            className="input"
                                            placeholder="Lagos"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                                            State
                                        </label>
                                        <select id="state" name="state" className="input">
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
                                            {/* Add more states */}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="schoolPhone" className="block text-sm font-medium text-gray-700 mb-2">
                                        School Phone
                                    </label>
                                    <input
                                        id="schoolPhone"
                                        name="schoolPhone"
                                        type="tel"
                                        className="input"
                                        placeholder="08012345678"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary w-full py-3 text-base"
                                >
                                    Continue
                                </button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                                            First Name *
                                        </label>
                                        <input
                                            id="firstName"
                                            name="firstName"
                                            type="text"
                                            required
                                            className="input"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                                            Last Name *
                                        </label>
                                        <input
                                            id="lastName"
                                            name="lastName"
                                            type="text"
                                            required
                                            className="input"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        className="input"
                                        placeholder="admin@victoryacademy.edu.ng"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number *
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        required
                                        className="input"
                                        placeholder="08012345678"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                        Password *
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        minLength={8}
                                        className="input"
                                        placeholder="Min. 8 characters"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm Password *
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        className="input"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="flex items-start gap-2">
                                    <input
                                        id="terms"
                                        type="checkbox"
                                        required
                                        className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <label htmlFor="terms" className="text-sm text-gray-600">
                                        I agree to the{" "}
                                        <Link href="/terms" className="text-primary-600 hover:underline">
                                            Terms of Service
                                        </Link>{" "}
                                        and{" "}
                                        <Link href="/privacy" className="text-primary-600 hover:underline">
                                            Privacy Policy
                                        </Link>
                                    </label>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="btn-secondary flex-1 py-3"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="btn-primary flex-1 py-3"
                                    >
                                        {isLoading ? "Creating..." : "Create Account"}
                                    </button>
                                </div>
                            </form>
                        )}

                        <p className="text-center text-gray-500 text-sm mt-8 lg:hidden">
                            Already have an account?{" "}
                            <Link
                                href="/auth/login"
                                className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
