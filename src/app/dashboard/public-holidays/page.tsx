"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { showSuccessMessage } from "@/lib/successMessage";

interface PublicHoliday {
    id: string;
    name: string;
    date: string;
    description?: string;
    createdAt: string;
}

interface CurrentTermInfo {
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

interface MidtermBreakDay {
    dateStr: string;
    label: string;
    isOutsideTerm: boolean;
    isExisting: boolean;
}

const SCHOOL_TIMEZONE = "Africa/Lagos";

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

function getWeekDays(weekStartDate: string): MidtermBreakDay[] {
    const monday = parseDateStr(weekStartDate);
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];

    return dayNames.map((dayName, index) => {
        const currentDate = addDays(monday, index);

        return {
            dateStr: toDateStr(currentDate),
            label: `${dayName} ${currentDate.getDate()}`,
            isOutsideTerm: false,
            isExisting: false,
        };
    });
}

export default function PublicHolidaysPage() {
    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingTerm, setIsLoadingTerm] = useState(true);
    const [currentTermInfo, setCurrentTermInfo] = useState<CurrentTermInfo | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingBreak, setIsAddingBreak] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", date: "", description: "" });
    const [formError, setFormError] = useState("");
    const [breakError, setBreakError] = useState("");
    const [midtermBreakForm, setMidtermBreakForm] = useState({
        name: "Midterm Break",
        weekStartDate: "",
        description: "",
        selectedDates: [] as string[],
    });

    const fetchHolidays = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/public-holidays");
            if (res.ok) {
                setHolidays(await res.json());
            }
        } catch {
            toast.error("Failed to load school closure days");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCurrentTermInfo = async () => {
        setIsLoadingTerm(true);
        try {
            const res = await fetch("/api/sessions/current", { cache: "no-store" });
            if (!res.ok) {
                setCurrentTermInfo(null);
                return;
            }

            const data = await res.json();
            setCurrentTermInfo({
                termId: data.termId,
                termName: data.termName,
                termNumber: data.termNumber,
                startDate: data.startDate,
                endDate: data.endDate,
                totalWeeks: data.totalWeeks,
            });
        } catch {
            toast.error("Failed to load the current term");
            setCurrentTermInfo(null);
        } finally {
            setIsLoadingTerm(false);
        }
    };

    useEffect(() => {
        void fetchHolidays();
        void fetchCurrentTermInfo();
    }, []);

    const weekOptions = useMemo(() => buildWeekOptions(currentTermInfo), [currentTermInfo]);
    const selectedWeekOption = useMemo(
        () => weekOptions.find((option) => option.value === midtermBreakForm.weekStartDate) ?? null,
        [midtermBreakForm.weekStartDate, weekOptions]
    );
    const holidayDateSet = useMemo(
        () => new Set(holidays.map((holiday) => toSchoolDateStr(holiday.date))),
        [holidays]
    );

    useEffect(() => {
        if (!weekOptions.length) return;

        const hasSelectedWeek = weekOptions.some((option) => option.value === midtermBreakForm.weekStartDate);
        if (hasSelectedWeek) return;

        setMidtermBreakForm((prev) => ({
            ...prev,
            weekStartDate: weekOptions[0].value,
            selectedDates: [],
        }));
    }, [midtermBreakForm.weekStartDate, weekOptions]);

    const selectedBreakWeekDays = useMemo(() => {
        if (!midtermBreakForm.weekStartDate) return [];

        const termStartDate = currentTermInfo?.startDate ?? null;
        const termEndDate = currentTermInfo?.endDate ?? null;

        return getWeekDays(midtermBreakForm.weekStartDate).map((day) => ({
            ...day,
            isOutsideTerm: !!(
                (termStartDate && day.dateStr < termStartDate) ||
                (termEndDate && day.dateStr > termEndDate)
            ),
            isExisting: holidayDateSet.has(day.dateStr),
        }));
    }, [currentTermInfo?.endDate, currentTermInfo?.startDate, holidayDateSet, midtermBreakForm.weekStartDate]);

    useEffect(() => {
        const validDateSet = new Set(
            selectedBreakWeekDays
                .filter((day) => !day.isOutsideTerm && !day.isExisting)
                .map((day) => day.dateStr)
        );

        setMidtermBreakForm((prev) => {
            const nextSelectedDates = prev.selectedDates.filter((dateStr) => validDateSet.has(dateStr));
            if (nextSelectedDates.length === prev.selectedDates.length) return prev;
            return { ...prev, selectedDates: nextSelectedDates };
        });
    }, [selectedBreakWeekDays]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (!form.name.trim() || !form.date) {
            setFormError("Name and date are required.");
            return;
        }

        setIsAdding(true);

        try {
            const res = await fetch("/api/public-holidays", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                showSuccessMessage("School closure day added!", { title: "Added!" });
                setForm({ name: "", date: "", description: "" });
                setShowForm(false);
                await fetchHolidays();
            } else {
                const data = await res.json();
                setFormError(data.error || "Failed to add holiday");
            }
        } catch {
            setFormError("Connection error");
        } finally {
            setIsAdding(false);
        }
    };

    const handleAddMidtermBreak = async (e: React.FormEvent) => {
        e.preventDefault();
        setBreakError("");

        if (!midtermBreakForm.name.trim() || !midtermBreakForm.weekStartDate) {
            setBreakError("Break name and week are required.");
            return;
        }

        const validSelectedDates = selectedBreakWeekDays
            .filter((day) => midtermBreakForm.selectedDates.includes(day.dateStr) && !day.isOutsideTerm && !day.isExisting)
            .map((day) => day.dateStr);

        if (!validSelectedDates.length) {
            setBreakError("Select at least one valid weekday in the chosen week.");
            return;
        }

        setIsAddingBreak(true);

        try {
            const res = await fetch("/api/public-holidays", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    holidays: validSelectedDates.map((dateStr) => ({
                        name: midtermBreakForm.name.trim(),
                        date: dateStr,
                        description: midtermBreakForm.description.trim()
                            ? `${selectedWeekOption?.label ?? "Selected week"} - ${midtermBreakForm.description.trim()}`
                            : selectedWeekOption?.label ?? undefined,
                    })),
                }),
            });
            const data = await res.json();

            if (res.ok) {
                const createdCount = Number(data.createdCount) || validSelectedDates.length;
                const skippedCount = Array.isArray(data.skippedDates) ? data.skippedDates.length : 0;
                const createdLabel = `${createdCount} break day${createdCount === 1 ? "" : "s"} added`;
                const skippedLabel = skippedCount > 0
                    ? ` ${skippedCount} date${skippedCount === 1 ? " was" : "s were"} already present.`
                    : "";

                showSuccessMessage(`${createdLabel}.${skippedLabel}`.trim(), { title: "Midterm Break Saved!" });
                setMidtermBreakForm((prev) => ({
                    ...prev,
                    description: "",
                    selectedDates: [],
                }));
                await fetchHolidays();
            } else {
                setBreakError(data.error || "Failed to add midterm break days");
            }
        } catch {
            setBreakError("Connection error");
        } finally {
            setIsAddingBreak(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this school closure day?")) return;

        setDeletingId(id);

        try {
            const res = await fetch(`/api/public-holidays/${id}`, { method: "DELETE" });
            if (res.ok) {
                setHolidays((prev) => prev.filter((holiday) => holiday.id !== id));
                toast.success("School closure day removed");
            } else {
                toast.error("Failed to remove school closure day");
            }
        } catch {
            toast.error("Connection error");
        } finally {
            setDeletingId(null);
        }
    };

    const toggleBreakDate = (dateStr: string) => {
        setMidtermBreakForm((prev) => ({
            ...prev,
            selectedDates: prev.selectedDates.includes(dateStr)
                ? prev.selectedDates.filter((selectedDate) => selectedDate !== dateStr)
                : [...prev.selectedDates, dateStr],
        }));
    };

    const upcoming = holidays.filter((holiday) => new Date(holiday.date) >= new Date(new Date().toDateString()));
    const past = holidays.filter((holiday) => new Date(holiday.date) < new Date(new Date().toDateString()));
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Public Holidays & Break Days</h1>
                    <p className="mt-1 text-gray-500">
                        Manage school closure days. These dates are excluded from the count of days school opens.
                    </p>
                </div>
                <button onClick={() => setShowForm((value) => !value)} className="btn-primary">
                    {showForm ? "Cancel" : "+ Add Holiday"}
                </button>
            </div>

            {showForm && (
                <div className="card p-6">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">Add Single Holiday</h2>
                    <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Holiday Name *</label>
                            <input
                                type="text"
                                placeholder="e.g. Independence Day"
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Description (optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. National holiday"
                                value={form.description}
                                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                className="input w-full"
                            />
                        </div>
                        {formError && (
                            <div className="sm:col-span-3">
                                <p className="text-sm text-red-600">{formError}</p>
                            </div>
                        )}
                        <div className="sm:col-span-3 flex gap-3">
                            <button type="submit" disabled={isAdding} className="btn-primary">
                                {isAdding ? "Adding..." : "Add Holiday"}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card p-6">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Set Midterm Break Days</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Choose a current-term week, then select the weekdays that should count as midterm break.
                        </p>
                    </div>
                    {termRangeLabel && (
                        <p className="text-sm text-gray-500">
                            Current term: <span className="font-medium text-gray-700">{termRangeLabel}</span>
                        </p>
                    )}
                </div>

                <form onSubmit={handleAddMidtermBreak} className="mt-6 space-y-5">
                    <div className="grid gap-4 lg:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Break Name *</label>
                            <input
                                type="text"
                                value={midtermBreakForm.name}
                                onChange={(e) => setMidtermBreakForm((prev) => ({ ...prev, name: e.target.value }))}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Term Week *</label>
                            <select
                                value={midtermBreakForm.weekStartDate}
                                onChange={(e) => setMidtermBreakForm((prev) => ({
                                    ...prev,
                                    weekStartDate: e.target.value,
                                    selectedDates: [],
                                }))}
                                className="input w-full"
                                disabled={isLoadingTerm || !weekOptions.length}
                            >
                                <option value="">
                                    {isLoadingTerm
                                        ? "Loading current term..."
                                        : weekOptions.length
                                            ? "Select a week"
                                            : "No weeks available"}
                                </option>
                                {weekOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Description (optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. Internal midterm break"
                                value={midtermBreakForm.description}
                                onChange={(e) => setMidtermBreakForm((prev) => ({ ...prev, description: e.target.value }))}
                                className="input w-full"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Select Break Days</p>
                                <p className="text-xs text-gray-500">
                                    Selected week: {selectedWeekOption?.label ?? "None"}
                                </p>
                            </div>
                            <p className="text-xs text-gray-500">
                                {midtermBreakForm.selectedDates.length} day{midtermBreakForm.selectedDates.length === 1 ? "" : "s"} selected
                            </p>
                        </div>

                        {!currentTermInfo ? (
                            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                                No current term is active, so midterm break days cannot be scheduled yet.
                            </div>
                        ) : !midtermBreakForm.weekStartDate ? (
                            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                                Choose a term week to select break days.
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                {selectedBreakWeekDays.map((day) => {
                                    const isSelected = midtermBreakForm.selectedDates.includes(day.dateStr);
                                    const isDisabled = day.isOutsideTerm || day.isExisting;

                                    return (
                                        <button
                                            key={day.dateStr}
                                            type="button"
                                            onClick={() => !isDisabled && toggleBreakDate(day.dateStr)}
                                            disabled={isDisabled}
                                            className={`rounded-xl border px-4 py-3 text-left transition-all ${
                                                isSelected
                                                    ? "border-primary-500 bg-primary-50 shadow-sm"
                                                    : day.isExisting
                                                        ? "cursor-not-allowed border-purple-200 bg-purple-50 text-purple-700"
                                                        : day.isOutsideTerm
                                                            ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                                                            : "border-gray-200 bg-white hover:border-primary-200 hover:bg-gray-50"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold text-gray-900">{day.label}</p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {day.isExisting
                                                    ? "Already added"
                                                    : day.isOutsideTerm
                                                        ? "Outside current term"
                                                        : isSelected
                                                            ? "Selected for break"
                                                            : "Available"}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {breakError && <p className="text-sm text-red-600">{breakError}</p>}

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={isAddingBreak || !midtermBreakForm.weekStartDate || !selectedBreakWeekDays.length}
                            className="btn-primary"
                        >
                            {isAddingBreak ? "Saving..." : "Add Break Days"}
                        </button>
                        <p className="text-sm text-gray-500">
                            Break days appear as <span className="font-semibold">H</span> in attendance and are excluded from school-open counts.
                        </p>
                    </div>
                </form>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-700">
                    Public holidays and midterm break days are automatically excluded from the total number of days school opens. They appear as <span className="font-semibold">H</span> in the weekly attendance view and are not counted in attendance statistics.
                </p>
            </div>

            {isLoading ? (
                <div className="card p-12 text-center text-gray-500">Loading school closure days...</div>
            ) : holidays.length === 0 ? (
                <div className="card p-12 text-center">
                    <svg className="mx-auto mb-3 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500">No school closure days added yet.</p>
                    <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
                        Add First Holiday
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {upcoming.length > 0 && (
                        <HolidaySection
                            title="Upcoming School Closure Days"
                            holidays={upcoming}
                            deletingId={deletingId}
                            onDelete={handleDelete}
                        />
                    )}
                    {past.length > 0 && (
                        <HolidaySection
                            title="Past School Closure Days"
                            holidays={past}
                            deletingId={deletingId}
                            onDelete={handleDelete}
                            muted
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function HolidaySection({
    title,
    holidays,
    deletingId,
    onDelete,
    muted = false,
}: {
    title: string;
    holidays: PublicHoliday[];
    deletingId: string | null;
    onDelete: (id: string) => void;
    muted?: boolean;
}) {
    return (
        <div className="card overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 p-4">
                <h2 className="font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500">{holidays.length} day{holidays.length !== 1 ? "s" : ""}</p>
            </div>
            <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Closure Day</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {holidays.map((holiday) => (
                        <tr key={holiday.id} className={`${muted ? "opacity-60" : ""} hover:bg-gray-50`}>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-xs font-bold text-purple-700">
                                        H
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">{holiday.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                                {new Date(holiday.date).toLocaleDateString("en-NG", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{holiday.description || "-"}</td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => onDelete(holiday.id)}
                                    disabled={deletingId === holiday.id}
                                    className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                                >
                                    {deletingId === holiday.id ? "Removing..." : "Remove"}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
