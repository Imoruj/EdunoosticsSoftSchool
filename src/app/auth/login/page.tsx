"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

function getSuggestedLoginTypeFromError(errorMessage: string) {
    if (errorMessage.includes("Student tab")) {
        return "student" as const;
    }

    if (errorMessage.includes("Parent tab")) {
        return "parent" as const;
    }

    if (errorMessage.includes("Admin/Teacher tab")) {
        return "admin" as const;
    }

    return null;
}

function normalizeAuthError(errorMessage: string) {
    const trimmed = errorMessage.trim();
    if (!trimmed) return "Sign in failed.";
    if (trimmed === "CredentialsSignin") return "Invalid credentials.";
    if (trimmed.includes("Callback for provider type credentials not supported")) {
        return "Sign in request was blocked. Refresh the page and try again.";
    }
    if (trimmed === "Configuration") return "Authentication is not configured correctly.";
    return trimmed;
}

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [loginType, setLoginType] = useState<"admin" | "parent" | "student">("admin");
    const [showPassword, setShowPassword] = useState(false);

    const handleLoginTypeChange = (type: "admin" | "parent" | "student") => {
        setLoginType(type);
        setError("");
        setShowPassword(false);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const admission = formData.get("admissionNumber") as string;
        const password = (formData.get("password") || formData.get("pin")) as string;

        const identifier =
            loginType === "student"
                ? (email || admission || "")
                : (email || "");

        try {
            const result = await signIn("credentials", {
                email: identifier,
                password,
                loginType,
                redirect: false,
            });

            if (result?.error) {
                setError(normalizeAuthError(result.error));
                const suggestedLoginType = getSuggestedLoginTypeFromError(result.error);
                if (suggestedLoginType && suggestedLoginType !== loginType) {
                    setLoginType(suggestedLoginType);
                }
            } else if (result?.ok) {
                // Fetch session to route super admin to /admin, others to /dashboard
                const sessionRes = await fetch("/api/auth/session");
                const session = await sessionRes.json();
                const roles: string[] = session?.user?.roles || [];
                const dest = roles.includes("SUPER_ADMIN") ? "/admin" : "/dashboard";
                router.push(dest);
                router.refresh();
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "flex h-11 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#08070b]/50 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00A99A] focus:border-transparent transition-all";
    const btnClasses = "flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#00A99A] to-[#008f82] hover:from-[#00bdae] hover:to-[#00A99A] shadow-lg shadow-[#00A99A]/20";

    return (
        <main className="ed-page min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 z-10 relative overflow-hidden bg-gradient-to-br from-[#00A99A] via-[#009487] to-[#005f57]">
                {/* Decorative background shapes */}
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute top-1/2 -left-20 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute -bottom-16 right-1/4 w-72 h-72 rounded-full bg-black/10 pointer-events-none" />

                <div>
                    <Link href="/" className="flex items-center gap-3 w-fit">
                        <div className="bg-white/90 p-2 rounded-xl shadow-sm flex items-center justify-center shrink-0"><img src="/images/brand/logo-mark.png" alt="" aria-hidden="true" style={{ height: 26, width: "auto" }} /></div>
                        <span className="text-white font-bold text-2xl font-['Satoshi',sans-serif]">Edunostics</span>
                    </Link>
                </div>

                <div className="max-w-md">
                    <h1 className="text-4xl font-bold text-white mb-6 font-['Satoshi',sans-serif]">
                        Welcome back!
                    </h1>
                    <p className="text-white/80 text-lg font-['Manrope',sans-serif]">
                        Sign in to access your school&apos;s report card management system.
                        Generate and manage student academic records with ease.
                    </p>
                </div>

                <div className="flex items-center gap-6 font-['Manrope',sans-serif]">
                    <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/40"></div>
                        <div className="w-10 h-10 rounded-full bg-white/25 border-2 border-white/40"></div>
                        <div className="w-10 h-10 rounded-full bg-white/30 border-2 border-white/40"></div>
                        <div className="w-10 h-10 rounded-full bg-white/35 border-2 border-white/40"></div>
                    </div>
                    <p className="text-white/70 text-sm">
                        Trusted by 500+ schools across Nigeria
                    </p>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10 relative">
                <div className="w-full max-w-md">
                    <div className="ed-glass-card rounded-2xl p-8 shadow-2xl">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-8">
                            <Link href="/" className="flex items-center gap-3">
                                <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center shrink-0"><img src="/images/brand/logo-mark.png" alt="" aria-hidden="true" style={{ height: 22, width: "auto" }} /></div>
                                <span className="text-gray-900 dark:text-white font-bold text-xl font-['Satoshi',sans-serif]">Edunostics</span>
                            </Link>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2 font-['Satoshi',sans-serif]">
                            Sign in to your account
                        </h2>
                        <p className="text-gray-500 dark:text-white/60 text-center mb-8 font-['Manrope',sans-serif]">
                            Enter your credentials to access the dashboard
                        </p>

                        {/* Login Type Tabs */}
                        <div className="flex bg-gray-100 dark:bg-[#08070b]/60 border border-gray-200 dark:border-white/5 rounded-lg p-1 mb-2 font-['Manrope',sans-serif]">
                            <button
                                onClick={() => handleLoginTypeChange("admin")}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === "admin"
                                    ? "bg-[#00A99A] text-white shadow"
                                    : "text-gray-500 hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
                                    }`}
                            >
                                Admin/Teacher
                            </button>
                            <button
                                onClick={() => handleLoginTypeChange("parent")}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === "parent"
                                    ? "bg-[#00A99A] text-white shadow"
                                    : "text-gray-500 hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
                                    }`}
                            >
                                Parent
                            </button>
                            <button
                                onClick={() => handleLoginTypeChange("student")}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === "student"
                                    ? "bg-[#00A99A] text-white shadow"
                                    : "text-gray-500 hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
                                    }`}
                            >
                                Student
                            </button>
                        </div>

                        <p className="mb-6 rounded-lg border border-[#00A99A]/20 bg-[#00A99A]/10 px-4 py-3 text-xs text-[#00A99A] font-['Manrope',sans-serif]">
                            Choose the tab that matches the account you are signing into. Student and parent accounts are blocked from the Admin/Teacher tab.
                        </p>

                        {/* Super Admin hint — shown on Admin/Teacher tab */}
                        {loginType === "admin" && (
                            <p className="text-xs text-center text-gray-400 dark:text-white/40 mb-6 font-['Manrope',sans-serif]">
                                Platform super admin? Use this tab with your super admin email.
                            </p>
                        )}
                        {loginType !== "admin" && <div className="mb-6" />}

                        {error && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm font-['Manrope',sans-serif]">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} method="post" className="space-y-5 font-['Manrope',sans-serif]" suppressHydrationWarning>
                            {loginType === "admin" && (
                                <>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="username"
                                            suppressHydrationWarning
                                            className={inputClasses}
                                            placeholder="you@school.edu.ng"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                required
                                                autoComplete="current-password"
                                                suppressHydrationWarning
                                                className={inputClasses}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((value) => !value)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/80"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {loginType === "parent" && (
                                <>
                                    <div>
                                        <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                            Parent Email Address
                                        </label>
                                        <input
                                            id="parentEmail"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="username"
                                            suppressHydrationWarning
                                            className={inputClasses}
                                            placeholder="parent@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="pin" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                            PIN
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="pin"
                                                name="pin"
                                                type={showPassword ? "text" : "password"}
                                                required
                                                maxLength={6}
                                                autoComplete="current-password"
                                                suppressHydrationWarning
                                                className={inputClasses}
                                                placeholder="••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((value) => !value)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/80"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {loginType === "student" && (
                                <>
                                    <div>
                                        <label htmlFor="studentEmail" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                            Student Email or Admission Number
                                        </label>
                                        <input
                                            id="studentEmail"
                                            name="email"
                                            type="text"
                                            required
                                            autoComplete="username"
                                            suppressHydrationWarning
                                            className={inputClasses}
                                            placeholder="firstname.lastname@school.com or SCH/2026/0001"
                                        />
                                        <p className="mt-1 text-xs text-gray-400 dark:text-white/40">
                                            Your school decides which student login method is allowed.
                                        </p>
                                    </div>
                                    <div>
                                        <label htmlFor="studentPin" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="studentPin"
                                                name="pin"
                                                type={showPassword ? "text" : "password"}
                                                required
                                                autoComplete="current-password"
                                                suppressHydrationWarning
                                                className={inputClasses}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((value) => !value)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/80"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-[#00A99A] focus:ring-[#00A99A] focus:ring-offset-0 transition-colors"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-white/60 group-hover:text-gray-700 dark:group-hover:text-white/80 transition-colors">Remember me</span>
                                </label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-sm text-[#00A99A] hover:text-[#00bdae] font-medium transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={btnClasses}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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

                        <p className="text-center text-gray-500 dark:text-white/60 text-sm mt-8 font-['Manrope',sans-serif]">
                            Don&apos;t have an account?{" "}
                            <Link
                                href="/auth/register"
                                className="text-[#00A99A] hover:text-[#00bdae] font-medium transition-colors"
                            >
                                Register your school
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
