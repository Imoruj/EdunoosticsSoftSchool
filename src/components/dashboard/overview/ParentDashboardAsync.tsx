import React from "react";
import { prisma } from "@/lib/prisma";
import { isTransientPrismaError, withPrismaRetry } from "@/lib/prisma-transient";
import { ParentWards } from "./ParentWards";
import { DashboardUnavailableCard } from "./DashboardUnavailableCard";

export async function ParentDashboardAsync({ userId }: { userId: string }) {
    try {
        const parent = await withPrismaRetry("parent dashboard wards", () =>
            prisma.parent.findUnique({
                where: { userId },
                include: {
                    students: {
                        include: {
                            classArm: { include: { class: true } },
                            school: true,
                        },
                    },
                },
            })
        );

        return <ParentWards wards={parent?.students || []} />;
    } catch (error) {
        if (!isTransientPrismaError(error)) {
            throw error;
        }

        console.warn("Parent dashboard temporarily unavailable because the database is busy.", error);

        return (
            <DashboardUnavailableCard
                title="Ward overview unavailable"
                description="Parent dashboard data could not load because the database connection is temporarily unavailable."
            />
        );
    }
}
