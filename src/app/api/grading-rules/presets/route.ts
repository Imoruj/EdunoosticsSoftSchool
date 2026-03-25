import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
    GradingCategory,
    GradingPreset,
    getGradingPresetRules,
    getPresetLabel,
    isPresetAllowedForCategory,
} from "@/lib/gradingPresets";

const VALID_CATEGORIES = new Set<GradingCategory>(["PRIMARY", "JUNIOR_SECONDARY", "SENIOR_SECONDARY"]);
const VALID_PRESETS = new Set<GradingPreset>(["WAEC"]);

function isValidCategory(value: string): value is GradingCategory {
    return VALID_CATEGORIES.has(value as GradingCategory);
}

function isValidPreset(value: string): value is GradingPreset {
    return VALID_PRESETS.has(value as GradingPreset);
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as { schoolId?: string; roles?: string[] };
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!schoolId) {
            return NextResponse.json({ error: "No school associated with user" }, { status: 400 });
        }

        const body = await req.json();
        const presetRaw = typeof body?.preset === "string" ? body.preset : "";
        const categoryRaw = typeof body?.category === "string" ? body.category : "";

        if (!isValidPreset(presetRaw)) {
            return NextResponse.json({ error: "Invalid preset selected" }, { status: 400 });
        }

        if (!isValidCategory(categoryRaw)) {
            return NextResponse.json({ error: "Invalid school category selected" }, { status: 400 });
        }

        if (!isPresetAllowedForCategory(presetRaw, categoryRaw)) {
            return NextResponse.json(
                { error: `${getPresetLabel(presetRaw)} preset is not available for ${categoryRaw.replace("_", " ")}` },
                { status: 400 }
            );
        }

        const presetRules = getGradingPresetRules(presetRaw, categoryRaw);

        const rules = await prisma.$transaction(async (tx) => {
            await tx.gradingRule.deleteMany({
                where: { schoolId, schoolCategory: categoryRaw },
            });

            await tx.gradingRule.createMany({
                data: presetRules.map((rule) => ({
                    grade: rule.grade,
                    minScore: rule.minScore,
                    maxScore: rule.maxScore,
                    remark: rule.remark,
                    schoolId,
                    schoolCategory: categoryRaw,
                })),
            });

            return tx.gradingRule.findMany({
                where: { schoolId, schoolCategory: categoryRaw },
                orderBy: { minScore: "desc" },
            });
        });

        return NextResponse.json({
            preset: presetRaw,
            category: categoryRaw,
            rules,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to apply grading preset";
        console.error("Error applying grading preset:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

