import React from "react";
import { prisma } from "@/lib/prisma";
import { isTransientPrismaError, withPrismaRetry } from "@/lib/prisma-transient";
import BirthdayWidget from "@/components/BirthdayWidget";

export async function BirthdayWidgetAsync({ schoolId }: { schoolId: string }) {
    try {
        const today = new Date();
        const students = await withPrismaRetry("birthday widget students", () =>
            prisma.student.findMany({
                where: { schoolId, isActive: true },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    gender: true,
                    dateOfBirth: true,
                    photoUrl: true,
                    classArm: { include: { class: true } },
                },
            })
        );

        const upcomingBirthdays = students
            .filter((student) => {
                if (!student.dateOfBirth) return false;

                const birth = new Date(student.dateOfBirth);
                const thisYearBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());

                if (thisYearBirthday.getTime() < today.getTime() - 5 * 60 * 1000) {
                    return false;
                }

                const diffMs = thisYearBirthday.getTime() - today.getTime();
                const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                return days >= 0 && days <= 2;
            })
            .map((student) => ({
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                gender: student.gender,
                dateOfBirth: student.dateOfBirth!.toISOString(),
                photoUrl: student.photoUrl,
                className: student.classArm ? `${student.classArm.class.name} ${student.classArm.armName}` : "Unassigned",
            }))
            .sort((left, right) => {
                const leftDate = new Date(left.dateOfBirth);
                const rightDate = new Date(right.dateOfBirth);
                const today = new Date();
                const nextLeft = new Date(today.getFullYear(), leftDate.getMonth(), leftDate.getDate()).getTime();
                const nextRight = new Date(today.getFullYear(), rightDate.getMonth(), rightDate.getDate()).getTime();
                return nextLeft - nextRight || left.firstName.localeCompare(right.firstName);
            });

        if (upcomingBirthdays.length === 0) {
            return null;
        }

        return <BirthdayWidget students={upcomingBirthdays} />;
    } catch (error) {
        if (!isTransientPrismaError(error)) {
            throw error;
        }

        console.warn("Birthday widget temporarily unavailable because the database is busy.", error);
        return null;
    }
}
