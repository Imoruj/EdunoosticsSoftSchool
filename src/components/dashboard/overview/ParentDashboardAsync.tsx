import React from "react";
import prisma from "@/lib/prisma";
import { ParentWards } from "./ParentWards";

export async function ParentDashboardAsync({ userId }: { userId: string }) {
    const parent = await prisma.parent.findUnique({
        where: { userId },
        include: {
            students: {
                include: { classArm: { include: { class: true } }, school: true }
            }
        }
    });

    const wards = parent?.students || [];

    return <ParentWards wards={wards} />;
}
