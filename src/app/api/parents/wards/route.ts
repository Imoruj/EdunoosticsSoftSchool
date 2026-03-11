
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const isParent = user.roles.includes("PARENT");

        if (!isParent) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Find the Parent record for this user
        const parentRecord = await prisma.parent.findUnique({
            where: { userId: user.id },
            include: {
                students: {
                    include: {
                        classArm: {
                            include: {
                                class: true
                            }
                        }
                    }
                }
            }
        });

        if (!parentRecord) {
            return NextResponse.json({ wards: [] });
        }

        return NextResponse.json({ wards: parentRecord.students });

    } catch (error) {
        console.error("Error fetching wards:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
