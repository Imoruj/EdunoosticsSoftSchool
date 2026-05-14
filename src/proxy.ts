import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ROOT_DOMAIN = "edunostics.com";
const RESERVED_SUBDOMAINS = new Set(["www", "app", "admin", "api"]);

function tenantSlugFromHost(hostHeader: string) {
    const host = hostHeader.split(":")[0]?.toLowerCase() || "";
    if (!host.endsWith(`.${ROOT_DOMAIN}`)) return null;

    const label = host.slice(0, -`.${ROOT_DOMAIN}`.length);
    if (!label || RESERVED_SUBDOMAINS.has(label)) return null;

    return label;
}

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const pathname = req.nextUrl.pathname;
        const host = req.headers.get("host") || "";
        const tenantSlug = tenantSlugFromHost(host);
        const isAuthPage = pathname.startsWith("/auth");
        const isChangePasswordPage = pathname === "/auth/change-password";
        const isDashboard = pathname.startsWith("/dashboard");
        const isAdmin = pathname.startsWith("/admin");
        const isApi = pathname.startsWith("/api");
        const schoolLoginMatch = pathname.match(/^\/s\/([^/]+)\/login(?:\/|$)/);
        const pathLoginSlug = schoolLoginMatch?.[1]?.toLowerCase() ?? null;
        const isSchoolLoginPath = !!schoolLoginMatch;

        if (tenantSlug && pathLoginSlug && pathLoginSlug !== tenantSlug) {
            const url = req.nextUrl.clone();
            url.pathname = `/s/${tenantSlug}/login`;
            return NextResponse.redirect(url);
        }

        if (tenantSlug && (pathname === "/" || pathname === "/login" || pathname === "/auth/login")) {
            const url = req.nextUrl.clone();
            url.pathname = `/s/${tenantSlug}/login`;
            return NextResponse.redirect(url);
        }

        const roles: string[] = (token as any)?.roles || [];
        const isSuperAdmin = roles.includes("SUPER_ADMIN");
        const isProprietor =
            roles.includes("PROPRIETOR") &&
            !roles.includes("SUPER_ADMIN") &&
            !roles.includes("SCHOOL_ADMIN");

        if (token && (token as any).mustChangePassword) {
            if (isChangePasswordPage || isApi) return NextResponse.next();
            return NextResponse.redirect(new URL("/auth/change-password", req.url));
        }

        if (token && (isAuthPage || isSchoolLoginPath)) {
            const dest = isSuperAdmin ? "/admin" : "/dashboard";
            return NextResponse.redirect(new URL(dest, req.url));
        }

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

        if (token && isAdmin && !isSuperAdmin) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        if (isApi) return NextResponse.next();

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const pathname = req.nextUrl.pathname;
                const isAuthPage = pathname.startsWith("/auth");
                const onSchoolLoginPath = /^\/s\/[^/]+\/login(?:\/|$)/.test(pathname);
                const isDashboard = pathname.startsWith("/dashboard");
                const isAdminPage = pathname.startsWith("/admin");
                const isPublic =
                    pathname === "/" ||
                    pathname === "/login" ||
                    pathname.startsWith("/_next") ||
                    pathname.startsWith("/api");

                if (isPublic || isAuthPage || onSchoolLoginPath) return true;
                if (isDashboard || isAdminPage) return !!token;
                return true;
            },
        },
    }
);

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?)$).*)",
    ],
};
