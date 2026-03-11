import React from "react";
import prisma from "@/lib/prisma";
import BirthdayWidget from "@/components/BirthdayWidget";

export async function BirthdayWidgetAsync({ schoolId }: { schoolId: string }) {
    const today = new Date();
    const students = await prisma.student.findMany({
        where: { schoolId, isActive: true },
        select: { id: true, firstName: true, lastName: true, dateOfBirth: true, photoUrl: true, classArm: { include: { class: true } } }
    });

    const upcoming = students.filter(s => {
        if (!s.dateOfBirth) return false;
        const birth = new Date(s.dateOfBirth);
        const thisYearBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());

        if (thisYearBday.getTime() < today.getTime() - 5 * 60 * 1000) return false;
        const diffMs = thisYearBday.getTime() - today.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 2;
    });

    const upcomingBirthdays = upcoming.map(s => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        dateOfBirth: s.dateOfBirth!.toISOString(),
        photoUrl: s.photoUrl,
        className: s.classArm ? `${s.classArm.class.name} ${s.classArm.armName}` : "Unassigned"
    }));

    if (upcomingBirthdays.length === 0) return null;

    return <BirthdayWidget students={upcomingBirthdays} />;
}
