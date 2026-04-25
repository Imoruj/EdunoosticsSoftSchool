
import React from "react";
import { View, StyleSheet, Document, Page } from "@react-pdf/renderer";
import { ReportCardData } from "../types";
import { SchoolLogo } from "../blocks/SchoolLogo";
import { SchoolHeader } from "../blocks/SchoolHeader";
import { TermInfo } from "../blocks/TermInfo";
import { StudentProfile } from "../blocks/StudentProfile";
import { StudentPhoto } from "../blocks/StudentPhoto";
import { Attendance } from "../blocks/Attendance";
import { ScoreSummary } from "../blocks/ScoreSummary";
import { AcademicTable } from "../blocks/AcademicTable";
import { AffectiveTraits } from "../blocks/AffectiveTraits";
import { Psychomotor } from "../blocks/Psychomotor";
import { BehaviourKey } from "../blocks/BehaviourKey";
import { GradeKey } from "../blocks/GradeKey";
import { Comments } from "../blocks/Comments";

// Types for Layout Engine
export interface LayoutColumn {
    id: string;
    width: number; // Percentage 1-100
    componentId: string | null;
    props?: Record<string, any>;
}

export interface LayoutRow {
    id: string;
    height?: number;
    columns: LayoutColumn[];
}

export interface LayoutConfig {
    rows: LayoutRow[];
}

// Registry
const COMPONENT_REGISTRY: Record<string, React.FC<any>> = {
    SchoolLogo,
    SchoolHeader,
    TermInfo,
    StudentProfile,
    StudentPhoto,
    Attendance,
    ScoreSummary,
    AcademicTable,
    AffectiveTraits,
    Psychomotor,
    BehaviourKey,
    GradeKey,
    Comments,
};

const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontFamily: "Helvetica",
        fontSize: 10,
        color: "#000",
        backgroundColor: "#FFFFFF",
    },
    row: {
        flexDirection: "row",
        width: "100%",
    },
    col: {
        // width handled dynamically
    },
});

interface DynamicReportTemplateProps {
    data: ReportCardData;
    layout?: LayoutConfig; // Optional, defaults to standard if missing
}


// Default Layout mirroring the Standard Template
const DEFAULT_LAYOUT: LayoutConfig = {
    rows: [
        {
            id: "header_row",
            columns: [
                { id: "c1", width: 20, componentId: "SchoolLogo" },
                { id: "c2", width: 80, componentId: "SchoolHeader" }
            ]
        },
        {
            id: "term_row",
            columns: [{ id: "c3", width: 100, componentId: "TermInfo" }]
        },
        {
            id: "personal_row",
            columns: [
                { id: "c4", width: 40, componentId: "StudentProfile" },
                { id: "c5", width: 20, componentId: "StudentPhoto" },
                { id: "c6", width: 40, componentId: "Attendance" } // Simplified for now, usually nested
            ]
        },
        {
            id: "score_row",
            columns: [{ id: "c7", width: 100, componentId: "ScoreSummary" }]
        },
        {
            id: "academic_row",
            columns: [{ id: "c8", width: 100, componentId: "AcademicTable" }]
        },
        {
            id: "traits_row",
            columns: [
                { id: "c9", width: 50, componentId: "AffectiveTraits" },
                { id: "c10", width: 50, componentId: "Psychomotor" }
            ]
        },
        {
            id: "keys_row",
            columns: [
                { id: "c11", width: 50, componentId: "BehaviourKey" },
                { id: "c12", width: 50, componentId: "GradeKey" }
            ]
        },
        {
            id: "comments_row",
            columns: [{ id: "c13", width: 100, componentId: "Comments" }]
        }
    ]
};

export const DynamicReportTemplate: React.FC<DynamicReportTemplateProps> = ({ data, layout }) => {
    const config = layout || (data.config?.customLayout as LayoutConfig) || DEFAULT_LAYOUT;

    // Helper to get props for specific component types
    const getComponentProps = (componentId: string) => {
        const displayOptions = data.config?.displayOptions || {};
        // Find section style if any
        const sectionStyle = (displayOptions as any).sectionStyles?.global || {}; // Defaulting to global or empty
        const baseProps = { displayOptions, sectionStyle, assessmentTypes: data.config?.assessmentTypes || [] };

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
        <Document>
            <Page size="A4" style={styles.page}>
                {config.rows.map((row) => (
                    <View key={row.id} style={[styles.row, row.height ? { height: row.height } : {}]}>
                        {row.columns.map((col) => {
                            const Component = col.componentId ? COMPONENT_REGISTRY[col.componentId] : null;
                            return (
                                <View key={col.id} style={[styles.col, { width: `${col.width}%` }]}>
                                    {Component && <Component {...getComponentProps(col.componentId!)} />}
                                </View>
                            );
                        })}
                    </View>
                ))}
            </Page>
        </Document>
    );
};
