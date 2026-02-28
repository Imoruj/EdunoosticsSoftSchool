import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
        const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
        const isApi = req.nextUrl.pathname.startsWith("/api");

        // If user is logged in and trying to access auth pages, redirect to dashboard
        if (token && isAuthPage) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        // API routes are handled by their own auth checks
        if (isApi) {
            return NextResponse.next();
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
                const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
                const isApi = req.nextUrl.pathname.startsWith("/api");
                const isPublic = req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/_next");

                // Allow public pages and auth pages
                if (isPublic || isAuthPage) {
                    return true;
                }

                // Dashboard requires authentication
                if (isDashboard) {
                    return !!token;
                }

                // API routes handle their own auth
                if (isApi) {
                    return true;
                }

                return true;
            },
        },
    }
);

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/auth/:path*",
    ],
};
