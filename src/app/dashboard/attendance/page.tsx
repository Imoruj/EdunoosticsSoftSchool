"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { showSuccessMessage } from "@/lib/successMessage";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
type ViewMode = "daily" | "weekly";

interface StudentAttendance {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    status: AttendanceStatus;
}

interface WeekDay {
    dateStr: string;
    label: string;
    isHoliday: boolean;
    holidayName?: string;
    isOutsideTerm?: boolean;
}

interface PublicHoliday {
    id: string;
    name: string;
    date: string;
}

interface CurrentTermInfo {
    sessionId: string;
    termId?: string;
    termName: string;
    termNumber?: number | null;
    startDate: string | null;
    endDate: string | null;
    totalWeeks: number | null;
}

interface WeekOption {
    value: string;
    label: string;
    weekNumber: number;
}

interface ClassOption {
    id: string;
    name: string;
    classTeacherId?: string | null;
}

interface MarkedWeekSummary {
    weekStartDate: string;
    markedDates: string[];
    markedDaysCount: number;
}

const SCHOOL_TIMEZONE = "Africa/Lagos";

const STATUS_COLORS: Record<AttendanceStatus, { bg: string; text: string; ring: string }> = {
    PRESENT: { bg: "bg-green-100", text: "text-green-800", ring: "ring-green-400" },
    ABSENT: { bg: "bg-red-100", text: "text-red-800", ring: "ring-red-400" },
    LATE: { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-400" },
    EXCUSED: { bg: "bg-blue-100", text: "text-blue-800", ring: "ring-blue-400" },
};

const STATUS_ABBR: Record<AttendanceStatus, string> = {
    PRESENT: "P",
    ABSENT: "A",
    LATE: "L",
    EXCUSED: "E",
};

const STATUS_CYCLE: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

function toSchoolDateStr(value: string | Date): string {
    const date = typeof value === "string" ? new Date(value) : value;
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: SCHOOL_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value ?? "0000";
    const month = parts.find((part) => part.type === "month")?.value ?? "00";
    const day = parts.find((part) => part.type === "day")?.value ?? "00";

    return `${year}-${month}-${day}`;
}

function parseDateStr(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function toDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
    const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function getMonday(date: Date): Date {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = normalizedDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    normalizedDate.setDate(normalizedDate.getDate() + diff);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
}

function getWeekDays(monday: Date): { date: Date; dateStr: string; label: string }[] {
    const days = [];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];

    for (let index = 0; index < 5; index += 1) {
        const currentDate = addDays(monday, index);
        days.push({
            date: currentDate,
            dateStr: toDateStr(currentDate),
            label: `${dayNames[index]} ${currentDate.getDate()}`,
        });
    }

    return days;
}

function getWeekCount(startDate: string, endDate: string): number {
    const firstWeekStart = getMonday(parseDateStr(startDate));
    const finalDate = parseDateStr(endDate);
    const diffInDays = Math.floor((finalDate.getTime() - firstWeekStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil((diffInDays + 1) / 7));
}

function formatDateLabel(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return date.toLocaleDateString("en-NG", options ?? {
        day: "numeric",
        month: "short",
    });
}

function buildWeekOptions(termInfo: CurrentTermInfo | null): WeekOption[] {
    if (!termInfo?.startDate || !termInfo?.endDate) return [];

    const termStart = parseDateStr(termInfo.startDate);
    const termEnd = parseDateStr(termInfo.endDate);
    const firstWeekStart = getMonday(termStart);
    const computedWeeks = getWeekCount(termInfo.startDate, termInfo.endDate);
    const weekCount = termInfo.totalWeeks && termInfo.totalWeeks > 0
        ? termInfo.totalWeeks
        : computedWeeks;

    return Array.from({ length: weekCount }, (_, index) => {
        const weekStart = addDays(firstWeekStart, index * 7);
        const weekEnd = addDays(weekStart, 4);
        const visibleStart = weekStart < termStart ? termStart : weekStart;
        const visibleEnd = weekEnd > termEnd ? termEnd : weekEnd;
        const labelStart = visibleEnd < visibleStart ? weekStart : visibleStart;
        const labelEnd = visibleEnd < visibleStart ? weekEnd : visibleEnd;

        return {
            value: toDateStr(weekStart),
            weekNumber: index + 1,
            label: `Week ${index + 1} (${formatDateLabel(labelStart)} - ${formatDateLabel(labelEnd, {
                day: "numeric",
                month: "short",
                year: labelStart.getFullYear() !== labelEnd.getFullYear() ? "numeric" : undefined,
            })})`,
        };
    });
}

function buildWeekLabel(weekStartDate: string, weekOptions: WeekOption[]): string {
    const matchingOption = weekOptions.find((option) => option.value === weekStartDate);
    if (matchingOption) return matchingOption.label;

    const weekStart = parseDateStr(weekStartDate);
    const weekEnd = addDays(weekStart, 4);

    return `Week of ${formatDateLabel(weekStart)} - ${formatDateLabel(weekEnd, {
        day: "numeric",
        month: "short",
        year: weekStart.getFullYear() !== weekEnd.getFullYear() ? "numeric" : undefined,
    })}`;
}

export default function AttendancePage() {
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [selectedClassArmId, setSelectedClassArmId] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("daily");
    const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
    const [students, setStudents] = useState<StudentAttendance[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [weekStartDate, setWeekStartDate] = useState(toDateStr(getMonday(new Date())));
    const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
    const [weekData, setWeekData] = useState<Record<string, StudentAttendance[]>>({});
    const [weekStudentList, setWeekStudentList] = useState<StudentAttendance[]>([]);
    const [isLoadingWeek, setIsLoadingWeek] = useState(false);
    const [isSavingWeek, setIsSavingWeek] = useState(false);
    const [currentTermInfo, setCurrentTermInfo] = useState<CurrentTermInfo | null>(null);
    const [markedWeeks, setMarkedWeeks] = useState<MarkedWeekSummary[]>([]);
    const [isLoadingMarkedWeeks, setIsLoadingMarkedWeeks] = useState(false);

    const fetchClasses = useCallback(async () => {
        try {
            const res = await fetch("/api/classes");
            if (!res.ok) return;

            const data = await res.json();
            const arms = data.classes.flatMap((schoolClass: any) =>
                schoolClass.arms.map((arm: any) => ({
                    id: arm.id,
                    name: `${schoolClass.name} ${arm.armName}`,
                    classTeacherId: arm.classTeacherId,
                }))
            );

            setClasses(arms);
        } catch (err) {
            console.error("Failed to fetch classes", err);
        }
    }, []);

    const fetchCurrentTermInfo = useCallback(async () => {
        try {
            const res = await fetch("/api/sessions/current", { cache: "no-store" });
            if (!res.ok) return;

            const data = await res.json();
            setCurrentTermInfo({
                sessionId: data.sessionId,
                termId: data.termId,
                termName: data.termName,
                termNumber: data.termNumber,
                startDate: data.startDate,
                endDate: data.endDate,
                totalWeeks: data.totalWeeks,
            });
        } catch (err) {
            console.error("Failed to fetch current term info", err);
        }
    }, []);

    const fetchDailyAttendance = useCallback(async () => {
        if (!selectedClassArmId || !selectedDate) return;

        setIsLoading(true);
        setError("");

        try {
            const res = await fetch(`/api/attendance?classArmId=${selectedClassArmId}&date=${selectedDate}`);
            if (res.ok) {
                setStudents(await res.json());
            } else {
                setError("Failed to fetch attendance records");
            }
        } catch {
            setError("Connection error");
        } finally {
            setIsLoading(false);
        }
    }, [selectedClassArmId, selectedDate]);

    const fetchWeekAttendance = useCallback(async () => {
        if (!selectedClassArmId || !weekStartDate) return;

        setIsLoadingWeek(true);

        try {
            const monday = parseDateStr(weekStartDate);
            monday.setHours(0, 0, 0, 0);

            const rawDays = getWeekDays(monday);
            const termStartDate = currentTermInfo?.startDate ?? null;
            const termEndDate = currentTermInfo?.endDate ?? null;
            const friday = rawDays[4].dateStr;

            const holidaysRes = await fetch(`/api/public-holidays?from=${weekStartDate}&to=${friday}`);
            const holidays: PublicHoliday[] = holidaysRes.ok ? await holidaysRes.json() : [];
            const holidayMap: Record<string, string> = {};

            holidays.forEach((holiday) => {
                holidayMap[toSchoolDateStr(holiday.date)] = holiday.name;
            });

            const enrichedDays: WeekDay[] = rawDays.map((day) => ({
                dateStr: day.dateStr,
                label: day.label,
                isHoliday: !!holidayMap[day.dateStr],
                holidayName: holidayMap[day.dateStr],
                isOutsideTerm: !!(
                    (termStartDate && day.dateStr < termStartDate) ||
                    (termEndDate && day.dateStr > termEndDate)
                ),
            }));

            setWeekDays(enrichedDays);

            const inTermDays = enrichedDays.filter((day) => !day.isOutsideTerm);
            const activeDays = enrichedDays.filter((day) => !day.isHoliday && !day.isOutsideTerm);
            const results = await Promise.all(
                activeDays.map((day) =>
                    fetch(`/api/attendance?classArmId=${selectedClassArmId}&date=${day.dateStr}`)
                        .then((response) => (response.ok ? response.json() : []))
                )
            );

            const nextWeekData: Record<string, StudentAttendance[]> = {};
            activeDays.forEach((day, index) => {
                nextWeekData[day.dateStr] = results[index];
            });

            enrichedDays
                .filter((day) => day.isHoliday || day.isOutsideTerm)
                .forEach((day) => {
                    nextWeekData[day.dateStr] = [];
                });

            setWeekData(nextWeekData);

            const firstResultWithStudents = results.find((result) => result.length > 0);
            if (firstResultWithStudents) {
                setWeekStudentList(firstResultWithStudents);
            } else if (activeDays.length > 0) {
                setWeekStudentList(results[0] ?? []);
            } else if (inTermDays.length > 0) {
                const fallbackResponse = await fetch(
                    `/api/attendance?classArmId=${selectedClassArmId}&date=${inTermDays[0].dateStr}`
                );
                setWeekStudentList(fallbackResponse.ok ? await fallbackResponse.json() : []);
            } else {
                setWeekStudentList([]);
            }
        } catch (err) {
            console.error("Failed to fetch week attendance", err);
        } finally {
            setIsLoadingWeek(false);
        }
    }, [currentTermInfo, selectedClassArmId, weekStartDate]);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    useEffect(() => {
        fetchCurrentTermInfo();
    }, [fetchCurrentTermInfo]);

    useEffect(() => {
        const handleTermUpdated = () => {
            fetchCurrentTermInfo();
        };

        window.addEventListener("term-updated", handleTermUpdated);
        return () => {
            window.removeEventListener("term-updated", handleTermUpdated);
        };
    }, [fetchCurrentTermInfo]);

    const weekOptions = useMemo(() => buildWeekOptions(currentTermInfo), [currentTermInfo]);
    const selectedWeekOption = useMemo(
        () => weekOptions.find((option) => option.value === weekStartDate) ?? null,
        [weekOptions, weekStartDate]
    );
    const markedWeekStartDates = useMemo(
        () => new Set(markedWeeks.map((week) => week.weekStartDate)),
        [markedWeeks]
    );
    const unmarkedWeekOptions = useMemo(
        () => weekOptions.filter((option) => !markedWeekStartDates.has(option.value)),
        [markedWeekStartDates, weekOptions]
    );
    const selectedUnmarkedWeekValue = useMemo(
        () => (unmarkedWeekOptions.some((option) => option.value === weekStartDate) ? weekStartDate : ""),
        [unmarkedWeekOptions, weekStartDate]
    );
    const markedWeekOptions = useMemo(
        () => markedWeeks
            .map((week) => {
                const matchedOption = weekOptions.find((o) => o.value === week.weekStartDate);
                return {
                    ...week,
                    label: buildWeekLabel(week.weekStartDate, weekOptions),
                    shortLabel: matchedOption ? `Week ${matchedOption.weekNumber}` : buildWeekLabel(week.weekStartDate, weekOptions),
                };
            })
            .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)),
        [markedWeeks, weekOptions]
    );

    const fetchMarkedWeeks = useCallback(async () => {
        if (!selectedClassArmId || !currentTermInfo?.startDate || !currentTermInfo?.endDate) {
            setMarkedWeeks([]);
            return;
        }

        setIsLoadingMarkedWeeks(true);

        try {
            const params = new URLSearchParams({
                classArmId: selectedClassArmId,
                from: currentTermInfo.startDate,
                to: currentTermInfo.endDate,
            });
            const res = await fetch(`/api/attendance/weeks?${params.toString()}`, {
                cache: "no-store",
            });

            if (res.ok) {
                setMarkedWeeks(await res.json());
            } else {
                setMarkedWeeks([]);
            }
        } catch (err) {
            console.error("Failed to fetch marked attendance weeks", err);
            setMarkedWeeks([]);
        } finally {
            setIsLoadingMarkedWeeks(false);
        }
    }, [currentTermInfo?.endDate, currentTermInfo?.startDate, selectedClassArmId]);

    const saveWeekMarker = useCallback(async (markedDates: string[]) => {
        if (!selectedClassArmId || !weekStartDate) return;

        const response = await fetch("/api/attendance/weeks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                classArmId: selectedClassArmId,
                weekStartDate,
                markedDates,
            }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Failed to save attendance week");
        }
    }, [selectedClassArmId, weekStartDate]);

    useEffect(() => {
        if (viewMode === "daily" && selectedClassArmId && selectedDate) {
            fetchDailyAttendance();
        }
    }, [fetchDailyAttendance, selectedClassArmId, selectedDate, viewMode]);

    useEffect(() => {
        if (viewMode === "weekly" && selectedClassArmId && weekStartDate) {
            fetchWeekAttendance();
        }
    }, [fetchWeekAttendance, selectedClassArmId, viewMode, weekStartDate]);

    useEffect(() => {
        if (viewMode === "weekly") {
            fetchMarkedWeeks();
        }
    }, [fetchMarkedWeeks, viewMode]);

    useEffect(() => {
        if (!weekOptions.length) return;

        const hasMatchingSelection = weekOptions.some((option) => option.value === weekStartDate);
        if (hasMatchingSelection) return;

        const today = toDateStr(new Date());
        const matchingCurrentWeek = weekOptions.find((option, index) => {
            const optionStart = option.value;
            const nextWeekStart = weekOptions[index + 1]?.value;
            const optionEnd = nextWeekStart
                ? toDateStr(addDays(parseDateStr(nextWeekStart), -1))
                : currentTermInfo?.endDate ?? option.value;

            return today >= optionStart && today <= optionEnd;
        });

        setWeekStartDate(matchingCurrentWeek?.value ?? weekOptions[0].value);
    }, [currentTermInfo, weekOptions, weekStartDate]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setStudents((prev) => prev.map((student) => (
            student.id === studentId ? { ...student, status } : student
        )));
    };

    const handleMarkAll = (status: AttendanceStatus) => {
        setStudents((prev) => prev.map((student) => ({ ...student, status })));
    };

    const handleSaveDaily = async () => {
        setIsSaving(true);
        setError("");

        try {
            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classArmId: selectedClassArmId,
                    date: selectedDate,
                    attendance: students.map((student) => ({
                        studentId: student.id,
                        status: student.status,
                    })),
                }),
            });

            if (res.ok) {
                showSuccessMessage("Attendance saved successfully!", { title: "Attendance Saved!" });
                await fetchMarkedWeeks();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to save attendance");
                toast.error(data.error || "Failed to save attendance");
            }
        } catch {
            toast.error("Failed to save attendance");
        } finally {
            setIsSaving(false);
        }
    };

    const handleWeekCellClick = (dateStr: string, studentId: string) => {
        setWeekData((prev) => {
            const dayStudents = prev[dateStr] || [];

            return {
                ...prev,
                [dateStr]: dayStudents.map((student) => {
                    if (student.id !== studentId) return student;
                    const currentIndex = STATUS_CYCLE.indexOf(student.status);
                    return {
                        ...student,
                        status: STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length],
                    };
                }),
            };
        });
    };

    const handleMarkAllWeekDay = (dateStr: string, status: AttendanceStatus) => {
        setWeekData((prev) => ({
            ...prev,
            [dateStr]: (prev[dateStr] || []).map((student) => ({ ...student, status })),
        }));
    };

    const handleSaveWeek = async () => {
        const inTermDays = weekDays.filter((day) => !day.isOutsideTerm);
        const activeDays = weekDays.filter((day) => !day.isHoliday && !day.isOutsideTerm);

        if (!inTermDays.length || weekStudentList.length === 0) {
            return;
        }

        setIsSavingWeek(true);

        try {
            if (!activeDays.length) {
                await saveWeekMarker(inTermDays.map((day) => day.dateStr));
                showSuccessMessage("Break week saved and added to Marked Weeks.", {
                    title: "Week Saved!",
                });
                await fetchMarkedWeeks();
                return;
            }

            const responses = await Promise.all(
                activeDays.map((day) => {
                    const dayStudents = weekData[day.dateStr] || [];
                    if (!dayStudents.length) return Promise.resolve();

                    return fetch("/api/attendance", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            classArmId: selectedClassArmId,
                            date: day.dateStr,
                            attendance: dayStudents.map((student) => ({
                                studentId: student.id,
                                status: student.status,
                            })),
                        }),
                    });
                })
            );

            if (responses.some((response) => response && !response.ok)) {
                throw new Error("Failed to save one or more attendance days");
            }

            await saveWeekMarker(inTermDays.map((day) => day.dateStr));
            showSuccessMessage("Week attendance saved!", { title: "Saved!" });
            await fetchMarkedWeeks();
        } catch {
            toast.error("Failed to save week attendance");
        } finally {
            setIsSavingWeek(false);
        }
    };

    const showTable = selectedClassArmId && selectedDate;
    const selectedClassName = classes.find((schoolClass) => schoolClass.id === selectedClassArmId)?.name || "";
    const hasInTermWeekDays = weekDays.some((day) => !day.isOutsideTerm);
    const hasActiveWeekDays = weekDays.some((day) => !day.isHoliday && !day.isOutsideTerm);
    const termRangeLabel = currentTermInfo?.startDate && currentTermInfo?.endDate
        ? `${formatDateLabel(parseDateStr(currentTermInfo.startDate), {
            day: "numeric",
            month: "short",
            year: "numeric",
        })} - ${formatDateLabel(parseDateStr(currentTermInfo.endDate), {
            day: "numeric",
            month: "short",
            year: "numeric",
        })}`
        : "";

    const dailyStats = {
        present: students.filter((student) => student.status === "PRESENT").length,
        absent: students.filter((student) => student.status === "ABSENT").length,
        late: students.filter((student) => student.status === "LATE").length,
        excused: students.filter((student) => student.status === "EXCUSED").length,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
                    <p className="mt-1 text-gray-500">Mark and manage student attendance</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                        <button
                            onClick={() => setViewMode("daily")}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                                viewMode === "daily"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setViewMode("weekly")}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                                viewMode === "weekly"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Weekly
                        </button>
                    </div>

                    {viewMode === "daily" && showTable && (
                        <button
                            onClick={handleSaveDaily}
                            disabled={isSaving || students.length === 0}
                            className="btn-primary flex items-center gap-2"
                        >
                            {isSaving ? "Saving..." : "Save Attendance"}
                        </button>
                    )}

                    {viewMode === "weekly" && selectedClassArmId && weekStudentList.length > 0 && hasInTermWeekDays && (
                        <button
                            onClick={handleSaveWeek}
                            disabled={isSavingWeek}
                            className="btn-primary flex items-center gap-2"
                            title={!hasActiveWeekDays ? "This week contains only holidays or break days" : undefined}
                        >
                            {isSavingWeek ? "Saving..." : "Save Week"}
                        </button>
                    )}
                </div>
            </div>

            <div className="card p-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Select Class *</label>
                        <select
                            value={selectedClassArmId}
                            onChange={(e) => setSelectedClassArmId(e.target.value)}
                            className="input w-full"
                        >
                            <option value="">Choose a class</option>
                            {classes.map((schoolClass) => (
                                <option key={schoolClass.id} value={schoolClass.id}>
                                    {schoolClass.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {viewMode === "daily" ? (
                        <>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Select Date *</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="input w-full"
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <button
                                    onClick={() => handleMarkAll("PRESENT")}
                                    className="btn-secondary text-sm"
                                    disabled={!showTable || students.length === 0}
                                >
                                    All Present
                                </button>
                                <button
                                    onClick={() => handleMarkAll("ABSENT")}
                                    className="btn-secondary text-sm"
                                    disabled={!showTable || students.length === 0}
                                >
                                    All Absent
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Week Starting (Monday)</label>
                                <input
                                    type="date"
                                    value={weekStartDate}
                                    onChange={(e) => setWeekStartDate(toDateStr(getMonday(parseDateStr(e.target.value))))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Attendance Week</label>
                                <select
                                    value={selectedUnmarkedWeekValue}
                                    onChange={(e) => setWeekStartDate(e.target.value)}
                                    className="input w-full"
                                    disabled={!unmarkedWeekOptions.length}
                                >
                                    <option value="">
                                        {!currentTermInfo
                                            ? "Loading current term..."
                                            : !unmarkedWeekOptions.length
                                                ? "All weeks have been marked"
                                                : markedWeekStartDates.has(weekStartDate)
                                                    ? "Select an unmarked week"
                                                    : "Select a week"}
                                    </option>
                                    {unmarkedWeekOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                {termRangeLabel && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        Current term: {termRangeLabel}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {viewMode === "weekly" && selectedClassArmId && (
                    <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-4">
                        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {isLoadingMarkedWeeks ? "Loading..." : "Marked:"}
                        </span>
                        {!isLoadingMarkedWeeks && (
                            markedWeekOptions.length > 0 ? (
                                markedWeekOptions.map((week) => {
                                    const isSelected = week.weekStartDate === weekStartDate;
                                    return (
                                        <button
                                            key={week.weekStartDate}
                                            type="button"
                                            title={week.label}
                                            onClick={() => setWeekStartDate(week.weekStartDate)}
                                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                                                isSelected
                                                    ? "border-primary-400 bg-primary-50 text-primary-700 shadow-sm"
                                                    : "border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-gray-50"
                                            }`}
                                        >
                                            {week.shortLabel}
                                        </button>
                                    );
                                })
                            ) : (
                                <span className="text-xs italic text-gray-400">No weeks marked yet this term.</span>
                            )
                        )}
                    </div>
                )}

                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </div>

            {viewMode === "daily" && (
                <>
                    {showTable && students.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            {(["present", "absent", "late", "excused"] as const).map((key) => {
                                const colors = {
                                    present: "bg-green-100 text-green-600",
                                    absent: "bg-red-100 text-red-600",
                                    late: "bg-amber-100 text-amber-600",
                                    excused: "bg-blue-100 text-blue-600",
                                };

                                return (
                                    <div key={key} className="card p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[key]}`}>
                                                <span className="font-bold">{dailyStats[key]}</span>
                                            </div>
                                            <p className="text-sm capitalize text-gray-500">{key}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {showTable ? (
                        <div className="card overflow-hidden">
                            <div className="border-b border-gray-200 bg-gray-50 p-4">
                                <h3 className="font-semibold text-gray-900">
                                    {selectedClassName} —{" "}
                                    {parseDateStr(selectedDate).toLocaleDateString("en-NG", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </h3>
                                <p className="text-sm text-gray-500">{students.length} students</p>
                            </div>
                            <div className="overflow-x-auto">
                                {isLoading ? (
                                    <div className="p-12 text-center text-gray-500">Loading students...</div>
                                ) : students.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500">No students found in this class.</div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="border-b border-gray-200 bg-gray-50">
                                            <tr>
                                                <th className="w-16 px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">S/N</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Student</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {students.map((student, index) => (
                                                <tr key={student.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {student.lastName} {student.firstName}
                                                        </p>
                                                        <p className="font-mono text-xs text-gray-500">{student.admissionNumber}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((status) => (
                                                                <button
                                                                    key={status}
                                                                    onClick={() => handleStatusChange(student.id, status)}
                                                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                                                        student.status === status
                                                                            ? `${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text} ring-2 ring-current ring-offset-1`
                                                                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                                    }`}
                                                                >
                                                                    {status.charAt(0) + status.slice(1).toLowerCase()}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            {!isLoading && students.length > 0 && (
                                <div className="border-t border-gray-200 bg-gray-50 p-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">
                                            Attendance Rate:{" "}
                                            <span className="font-bold text-green-600">
                                                {((dailyStats.present / students.length) * 100).toFixed(1)}%
                                            </span>
                                        </span>
                                        <span className="text-gray-500">
                                            Total: <span className="font-medium">{students.length}</span> students
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <EmptyState />
                    )}
                </>
            )}

            {viewMode === "weekly" && (
                <>
                    {!selectedClassArmId ? (
                        <EmptyState />
                    ) : isLoadingWeek ? (
                        <div className="card p-12 text-center text-gray-500">Loading week attendance...</div>
                    ) : (
                        <div className="card overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 p-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        {selectedClassName} —{" "}
                                        {selectedWeekOption?.label ?? `Week of ${parseDateStr(weekStartDate).toLocaleDateString("en-NG", {
                                            month: "long",
                                            day: "numeric",
                                            year: "numeric",
                                        })}`}
                                    </h3>
                                    <p className="text-sm text-gray-500">{weekStudentList.length} students</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                    {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((status) => (
                                        <span key={status} className="flex items-center gap-1">
                                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text}`}>
                                                {STATUS_ABBR[status]}
                                            </span>
                                            {status.charAt(0) + status.slice(1).toLowerCase()}
                                        </span>
                                    ))}
                                    <span className="flex items-center gap-1">
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-purple-100 text-[10px] font-bold text-purple-700">H</span>
                                        Holiday
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-400">—</span>
                                        Out of term
                                    </span>
                                </div>
                            </div>

                            {!hasInTermWeekDays ? (
                                <div className="p-12 text-center text-gray-500">
                                    No school days fall within the current term for this week.
                                </div>
                            ) : weekStudentList.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">No students found in this class.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[700px]">
                                        <thead className="border-b border-gray-200 bg-gray-50">
                                            <tr>
                                                <th className="w-10 px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">S/N</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Student</th>
                                                {weekDays.map((day) => (
                                                    <th
                                                        key={day.dateStr}
                                                        className="min-w-[80px] px-2 py-3 text-center text-xs font-medium uppercase text-gray-500"
                                                    >
                                                        <div className={day.isHoliday ? "text-purple-600" : day.isOutsideTerm ? "text-gray-400" : ""}>
                                                            {day.label}
                                                        </div>
                                                        {day.isHoliday && (
                                                            <div
                                                                className="mt-0.5 max-w-[80px] truncate text-[10px] font-normal text-purple-500"
                                                                title={day.holidayName}
                                                            >
                                                                {day.holidayName}
                                                            </div>
                                                        )}
                                                        {day.isOutsideTerm && !day.isHoliday && (
                                                            <div className="mt-0.5 text-[10px] font-normal text-gray-400">
                                                                Out of term
                                                            </div>
                                                        )}
                                                        {!day.isHoliday && !day.isOutsideTerm && (
                                                            <div className="mt-1 flex justify-center gap-1">
                                                                <button
                                                                    title="Mark all Present"
                                                                    onClick={() => handleMarkAllWeekDay(day.dateStr, "PRESENT")}
                                                                    className="flex h-4 w-4 items-center justify-center rounded bg-green-400 text-[9px] font-bold leading-none text-white hover:bg-green-500"
                                                                >
                                                                    P
                                                                </button>
                                                                <button
                                                                    title="Mark all Absent"
                                                                    onClick={() => handleMarkAllWeekDay(day.dateStr, "ABSENT")}
                                                                    className="flex h-4 w-4 items-center justify-center rounded bg-red-400 text-[9px] font-bold leading-none text-white hover:bg-red-500"
                                                                >
                                                                    A
                                                                </button>
                                                            </div>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {weekStudentList.map((student, index) => (
                                                <tr key={student.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <p className="whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {student.lastName} {student.firstName}
                                                        </p>
                                                        <p className="font-mono text-xs text-gray-500">{student.admissionNumber}</p>
                                                    </td>
                                                    {weekDays.map((day) => {
                                                        if (day.isHoliday) {
                                                            return (
                                                                <td key={day.dateStr} className="px-2 py-3 text-center">
                                                                    <span
                                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-xs font-bold text-purple-600"
                                                                        title={day.holidayName}
                                                                    >
                                                                        H
                                                                    </span>
                                                                </td>
                                                            );
                                                        }

                                                        if (day.isOutsideTerm) {
                                                            return (
                                                                <td key={day.dateStr} className="px-2 py-3 text-center">
                                                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-400">
                                                                        —
                                                                    </span>
                                                                </td>
                                                            );
                                                        }

                                                        const dayStudents = weekData[day.dateStr] || [];
                                                        const studentRecord = dayStudents.find((entry) => entry.id === student.id);
                                                        const status = studentRecord?.status ?? "PRESENT";
                                                        const colors = STATUS_COLORS[status];

                                                        return (
                                                            <td key={day.dateStr} className="px-2 py-3 text-center">
                                                                <button
                                                                    onClick={() => handleWeekCellClick(day.dateStr, student.id)}
                                                                    title={`Click to cycle: ${status}`}
                                                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all hover:opacity-80 active:scale-95 ${colors.bg} ${colors.text}`}
                                                                >
                                                                    {STATUS_ABBR[status]}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {weekStudentList.length > 0 && hasActiveWeekDays && (
                                <div className="border-t border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
                                    Click any cell to cycle status: Present → Absent → Late → Excused → Present
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="card p-12 text-center">
            <div className="flex flex-col items-center">
                <svg className="mb-4 h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
                <h3 className="mb-2 text-lg font-medium text-gray-900">Select a Class</h3>
                <p className="max-w-md text-gray-500">
                    Choose a class from the options above to start marking attendance.
                </p>
            </div>
        </div>
    );
}
