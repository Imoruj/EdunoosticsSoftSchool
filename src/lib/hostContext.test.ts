import { describe, expect, it } from "vitest";
import {
    getTenantSlugFromHostname,
    isApexMarketingHost,
    normalizeHostHeader,
} from "@/lib/hostContext";

describe("hostContext", () => {
    it("normalizes host header", () => {
        expect(normalizeHostHeader(" TIS.Edunostics.com:443 ")).toBe("tis.edunostics.com");
    });

    it("extracts tenant slug from subdomain", () => {
        expect(getTenantSlugFromHostname("tis.edunostics.com", "edunostics.com")).toBe("tis");
    });

    it("returns null for apex and www", () => {
        expect(getTenantSlugFromHostname("edunostics.com", "edunostics.com")).toBe(null);
        expect(getTenantSlugFromHostname("www.edunostics.com", "edunostics.com")).toBe(null);
    });

    it("returns null for reserved labels", () => {
        expect(getTenantSlugFromHostname("api.edunostics.com", "edunostics.com")).toBe(null);
    });

    it("detects apex marketing host", () => {
        expect(isApexMarketingHost("edunostics.com", "edunostics.com")).toBe(true);
        expect(isApexMarketingHost("www.edunostics.com", "edunostics.com")).toBe(true);
        expect(isApexMarketingHost("tis.edunostics.com", "edunostics.com")).toBe(false);
        expect(isApexMarketingHost("localhost:3000", "edunostics.com")).toBe(false);
    });
});
