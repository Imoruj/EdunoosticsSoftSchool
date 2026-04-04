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

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
                <div>
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                            <span className="text-primary-600 font-bold text-2xl">E</span>
                        </div>
                        <span className="text-white font-semibold text-2xl">Edunostics</span>
                    </Link>
                </div>

                <div className="max-w-md">
                    <h1 className="text-4xl font-bold text-white mb-6">
                        Welcome back!
                    </h1>
                    <p className="text-white/70 text-lg">
                        Sign in to access your school&apos;s report card management system.
                        Generate and manage student academic records with ease.
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-primary-800"></div>
                        <div className="w-10 h-10 rounded-full bg-green-500 border-2 border-primary-800"></div>
                        <div className="w-10 h-10 rounded-full bg-yellow-500 border-2 border-primary-800"></div>
                        <div className="w-10 h-10 rounded-full bg-purple-500 border-2 border-primary-800"></div>
                    </div>
                    <p className="text-white/60 text-sm">
                        Trusted by 500+ schools across Nigeria
                    </p>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-2xl p-8">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-8">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">E</span>
                                </div>
                                <span className="text-gray-900 font-semibold text-xl">Edunostics</span>
                            </Link>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                            Sign in to your account
                        </h2>
                        <p className="text-gray-500 text-center mb-8">
                            Enter your credentials to access the dashboard
                        </p>

                        {/* Login Type Tabs */}
                        <div className="flex bg-gray-100 rounded-lg p-1 mb-2">
                            <button
                                onClick={() => handleLoginTypeChange("admin")}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === "admin"
                                    ? "bg-white text-gray-900 shadow"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Admin/Teacher
                            </button>
                            <button
                                onClick={() => handleLoginTypeChange("parent")}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === "parent"
                                    ? "bg-white text-gray-900 shadow"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Parent
                            </button>
                            <button
                                onClick={() => handleLoginTypeChange("student")}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === "student"
                                    ? "bg-white text-gray-900 shadow"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Student
                            </button>
                        </div>

                        <p className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                            Choose the tab that matches the account you are signing into. Student and parent accounts are blocked from the Admin/Teacher tab.
                        </p>

                        {/* Super Admin hint — shown on Admin/Teacher tab */}
                        {loginType === "admin" && (
                            <p className="text-xs text-center text-gray-400 mb-6">
                                Platform super admin? Use this tab with your super admin email.
                            </p>
                        )}
                        {loginType !== "admin" && <div className="mb-6" />}

                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} method="post" className="space-y-5" suppressHydrationWarning>
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
                                            autoComplete="username"
                                            suppressHydrationWarning
                                            className="input"
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
                                            type={showPassword ? "text" : "password"}
                                            required
                                            autoComplete="current-password"
                                            suppressHydrationWarning
                                            className="input"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            {showPassword ? "Hide password" : "Show password"}
                                        </button>
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
                                            autoComplete="username"
                                            suppressHydrationWarning
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
                                            type={showPassword ? "text" : "password"}
                                            required
                                            maxLength={6}
                                            autoComplete="current-password"
                                            suppressHydrationWarning
                                            className="input"
                                            placeholder="••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            {showPassword ? "Hide password" : "Show password"}
                                        </button>
                                    </div>
                                </>
                            )}

                            {loginType === "student" && (
                                <>
                                    <div>
                                        <label htmlFor="studentEmail" className="block text-sm font-medium text-gray-700 mb-2">
                                            Student Email or Admission Number
                                        </label>
                                        <input
                                            id="studentEmail"
                                            name="email"
                                            type="text"
                                            required
                                            autoComplete="username"
                                            suppressHydrationWarning
                                            className="input"
                                            placeholder="firstname.lastname@school.com or SCH/2026/0001"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Your school decides which student login method is allowed.
                                        </p>
                                    </div>
                                    <div>
                                        <label htmlFor="studentPin" className="block text-sm font-medium text-gray-700 mb-2">
                                            Password
                                        </label>
                                        <input
                                            id="studentPin"
                                            name="pin"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            autoComplete="current-password"
                                            suppressHydrationWarning
                                            className="input"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            {showPassword ? "Hide password" : "Show password"}
                                        </button>
                                    </div>
                                </>
                            )}

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-gray-600">Remember me</span>
                                </label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full py-3 text-base"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Signing in...
                                    </span>
                                ) : (
                                    "Sign in"
                                )}
                            </button>
                        </form>

                        <p className="text-center text-gray-500 text-sm mt-8">
                            Don&apos;t have an account?{" "}
                            <Link
                                href="/auth/register"
                                className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Register your school
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
