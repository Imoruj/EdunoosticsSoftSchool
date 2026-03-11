"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SchoolLoginPage() {
    const router = useRouter();
    const { slug } = useParams();
    const [isLoading, setIsLoading] = useState(false);
    const [brandingLoading, setBrandingLoading] = useState(true);
    const [error, setError] = useState("");
    const [branding, setBranding] = useState<any>(null);
    const [loginType, setLoginType] = useState<"admin" | "parent" | "student">("admin");

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const res = await fetch(`/api/schools/by-slug/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setBranding(data);
                } else {
                    setError("School portal not found");
                }
            } catch (err) {
                console.error("Failed to fetch branding:", err);
            } finally {
                setBrandingLoading(false);
            }
        };

        if (slug) {
            fetchBranding();
        }
    }, [slug]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const admission = formData.get("admissionNumber") as string;
        const password = (formData.get("password") || formData.get("pin")) as string;

        const identifier = loginType === "student" ? (admission || "") : (email || "");

        try {
            const result = await signIn("credentials", {
                email: identifier,
                password,
                loginType,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else if (result?.ok) {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    if (brandingLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-pulse text-gray-400">Loading portal...</div>
            </div>
        );
    }

    if (!branding && !brandingLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Portal Not Found</h1>
                <p className="text-gray-600 mb-6 font-primary-600">The school portal you are looking for does not exist.</p>
                <Link href="/" className="text-primary-600 hover:underline">Back to Home</Link>
            </div>
        );
    }

    const primaryColor = branding?.primaryColor || "#16a34a";

    return (
        <div className="min-h-screen flex transition-colors duration-500" style={{ backgroundColor: primaryColor }}>
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white">
                <div>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-white/20">
                            {branding?.logoUrl ? (
                                <img src={branding.logoUrl} alt={branding.name} className="w-full h-full object-contain p-2" />
                            ) : (
                                <span className="text-gray-900 font-bold text-3xl">{branding?.name?.[0]}</span>
                            )}
                        </div>
                        <div>
                            <h1 className="font-bold text-3xl leading-tight">{branding?.name}</h1>
                            {branding?.motto && <p className="text-white/80 italic text-sm mt-1">{branding.motto}</p>}
                        </div>
                    </div>
                </div>

                <div className="max-w-md">
                    <h2 className="text-4xl font-bold mb-6">
                        Portal Login
                    </h2>
                    <p className="text-white/80 text-lg">
                        Welcome to the official {branding?.name} portal.
                        Sign in to manage your academic records, view results, and stay updated.
                    </p>
                </div>

                <div className="text-white/40 text-sm">
                    Powered by Edunostics
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50 relative">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex flex-col items-center mb-8">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm mb-3">
                                {branding?.logoUrl ? (
                                    <img src={branding.logoUrl} alt={branding.name} className="w-full h-full object-contain p-2" />
                                ) : (
                                    <span className="text-gray-900 font-bold text-3xl">{branding?.name?.[0]}</span>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 text-center">{branding?.name}</h2>
                        </div>

                        <h2 className="hidden lg:block text-2xl font-bold text-gray-900 text-center mb-2">
                            Portal Sign In
                        </h2>
                        <p className="text-gray-500 text-center mb-8">
                            Enter your credentials to access the portal
                        </p>

                        {/* Login Type Tabs */}
                        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                            {(["admin", "parent", "student"] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setLoginType(type)}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginType === type
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                                        }`}
                                >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm border border-red-100">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {loginType === "admin" && (
                                <>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            className="input focus:ring-opacity-50"
                                            style={{ '--tw-ring-color': primaryColor } as any}
                                            placeholder="you@school.edu.ng"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                            Password
                                        </label>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            className="input"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </>
                            )}

                            {loginType === "parent" && (
                                <>
                                    <div>
                                        <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700 mb-2">
                                            Parent Email Address
                                        </label>
                                        <input
                                            id="parentEmail"
                                            name="email"
                                            type="email"
                                            required
                                            className="input"
                                            placeholder="parent@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                                            PIN
                                        </label>
                                        <input
                                            id="pin"
                                            name="pin"
                                            type="password"
                                            required
                                            maxLength={6}
                                            className="input"
                                            placeholder="••••••"
                                        />
                                    </div>
                                </>
                            )}

                            {loginType === "student" && (
                                <>
                                    <div>
                                        <label htmlFor="admission" className="block text-sm font-medium text-gray-700 mb-2">
                                            Admission Number
                                        </label>
                                        <input
                                            id="admission"
                                            name="admissionNumber"
                                            type="text"
                                            required
                                            className="input"
                                            placeholder="SCH/2024/001"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="studentPin" className="block text-sm font-medium text-gray-700 mb-2">
                                            PIN
                                        </label>
                                        <input
                                            id="studentPin"
                                            name="pin"
                                            type="password"
                                            required
                                            maxLength={4}
                                            className="input"
                                            placeholder="••••"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300"
                                        style={{ color: primaryColor }}
                                    />
                                    <span className="text-sm text-gray-600">Remember me</span>
                                </label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-sm font-medium hover:opacity-80"
                                    style={{ color: primaryColor }}
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 text-base rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Signing in...
                                    </span>
                                ) : (
                                    "Sign in"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
