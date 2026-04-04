import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const pathname = req.nextUrl.pathname;
        const host = req.headers.get("host") || "";
        const isAuthPage = pathname.startsWith("/auth");
        const isChangePasswordPage = pathname === "/auth/change-password";
        const isDashboard = pathname.startsWith("/dashboard");
        const isAdmin = pathname.startsWith("/admin");
        const isApi = pathname.startsWith("/api");

        if (host === "tis.edunostics.com") {
            const url = req.nextUrl.clone();
            url.hostname = "www.tis.edunostics.com";
            return NextResponse.redirect(url);
        }

        const roles: string[] = (token as any)?.roles || [];
        const isSuperAdmin = roles.includes("SUPER_ADMIN");
        const isProprietor = roles.includes("PROPRIETOR") && !roles.includes("SUPER_ADMIN") && !roles.includes("SCHOOL_ADMIN");

        // ── Force password change ────────────────────────────────
        if (token && (token as any).mustChangePassword) {
            if (isChangePasswordPage || isApi) return NextResponse.next();
            return NextResponse.redirect(new URL("/auth/change-password", req.url));
        }

        // ── Logged-in → redirect away from auth pages ────────────
        if (token && isAuthPage) {
            const dest = isSuperAdmin ? "/admin" : "/dashboard";
            return NextResponse.redirect(new URL(dest, req.url));
        }

        // ── SUPER_ADMIN must go to /admin, not /dashboard ────────
        if (token && isDashboard && isSuperAdmin) {
            return NextResponse.redirect(new URL("/admin", req.url));
        }

        if (token && isDashboard && isProprietor) {
            const isAllowedDashboardPath =
                pathname === "/dashboard" ||
                pathname === "/dashboard/" ||
                pathname.startsWith("/dashboard/insights") ||
                pathname.startsWith("/dashboard/profile");

            if (!isAllowedDashboardPath) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }

        // ── Non-super-admins cannot access /admin ────────────────
        if (token && isAdmin && !isSuperAdmin) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        // ── API routes handle their own auth ─────────────────────
        if (isApi) return NextResponse.next();

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const pathname = req.nextUrl.pathname;
                const isAuthPage = pathname.startsWith("/auth");
                const isDashboard = pathname.startsWith("/dashboard");
                const isAdminPage = pathname.startsWith("/admin");
                const isPublic =
                    pathname === "/" ||
                    pathname.startsWith("/_next") ||
                    pathname.startsWith("/api");

                if (isPublic || isAuthPage) return true;
                if (isDashboard || isAdminPage) return !!token;
                return true;
            },
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/:path*", "/api/auth/:path*"],
};
