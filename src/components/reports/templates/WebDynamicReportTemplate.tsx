
import React from "react";
import { ReportCardData, LayoutConfig } from "../types";
import { WEB_COMPONENT_REGISTRY } from "../blocks/web/WebBlockRegistry";

interface WebDynamicReportTemplateProps {
    data: ReportCardData;
    layout?: LayoutConfig;
}

export const WebDynamicReportTemplate: React.FC<WebDynamicReportTemplateProps> = ({ data, layout }) => {
    const config = layout || data.config?.customLayout;

    if (!config) return null;

    // Helper to get props for specific component types
    const getComponentProps = (componentId: string) => {
        const rawDisplayOptions = data.config?.displayOptions || {};
        // For half-term reports, override full-term-only display options
        const isHalfTerm = data.reportType === "halfTerm";
        const displayOptions = isHalfTerm
            ? { ...rawDisplayOptions, showTermHistory: false, showExam: false, showGrade: false, showRemarks: false, showPromotionStatus: false }
            : rawDisplayOptions;
        const sectionStyle = (displayOptions as any).sectionStyles?.global || {};
        const baseProps = { displayOptions, sectionStyle, reportType: data.reportType };

        switch (componentId) {
            case "SchoolLogo": return { ...baseProps, school: data.school };
            case "SchoolHeader": return { ...baseProps, school: data.school };
            case "TermInfo": return { ...baseProps, term: data.term };
            case "StudentProfile": return { ...baseProps, student: data.student };
            case "StudentPhoto": return { ...baseProps, student: data.student };
            case "Attendance": return { ...baseProps, attendance: data.attendance, showAttendance: data.config?.showAttendance };
            case "ScoreSummary": return { ...baseProps, academic: data.academic };
            case "AcademicTable": return { ...baseProps, academic: data.academic };
            case "AffectiveTraits": return { ...baseProps, traits: data.affective };
            case "Psychomotor": return { ...baseProps, skills: data.psychomotor };
            case "BehaviourKey": return { ...baseProps };
            case "GradeKey": return { ...baseProps };
            case "Comments": return { ...baseProps, comments: data.comments, school: data.school };
            default: return baseProps;
        }
    };

    return (
        <div className="flex flex-col gap-2 w-full bg-white p-8">
            {config.rows.map((row) => (
                <div key={row.id} className="flex w-full" style={row.height ? { height: `${row.height}px` } : {}}>
                    {row.columns.map((col) => {
                        const Component = col.componentId ? WEB_COMPONENT_REGISTRY[col.componentId] : null;
                        return (
                            <div key={col.id} style={{ width: `${col.width}%` }} className="flex-shrink-0">
                                {Component && <Component {...getComponentProps(col.componentId!)} />}
                                {!Component && col.componentId && <div className="text-red-500 text-[10px]">Error: {col.componentId}</div>}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};
