import { describe, expect, it, afterEach } from "vitest";
import { absolutePortalUrlForSlug } from "@/lib/portalUrl";

describe("absolutePortalUrlForSlug", () => {
    const env = { ...process.env };

    afterEach(() => {
        process.env = { ...env };
    });

    it("returns null for empty slug", () => {
        expect(absolutePortalUrlForSlug(null)).toBe(null);
        expect(absolutePortalUrlForSlug("")).toBe(null);
    });

    it("uses subdomain when tenant mode is on", () => {
        process.env.NEXT_PUBLIC_USE_TENANT_SUBDOMAINS = "true";
        process.env.NEXT_PUBLIC_APP_ROOT_DOMAIN = "edunostics.com";
        expect(absolutePortalUrlForSlug("tis")).toBe("https://tis.edunostics.com/s/tis/login");
    });

    it("uses NEXTAUTH_URL path when tenant mode off", () => {
        process.env.NEXT_PUBLIC_USE_TENANT_SUBDOMAINS = "false";
        process.env.NEXT_PUBLIC_APP_ROOT_DOMAIN = "";
        process.env.NEXTAUTH_URL = "https://app.example.com";
        expect(absolutePortalUrlForSlug("tis")).toBe("https://app.example.com/s/tis/login");
    });
});
