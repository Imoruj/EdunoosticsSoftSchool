"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, Users, Check, Search, X } from "lucide-react";

export interface TargetAudienceSelectorProps {
    subjectId: string;
    classArmIds: string[];
    assignedTo?: string[];
    onSubjectChange: (id: string) => void;
    onSubjectNameChange?: (name: string) => void;
    onClassArmsChange: (ids: string[]) => void;
    onAssignedToChange?: (studentIds: string[]) => void;
    onClassChange?: (classId: string) => void;
    availableTerms?: { termNumber: number; termName: string }[];
    selectedTermNumber?: number | null;
    onTermChange?: (termNumber: number | null) => void;
    /** Render in compact mode for narrow panels (e.g. studio sidebar) */
    compact?: boolean;
}

interface TeacherClasses {
    id: string;
    name: string;
    arms: { id: string; armName: string }[];
}

interface TeacherSubjects {
    id: string;
    name: string;
    code: string;
    classArmIds: string[];
}

interface TargetStudent {
    id: string;
    name: string;
    admissionNumber: string;
    classArmId: string;
}

export function TargetAudienceSelector({
    subjectId,
    classArmIds,
    assignedTo = [],
    onSubjectChange,
    onSubjectNameChange,
    onClassArmsChange,
    onAssignedToChange,
    onClassChange,
    availableTerms = [],
    selectedTermNumber = null,
    onTermChange,
    compact = false,
}: TargetAudienceSelectorProps) {
  const c = compact ? {
    root:        'space-y-3',
    label:       'block text-[10px] font-medium text-gray-700 mb-1',
    sectionLbl:  'block text-[10px] font-semibold text-gray-800 mb-1.5',
    select:      'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-[11px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white',
    innerCard:   'space-y-2 bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/60',
    chip:        'px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors',
    armCard:     (sel: boolean) => `group relative flex items-center justify-between p-2 rounded-lg border transition-all duration-200 ${sel ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-500/10' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`,
    armName:     (sel: boolean) => `text-[11px] font-bold transition-colors ${sel ? 'text-blue-900' : 'text-slate-700'}`,
    armSubText:  'text-[10px] text-blue-500 flex items-center gap-1 mt-0.5',
    studentsBtn: 'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors',
    noStudents:  'text-[10px] text-slate-400 italic px-1',
    ptSection:   'pt-1',
  } : {
    root:        'space-y-6',
    label:       'block text-sm font-medium text-gray-700 mb-1',
    sectionLbl:  'block text-sm font-semibold text-gray-800 mb-3',
    select:      'w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all bg-white',
    innerCard:   'space-y-4 bg-slate-50/80 rounded-2xl p-5 border border-slate-200/60 shadow-inner',
    chip:        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
    armCard:     (sel: boolean) => `group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${sel ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-500/10' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`,
    armName:     (sel: boolean) => `text-sm font-bold transition-colors ${sel ? 'text-blue-900' : 'text-slate-700'}`,
    armSubText:  'text-xs text-blue-500 flex items-center gap-1 mt-0.5',
    studentsBtn: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors',
    noStudents:  'text-xs text-slate-400 italic px-2',
    ptSection:   'pt-2',
  };
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [error, setError] = useState("");
    const [classes, setClasses] = useState<TeacherClasses[]>([]);
    const [subjects, setSubjects] = useState<TeacherSubjects[]>([]);
    const [termId, setTermId] = useState<string>("");
    const [activeClassName, setActiveClassName] = useState<string | null>(null);

    // Additional state for Specific Student targeting
    const [students, setStudents] = useState<TargetStudent[]>([]);
    const [activeModalArmId, setActiveModalArmId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // 1. Fetch Teacher subjects and classes initially
    useEffect(() => {
        async function fetchAssignments() {
            try {
                const [assignmentsRes, currentTermRes] = await Promise.all([
                    fetch("/api/teacher/assignments"),
                    fetch("/api/sessions/current"),
                ]);

                if (!assignmentsRes.ok) throw new Error("Failed to fetch teaching assignments.");

                const assignmentsData = await assignmentsRes.json();
                setClasses(assignmentsData.classes || []);
                setSubjects(assignmentsData.subjects || []);

                if (currentTermRes.ok) {
                    const currentData = await currentTermRes.json() as { termId?: string };
                    if (currentData.termId) {
                        setTermId(currentData.termId);
                    }
                }
            } catch (err: any) {
                setError(err.message || "An error occurred fetching targeted subjects/classes.");
            } finally {
                setLoading(false);
            }
        }
        fetchAssignments();
    }, []);

    // 2. Fetch students whenever selected class arm IDs OR subject changes
    useEffect(() => {
        async function fetchStudents() {
            if (classArmIds.length === 0 || !subjectId) {
                setStudents([]);
                return;
            }
            setStudentsLoading(true);
            try {
                const params = new URLSearchParams({
                    classArmIds: classArmIds.join(","),
                    subjectId,
                });
                if (termId) {
                    params.set("termId", termId);
                }

                const res = await fetch(`/api/teacher/students-by-arms?${params.toString()}`);
                if (!res.ok) throw new Error("Failed to fetch students");
                const data = await res.json();
                setStudents(data.students || []);
            } catch (err) {
                console.error(err);
            } finally {
                setStudentsLoading(false);
            }
        }
        fetchStudents();
    }, [classArmIds, subjectId, termId]);

    const handleClassArmToggle = (armId: string) => {
        const isCurrentlySelected = classArmIds.includes(armId);

        // Compute new arm selection
        const newArmSelection = isCurrentlySelected
            ? classArmIds.filter(id => id !== armId)
            : [...classArmIds, armId];

        onClassArmsChange(newArmSelection);

        // Scrub students if an arm is deselected
        if (isCurrentlySelected && onAssignedToChange) {
            const studentsInArm = students.filter(s => s.classArmId === armId).map(s => s.id);
            const remainingAssigned = assignedTo.filter(id => !studentsInArm.includes(id));
            onAssignedToChange(remainingAssigned);
        }
    };

    // Auto-select students when they are loaded for newly checked arms
    useEffect(() => {
        if (!onAssignedToChange || students.length === 0) return;

        let needsUpdate = false;
        let newAssignedTo = [...assignedTo];

        classArmIds.forEach(armId => {
            const armStudents = students.filter(s => s.classArmId === armId).map(s => s.id);
            const hasAnyAssigned = armStudents.some(id => newAssignedTo.includes(id));
            if (!hasAnyAssigned && armStudents.length > 0) {
                // Auto-fill
                newAssignedTo = [...newAssignedTo, ...armStudents];
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            onAssignedToChange(newAssignedTo);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [students, classArmIds]);

    const handleStudentToggle = (studentId: string) => {
        if (!onAssignedToChange) return;

        if (assignedTo.includes(studentId)) {
            onAssignedToChange(assignedTo.filter(id => id !== studentId));
        } else {
            onAssignedToChange([...assignedTo, studentId]);
        }
    };

    const handleSelectAllInModal = (modalStudents: TargetStudent[]) => {
        if (!onAssignedToChange) return;

        const modalStudentIds = modalStudents.map(s => s.id);
        const allSelected = modalStudentIds.every(id => assignedTo.includes(id));

        if (allSelected) {
            // Deselect all taking this subject in this arm
            onAssignedToChange(assignedTo.filter(id => !modalStudentIds.includes(id)));
        } else {
            // Select all taking this subject in this arm
            const newAssignedTo = new Set(assignedTo);
            modalStudentIds.forEach(id => newAssignedTo.add(id));
            onAssignedToChange(Array.from(newAssignedTo));
        }
    };

    const selectedSubject = useMemo(
        () => subjects.find(s => s.id === subjectId),
        [subjects, subjectId]
    );
    const applicableArmsByClass = useMemo<Record<string, { id: string; armName: string; className: string }[]>>(() => {
        const grouped: Record<string, { id: string; armName: string; className: string }[]> = {};
        if (!selectedSubject) {
            return grouped;
        }

        classes.forEach(c => {
            const allowedArmsForThisClass = c.arms.filter(a => selectedSubject.classArmIds.includes(a.id));
            if (allowedArmsForThisClass.length > 0) {
                grouped[c.name] = allowedArmsForThisClass.map(a => ({ ...a, className: c.name }));
            }
        });

        return grouped;
    }, [classes, selectedSubject]);
    const classNames = useMemo(() => Object.keys(applicableArmsByClass), [applicableArmsByClass]);

    // Keep a valid active class selected whenever subject/class options change
    useEffect(() => {
        if (classNames.length === 0) {
            if (activeClassName !== null) setActiveClassName(null);
            return;
        }

        if (!activeClassName || !classNames.includes(activeClassName)) {
            setActiveClassName(classNames[0]);
        }
    }, [activeClassName, classNames, subjectId]);

    // Notify parent whenever the active class resolves
    useEffect(() => {
        if (!activeClassName || !onClassChange) return;
        const classObj = classes.find((c) => c.name === activeClassName);
        if (classObj) onClassChange(classObj.id);
    }, [activeClassName]); // eslint-disable-line react-hooks/exhaustive-deps

    const visibleArms = activeClassName
        ? (applicableArmsByClass[activeClassName] || [])
        : [];

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading target selection...
            </div>
        );
    }

    if (error) {
        return <div className="text-sm text-red-500 py-4">{error}</div>;
    }

    // Modal helpers
    const activeModalArm = activeModalArmId
        ? Object.values(applicableArmsByClass).flat().find(a => a.id === activeModalArmId)
        : null;

    const modalStudentsRaw = activeModalArmId
        ? students.filter(s => s.classArmId === activeModalArmId)
        : [];

    const modalStudents = modalStudentsRaw.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isAllModalStudentsSelected = modalStudentsRaw.length > 0 && modalStudentsRaw.every(s => assignedTo.includes(s.id));

    return (
        <div className={c.root}>
            <div>
                <label className={c.label}>
                    Subject <span className="text-red-500">*</span>
                </label>
                <select
                    value={subjectId}
                    onChange={(e) => {
                        const id = e.target.value;
                        onSubjectChange(id);
                        if (onSubjectNameChange) {
                            const s = subjects.find((sub) => sub.id === id);
                            onSubjectNameChange(s ? s.name : '');
                        }
                        onClassArmsChange([]);
                        if (onAssignedToChange) onAssignedToChange([]);
                    }}
                    className={c.select}
                >
                    <option value="" disabled>-- Select Subject --</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                    {subjects.length === 0 && <option value="" disabled>No subjects assigned</option>}
                </select>
            </div>

            {availableTerms.length > 0 && onTermChange && (
                <div>
                    <label className={c.label}>Term</label>
                    <div className="flex flex-wrap gap-1.5">
                        {availableTerms.map(({ termNumber, termName }) => {
                            const isActive = selectedTermNumber === termNumber;
                            return (
                                <button
                                    key={termNumber}
                                    type="button"
                                    onClick={() => onTermChange(isActive ? null : termNumber)}
                                    className={`${c.chip} ${isActive ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:border-blue-300 hover:text-blue-700"}`}
                                >
                                    {termName}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {subjectId && classNames.length > 0 && (
                <div className={c.ptSection}>
                    <label className={c.sectionLbl}>
                        Assign to Class Arms & Students <span className="text-red-500">*</span>
                    </label>

                    <div className={c.innerCard}>
                        <div className="flex flex-wrap gap-1.5">
                            {classNames.map((className) => {
                                const isActive = activeClassName === className;
                                return (
                                    <button
                                        key={className}
                                        type="button"
                                        onClick={() => {
                                            setActiveClassName(className);
                                            const classObj = classes.find((cl) => cl.name === className);
                                            if (classObj && onClassChange) onClassChange(classObj.id);
                                        }}
                                        className={`${c.chip} ${isActive ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:border-blue-300 hover:text-blue-700"}`}
                                    >
                                        {className}
                                    </button>
                                );
                            })}
                        </div>

                        {activeClassName && (
                            <div className="grid gap-2">
                                {visibleArms.map(arm => {
                                    const isSelected = classArmIds.includes(arm.id);
                                    const armStudents = students.filter(s => s.classArmId === arm.id);
                                    const studentCountLabel = armStudents.length === 1 ? "Student" : "Students";

                                    return (
                                        <div key={arm.id} className={c.armCard(isSelected)}>
                                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleClassArmToggle(arm.id)}
                                                        className="peer w-4 h-4 appearance-none rounded border-2 border-slate-300 checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all cursor-pointer"
                                                    />
                                                    <Check className="w-3 h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={c.armName(isSelected)}>{arm.armName}</span>
                                                    {isSelected && studentsLoading && (
                                                        <span className={c.armSubText}>
                                                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Fetching students…
                                                        </span>
                                                    )}
                                                </div>
                                            </label>

                                            {isSelected && !studentsLoading && armStudents.length > 0 && (
                                                <button
                                                    onClick={(e) => { e.preventDefault(); setActiveModalArmId(arm.id); setSearchQuery(""); }}
                                                    className={c.studentsBtn}
                                                >
                                                    <Users className="w-3 h-3" />
                                                    <span>{armStudents.length} {studentCountLabel}</span>
                                                </button>
                                            )}

                                            {isSelected && !studentsLoading && armStudents.length === 0 && (
                                                <span className={c.noStudents}>No students enrolled</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {subjectId && classNames.length === 0 && (
                <div className="text-sm text-orange-600 bg-orange-50 p-4 rounded-xl border border-orange-200 flex items-start gap-3">
                    <div className="p-1 bg-orange-100 rounded-lg">
                        <Loader2 className="w-4 h-4 text-orange-600" />
                    </div>
                    <span>No class arms are assigned to this subject. Please check your assigned subjects and classes configuration.</span>
                </div>
            )}

            {/* FULL SCREEN MODAL PORTAL FOR STUDENT SELECTION */}
            {activeModalArmId && activeModalArm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setActiveModalArmId(null)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200/60 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Target Specific Students
                                </h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {activeModalArm.className} {activeModalArm.armName} - {selectedSubject?.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveModalArmId(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search & Actions Bar */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or admission number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => handleSelectAllInModal(modalStudentsRaw)}
                                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${isAllModalStudentsSelected
                                        ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                    }`}
                            >
                                {isAllModalStudentsSelected ? "Deselect All Enrolled" : "Select All Enrolled"}
                            </button>
                        </div>

                        {/* Students List */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/30">
                            {modalStudents.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {modalStudents.map(student => {
                                        const isSelected = assignedTo.includes(student.id);
                                        // Get initials for avatar
                                        const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                                        return (
                                            <label
                                                key={student.id}
                                                className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected
                                                        ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-500/10'
                                                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleStudentToggle(student.id)}
                                                        className="peer w-5 h-5 appearance-none rounded border-2 border-slate-300 checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all cursor-pointer"
                                                    />
                                                    <Check className="w-3.5 h-3.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                                                </div>

                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-xs font-bold shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                    {initials}
                                                </div>

                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                                                        {student.name}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-mono truncate">
                                                        {student.admissionNumber}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                        <Search className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="font-medium text-slate-700">No students found</p>
                                    <p className="text-sm">Try adjusting your search query.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
                            <button
                                onClick={() => setActiveModalArmId(null)}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
