"use client";

import React from "react";
import { TranscriptData, TranscriptSession, TranscriptTermResult } from "./types";

interface TranscriptPreviewProps {
    data: TranscriptData;
}

const TranscriptPreview: React.FC<TranscriptPreviewProps> = ({ data }) => {
    const { student, school, sessions, cumulativeStats, gradingRules } = data;

    // Render a single term result table (used when no 3rd term)
    const renderTermTable = (term: TranscriptTermResult) => (
        <div key={term.termNumber} className="mb-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-1 mb-1.5">
                <span className="text-[10px] font-semibold text-gray-600">{term.termName} Result</span>
            </div>
            {term.subjects.length > 0 ? (
                <>
                    <table className="w-full border-collapse text-[10px]">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600">
                                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-medium">Subject</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-10">CA</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-10">Exam</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-12">Total</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-12">Grade</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-16">Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {term.subjects.map((sub, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                    <td className="border-b border-gray-100 px-2 py-1">{sub.subjectName}</td>
                                    <td className="border-b border-gray-100 px-1 py-1 text-center text-gray-600">{sub.ca || "-"}</td>
                                    <td className="border-b border-gray-100 px-1 py-1 text-center text-gray-600">{sub.exam || "-"}</td>
                                    <td className="border-b border-gray-100 px-1 py-1 text-center font-semibold">{sub.total}</td>
                                    <td className={`border-b border-gray-100 px-1 py-1 text-center font-semibold ${sub.grade === "F" || sub.grade === "F9" ? "text-red-500" : "text-gray-800"}`}>
                                        {sub.grade}
                                    </td>
                                    <td className={`border-b border-gray-100 px-1 py-1 text-center text-[9px] ${sub.remark?.toLowerCase() === "fail" ? "text-red-400" : "text-gray-500"}`}>
                                        {sub.remark}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex items-center gap-4 mt-1 px-1 text-[10px] text-gray-500">
                        <span><span className="font-medium text-gray-700">{term.summary.subjectsCount}</span> subjects</span>
                        <span className="text-gray-300">|</span>
                        <span>Average: <span className="font-semibold text-gray-800">{term.summary.average.toFixed(1)}%</span></span>
                    </div>
                </>
            ) : (
                <div className="py-2 text-center text-[10px] text-gray-400 italic">No scores</div>
            )}
        </div>
    );

    // Render end-of-session table (when 3rd term exists)
    const renderEndOfSessionTable = (session: TranscriptSession) => (
        <>
            <div className="flex justify-between items-center border-b-2 border-gray-700 pb-1 mb-1.5">
                <span className="text-[11px] font-bold text-gray-800">End of Session Result</span>
                <span className="text-[10px] text-gray-500">{session.className}</span>
            </div>
            {session.subjects.length > 0 ? (
                <>
                    <table className="w-full border-collapse text-[10px]">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600">
                                <th className="border-b border-gray-200 px-2 py-1.5 text-left font-medium">Subject</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-10">1ST</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-10">2ND</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-10">CA</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-10">Exam</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-12">Total</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-12">Grade</th>
                                <th className="border-b border-gray-200 px-1 py-1.5 text-center font-medium w-16">Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {session.subjects.map((sub, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                    <td className="border-b border-gray-100 px-2 py-1">{sub.subjectName}</td>
                                    <td className="border-b border-gray-100 px-1 py-1 text-center text-gray-600">{sub.cumulativeTotal1 || "-"}</td>
                                    <td className="border-b border-gray-100 px-1 py-1 text-center text-gray-600">{sub.cumulativeTotal2 || "-"}</td>
                                    <td className="border-b border-gray-100 px-1 py-1 text-center text-gray-600">{sub.ca || "-"}</td>
                                    <td className="border-b border-gray-100 px-1 py-1 text-center text-gray-600">{sub.exam || "-"}</td>
                                    <td className="border-b border-gray-100 px-1 py-1 text-center font-semibold">{sub.total}</td>
                                    <td className={`border-b border-gray-100 px-1 py-1 text-center font-semibold ${sub.grade === "F" || sub.grade === "F9" ? "text-red-500" : "text-gray-800"}`}>
                                        {sub.grade}
                                    </td>
                                    <td className={`border-b border-gray-100 px-1 py-1 text-center text-[9px] ${sub.remark?.toLowerCase() === "fail" ? "text-red-400" : "text-gray-500"}`}>
                                        {sub.remark}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex items-center gap-4 mt-1.5 px-1 text-[10px] text-gray-500">
                        <span><span className="font-medium text-gray-700">{session.summary.subjectsCount}</span> subjects</span>
                        <span className="text-gray-300">|</span>
                        <span>Average: <span className="font-semibold text-gray-800">{session.summary.average.toFixed(1)}%</span></span>
                        {session.attendance.totalSchoolDays > 0 && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span>Attendance: <span className="font-semibold text-gray-800">{session.attendance.daysPresent}/{session.attendance.totalSchoolDays}</span></span>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <div className="py-3 text-center text-[10px] text-gray-400 italic">No subject scores recorded</div>
            )}
        </>
    );

    const renderSession = (session: TranscriptSession) => (
        <div key={session.id} className="mb-6">
            {/* Session Header */}
            <div className="text-center mb-3">
                <span className="inline-block bg-gray-800 text-white text-[11px] font-semibold tracking-wider px-6 py-1.5 rounded-sm">
                    {session.name}
                </span>
                <span className="block text-[10px] text-gray-400 mt-1">{session.className}</span>
            </div>

            {session.hasEndOfSession ? (
                renderEndOfSessionTable(session)
            ) : (
                session.termResults && session.termResults.length > 0 ? (
                    session.termResults.map(term => renderTermTable(term))
                ) : (
                    <div className="py-3 text-center text-[10px] text-gray-400 italic">
                        No academic records for this session
                    </div>
                )
            )}
        </div>
    );

    return (
        <div className="bg-white px-10 py-8 max-w-4xl mx-auto text-gray-900" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            {/* School Header */}
            <div className="text-center mb-6">
                {school.logoUrl && (
                    <img src={school.logoUrl} alt="" className="w-16 h-16 object-contain mx-auto mb-2" />
                )}
                <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">{school.name}</h1>
                {school.address && <p className="text-[11px] text-gray-500 mt-0.5">{school.address}</p>}
                {school.motto && <p className="text-[10px] italic text-gray-400 mt-0.5">{school.motto}</p>}
                {(school.email || school.phone) && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                        {[school.email, school.phone].filter(Boolean).join("  ·  ")}
                    </p>
                )}
                <div className="w-16 h-0.5 bg-gray-800 mx-auto mt-3"></div>
            </div>

            <h2 className="text-center text-sm font-bold tracking-[0.2em] text-gray-700 uppercase mb-5">
                Academic Transcript
            </h2>

            {/* Student Info */}
            <div className="flex gap-5 mb-7 pb-5 border-b border-gray-200">
                {student.photoUrl && (
                    <div className="shrink-0">
                        <img src={student.photoUrl} alt="" className="w-[80px] h-[96px] object-cover rounded border border-gray-200" />
                    </div>
                )}
                <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-1.5 text-[11px] content-start">
                    <div>
                        <span className="text-gray-400 text-[9px] uppercase tracking-wider">Full Name</span>
                        <p className="font-semibold text-gray-900">{student.lastName} {student.firstName} {student.otherNames || ""}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 text-[9px] uppercase tracking-wider">Admission No.</span>
                        <p className="font-semibold text-gray-900">{student.admissionNumber}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 text-[9px] uppercase tracking-wider">Gender</span>
                        <p className="text-gray-700">{student.gender}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 text-[9px] uppercase tracking-wider">Date of Birth</span>
                        <p className="text-gray-700">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 text-[9px] uppercase tracking-wider">Admission Date</span>
                        <p className="text-gray-700">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "N/A"}</p>
                    </div>
                    {student.stateOfOrigin && (
                        <div>
                            <span className="text-gray-400 text-[9px] uppercase tracking-wider">State of Origin</span>
                            <p className="text-gray-700">{student.stateOfOrigin}</p>
                        </div>
                    )}
                    <div>
                        <span className="text-gray-400 text-[9px] uppercase tracking-wider">Current Class</span>
                        <p className="font-semibold text-gray-900">{student.currentClassName || "Unassigned"}</p>
                    </div>
                </div>
            </div>

            {/* Academic Records */}
            {sessions.length > 0 ? (
                sessions.map(session => renderSession(session))
            ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                    No academic records found for this student.
                </div>
            )}

            {/* Cumulative Performance Summary */}
            {cumulativeStats.totalSessions > 0 && (
                <div className="mt-6 mb-6 border border-gray-200 rounded">
                    <div className="bg-gray-800 text-white text-center py-2 text-[11px] font-semibold tracking-wider rounded-t">
                        Cumulative Performance
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-gray-100">
                        {[
                            { label: "Sessions", value: cumulativeStats.totalSessions },
                            { label: "Overall Average", value: `${cumulativeStats.overallAverage.toFixed(1)}%` },
                            { label: "Subject Entries", value: cumulativeStats.totalSubjectEntries },
                        ].map((item, i) => (
                            <div key={i} className="py-3 text-center">
                                <div className="text-[9px] text-gray-400 uppercase tracking-wider">{item.label}</div>
                                <div className="text-base font-bold text-gray-800 mt-0.5">{item.value}</div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                        <div className="py-2.5 text-center">
                            <div className="text-[9px] text-gray-400 uppercase tracking-wider">Best Performance</div>
                            <div className="text-sm font-bold text-green-600 mt-0.5">{cumulativeStats.highestSessionAverage.toFixed(1)}%</div>
                            <div className="text-[9px] text-gray-400">{cumulativeStats.highestSessionLabel}</div>
                        </div>
                        <div className="py-2.5 text-center">
                            <div className="text-[9px] text-gray-400 uppercase tracking-wider">Lowest Performance</div>
                            <div className="text-sm font-bold text-gray-500 mt-0.5">{cumulativeStats.lowestSessionAverage.toFixed(1)}%</div>
                            <div className="text-[9px] text-gray-400">{cumulativeStats.lowestSessionLabel}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grading Key */}
            {gradingRules.length > 0 && (
                <div className="text-center text-[9px] text-gray-400 mb-6">
                    <span className="font-medium text-gray-500">Grading: </span>
                    {gradingRules.map((r, i) => (
                        <span key={i}>
                            {i > 0 && <span className="mx-1">·</span>}
                            <span className="font-medium text-gray-600">{r.grade}</span> ({r.minScore}-{r.maxScore})
                        </span>
                    ))}
                </div>
            )}

            {/* Signature Footer */}
            <div className="flex justify-between items-end mt-10 pt-6 border-t border-gray-200 px-6">
                <div className="text-center">
                    <div className="w-36 border-b border-gray-400 mb-1"></div>
                    <span className="text-[10px] text-gray-500">Principal&apos;s Signature</span>
                </div>
                <div className="text-center">
                    {school.stampUrl ? (
                        <img src={school.stampUrl} alt="" className="w-14 h-14 object-contain mx-auto opacity-60" />
                    ) : (
                        <div className="w-14 h-14 border border-dashed border-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-[8px] text-gray-300">STAMP</span>
                        </div>
                    )}
                </div>
                <div className="text-center">
                    <div className="w-36 border-b border-gray-400 mb-1"></div>
                    <span className="text-[10px] text-gray-500">Date</span>
                </div>
            </div>

            <p className="text-center text-[8px] text-gray-300 mt-6">
                Generated {new Date(data.generatedAt).toLocaleDateString()} · Computer-generated document
            </p>
        </div>
    );
};

export default TranscriptPreview;
