import React from "react";
import { ReportCardData } from "./types";
import { WebDynamicReportTemplate } from "./templates/WebDynamicReportTemplate";
import { formatPublishedDate } from "./formatPublishedDate";
import { formatScore, formatScoreOrBlank } from "./scoreFormatting";
import { formatStudentFullName } from "./formatStudentFullName";

import StandardReportPreview from "./previews/StandardReportPreview";

interface ReportCardPreviewProps {
    data: ReportCardData;
}

const ProfessionalPreview: React.FC<{ data: ReportCardData }> = ({ data }) => {
    const isHalfTerm = data.reportType === "halfTerm";
    const publishedDateLabel = formatPublishedDate(data.comments.publishedAt);
    const studentFullName = formatStudentFullName(data.student);

    return (
        <div className="bg-white p-6 max-w-5xl mx-auto shadow-sm border-2 border-emerald-600">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-2 border-emerald-600 p-2">
                <div className="w-20 h-20 bg-gray-100 flex items-center justify-center">
                    {data.school.logoUrl ? (
                        <img src={data.school.logoUrl} className="w-full h-full object-contain" />
                    ) : (
                        <span className="text-[10px]">LOGO</span>
                    )}
                </div>
                <div className="flex-1 text-center">
                    <h1 className="text-2xl font-black text-black uppercase tracking-tighter">{data.school.name}</h1>
                    <p className="text-[10px] mt-1">{data.school.address}</p>
                    <p className="text-[10px] italic font-serif mt-1">Motto: {data.school.motto || "His Grace is Sufficient"}</p>
                    <p className="text-[10px]">{data.school.email}</p>
                </div>
                <div className="w-20" />
            </div>

            <div className="border border-black bg-white p-1 text-center mb-4">
                <h2 className="text-lg font-bold tracking-widest">{data.term.sessionName} {data.term.name.toUpperCase()} {isHalfTerm ? "HALF TERM REPORT" : "REPORT SHEET"}</h2>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="col-span-1 border border-black">
                    <div className="bg-emerald-50 border-b border-black p-1 text-[10px] font-bold text-center uppercase">STUDENT PERSONAL DATA</div>
                    <div className="p-1 space-y-1 text-[10px]">
                        <div className="flex"><span className="w-16 font-semibold">Name:</span> <span className="font-bold">{studentFullName}</span></div>
                        <div className="flex"><span className="w-16 font-semibold">DOB:</span> <span>02/06/1999</span></div>
                        <div className="flex"><span className="w-16 font-semibold">Sex:</span> <span>FEMALE</span></div>
                        <div className="flex"><span className="w-16 font-semibold">Class:</span> <span>{data.student.className}</span></div>
                        <div className="flex"><span className="w-16 font-semibold">Adm No:</span> <span>{data.student.admissionNumber}</span></div>
                    </div>
                </div>

                <div className="col-span-1 border border-black flex items-center justify-center p-1 uppercase">
                    {data.student.photoUrl ? (
                        <img src={data.student.photoUrl} className="w-full h-full object-cover border border-black" />
                    ) : (
                        <div className="w-32 h-32 bg-gray-50 border border-black flex items-center justify-center text-[10px]">PASSPORT</div>
                    )}
                </div>

                <div className="col-span-1 space-y-2">
                    <div className="border border-black">
                        <div className="bg-emerald-50 border-b border-black p-1 text-[10px] font-bold text-center uppercase">Attendance</div>
                        <div className="grid grid-cols-3 text-[8px] text-center">
                            <div className="border-r border-black p-1"><p>Opened</p><p className="font-bold text-sm">{data.attendance.totalSchoolDays}</p></div>
                            <div className="border-r border-black p-1"><p>Present</p><p className="font-bold text-sm">{data.attendance.daysPresent}</p></div>
                            <div className="p-1"><p>Absent</p><p className="font-bold text-sm">{data.attendance.daysAbsent}</p></div>
                        </div>
                    </div>
                    <div className="border border-black">
                        <div className="bg-emerald-50 border-b border-black p-1 text-[10px] font-bold text-center uppercase">Dates</div>
                        <div className="grid grid-cols-3 text-[8px] text-center">
                            <div className="border-r border-black p-1"><p>Begins</p><p className="font-bold">{new Date(data.term.startDate).toLocaleDateString()}</p></div>
                            <div className="border-r border-black p-1"><p>Ends</p><p className="font-bold">{new Date(data.term.endDate).toLocaleDateString()}</p></div>
                            <div className="p-1"><p>Next</p><p className="font-bold">{data.term.nextTermStartDate ? new Date(data.term.nextTermStartDate).toLocaleDateString() : 'TBA'}</p></div>
                        </div>
                    </div>
                </div>

                <div className="col-span-1 border border-black">
                    <div className="p-1 space-y-1 text-[10px]">
                        <div className="flex justify-between border-b pb-1 font-bold"><span>MAX SCORE</span> <span>{formatScore(data.academic.summary.totalObtainable)}</span></div>
                        <div className="flex justify-between border-b pb-1 font-bold"><span>SCORE OBTAINED</span> <span>{formatScore(data.academic.summary.totalScore)}</span></div>
                        <div className="flex justify-between border-b pb-1 font-bold"><span>AVERAGE %</span> <span>{formatScore(data.academic.summary.average)}</span></div>
                        <div className="grid grid-cols-2 text-center pt-1">
                            <div className="border-r">
                                <p className="text-[8px] font-bold uppercase">Class Size</p>
                                <p className="text-sm font-bold">{data.academic.summary.classSize}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-bold uppercase">Position</p>
                                <p className="text-sm font-bold">{data.academic.summary.classPosition || "-"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Academic Performance */}
            <h3 className="bg-emerald-50 border border-black p-1 text-[10px] font-bold text-center uppercase mb-0">Academic Performance</h3>
            <table className="w-full border-collapse border border-black text-[10px] mb-4">
                <thead>
                    <tr className="bg-gray-100 text-[8px] font-bold">
                        <th className="border border-black p-1 text-left w-32">SUBJECT</th>
                        {!isHalfTerm && <th className="border border-black p-1 text-center w-8">B/F 1</th>}
                        {!isHalfTerm && <th className="border border-black p-1 text-center w-8">B/F 2</th>}
                        <th className="border border-black p-1 text-center w-8">CA 1</th>
                        <th className="border border-black p-1 text-center w-8">CA 2</th>
                        {!isHalfTerm && <th className="border border-black p-1 text-center w-8">EXAM</th>}
                        <th className="border border-black p-1 text-center w-12">TOTAL</th>
                        <th className="border border-black p-1 text-center w-12">POS</th>
                        <th className="border border-black p-1 text-center w-12">AVG</th>
                        {!isHalfTerm && <th className="border border-black p-1 text-center w-12">%</th>}
                        {!isHalfTerm && <th className="border border-black p-1 text-center w-12">CUM.</th>}
                        {!isHalfTerm && <th className="border border-black p-1 text-left w-12">GRADE</th>}
                    </tr>
                </thead>
                <tbody>
                    {data.academic.subjects.map((sub: any) => (
                        <tr key={sub.id} className="border-b border-black h-8">
                            <td className="border border-black p-1 font-semibold">{sub.name}</td>
                            {!isHalfTerm && <td className="border border-black p-1 text-center">{formatScoreOrBlank(sub.cumulativeTotal1)}</td>}
                            {!isHalfTerm && <td className="border border-black p-1 text-center">{formatScoreOrBlank(sub.cumulativeTotal2)}</td>}
                            <td className="border border-black p-1 text-center">{formatScore(sub.ca1 ?? (sub.ca / 2))}</td>
                            <td className="border border-black p-1 text-center">{formatScore(sub.ca2 ?? (sub.ca / 2))}</td>
                            {!isHalfTerm && <td className="border border-black p-1 text-center">{formatScore(sub.exam)}</td>}
                            <td className="border border-black p-1 text-center font-bold">{formatScore(sub.total)}</td>
                            <td className="border border-black p-1 text-center">{sub.subjectPosition || "-"}</td>
                            <td className="border border-black p-1 text-center">{formatScore(sub.subjectClassAverage)}</td>
                            {!isHalfTerm && <td className="border border-black p-1 text-center">{formatScore(sub.total)}</td>}
                            {!isHalfTerm && <td className="border border-black p-1 text-center">{formatScore((sub.cumulativeTotal1 || 0) + (sub.cumulativeTotal2 || 0) + sub.total)}</td>}
                            {!isHalfTerm && <td className="border border-black p-1 text-center font-bold">{sub.grade}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Traits & Skills */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <h3 className="bg-emerald-50 border border-black p-1 text-[10px] font-bold text-center uppercase">Affective Domain</h3>
                    <table className="w-full border-collapse border border-black text-[9px]">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1 text-left">TRAIT</th>
                                <th className="border border-black p-1 text-center w-8">1</th>
                                <th className="border border-black p-1 text-center w-8">2</th>
                                <th className="border border-black p-1 text-center w-8">3</th>
                                <th className="border border-black p-1 text-center w-8">4</th>
                                <th className="border border-black p-1 text-center w-8">5</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.affective.map((item: any, idx: number) => (
                                <tr key={idx} className="h-6">
                                    <td className="border border-black p-1">{item.name}</td>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <td key={n} className="border border-black p-1 text-center font-bold">{item.rating === n ? 'X' : ''}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div>
                    <h3 className="bg-emerald-50 border border-black p-1 text-[10px] font-bold text-center uppercase">Psychomotor Domain</h3>
                    <table className="w-full border-collapse border border-black text-[9px]">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1 text-left">SKILL</th>
                                <th className="border border-black p-1 text-center w-8">1</th>
                                <th className="border border-black p-1 text-center w-8">2</th>
                                <th className="border border-black p-1 text-center w-8">3</th>
                                <th className="border border-black p-1 text-center w-8">4</th>
                                <th className="border border-black p-1 text-center w-8">5</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.psychomotor.map((item: any, idx: number) => (
                                <tr key={idx} className="h-6">
                                    <td className="border border-black p-1">{item.name}</td>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <td key={n} className="border border-black p-1 text-center font-bold">{item.rating === n ? 'X' : ''}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="space-y-2">
                <div className="border border-black flex h-12">
                    <div className="bg-gray-100 w-48 border-r border-black p-2 text-[10px] font-bold">Class Teacher's Comments:</div>
                    <div className="flex-1 p-2 text-[10px] italic flex items-center justify-between">
                        <span>{data.comments.classTeacher || "God bless your efforts"}</span>
                        <div className="text-right flex flex-col items-center">
                            <span className="text-[8px] font-bold border-b border-black pt-2 px-4">Signature</span>
                            <span className="text-[8px] mt-1">{publishedDateLabel}</span>
                        </div>
                    </div>
                </div>
                <div className="border border-black flex h-12">
                    <div className="bg-gray-100 w-48 border-r border-black p-2 text-[10px] font-bold">Principal's Comments:</div>
                    <div className="flex-1 p-2 text-[10px] italic flex items-center justify-between">
                        <span>{data.comments.principal || "A wonderful performance"}</span>
                        <div className="text-right flex flex-col items-center">
                            <span className="text-[8px] font-bold border-b border-black pt-2 px-4">Signature</span>
                            <span className="text-[8px] mt-1">{publishedDateLabel}</span>
                        </div>
                    </div>
                </div>
                {!isHalfTerm && (
                    <div className="flex gap-4 items-center">
                        <div className="flex-1 border border-black p-2 bg-white">
                            <span className="text-[10px] font-bold uppercase">Promotion Status: </span>
                            <span className="text-[10px] font-black">{data.comments.promotionStatus || "PROMOTED TO NEXT CLASS"}</span>
                        </div>
                        <div className="w-24 h-24 rounded-full border-4 border-emerald-600 bg-emerald-50 flex flex-col items-center justify-center text-center">
                            <p className="text-[8px] font-black text-emerald-800 leading-none">BACK TO SCHOOL</p>
                            <div className="h-0.5 w-12 bg-emerald-600 my-1" />
                            <p className="text-[8px] font-black text-emerald-800 leading-none uppercase">{data.term.nextTermStartDate ? new Date(data.term.nextTermStartDate).toLocaleDateString('en-GB') : 'TBA'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ReportCardPreview: React.FC<ReportCardPreviewProps> = ({ data }) => {
    if (!data) {
        return <div className="bg-white p-6 text-center text-gray-500">Report data unavailable.</div>;
    }
    const activeTemplate = data.config?.activeTemplate || "standard";

    // Custom templates with a layout use the dynamic renderer
    if (data.config?.customLayout) {
        return <WebDynamicReportTemplate data={data} />;
    }

    // Route based on template ID (matches IDs from admin settings)
    // Must match the routing in ReportCardDocument.tsx (PDF) to ensure View matches Download
    if (activeTemplate === "professional" || activeTemplate === "modern") {
        return <ProfessionalPreview data={data} />;
    }

    // classic, standard, minimal, or any unrecognized template — all use the configurable standard preview
    return <StandardReportPreview config={data.config as any} data={data} />;
};

export default ReportCardPreview;
