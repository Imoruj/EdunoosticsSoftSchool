import React from "react";
import { DummySheetData, DummySheetSubjectPage } from "./types";

interface DummySheetPreviewProps {
    data: DummySheetData;
}

const MIN_ROWS_PER_PAGE = 18;

const pageStyle: React.CSSProperties = {
    width: "210mm",
    minHeight: "297mm",
    margin: "0 auto 24px",
    backgroundColor: "#ffffff",
    padding: "16mm 14mm",
    boxShadow: "0 6px 20px rgba(15, 23, 42, 0.08)",
    color: "#111827",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
};

const tableCellBase: React.CSSProperties = {
    borderRight: "1px solid #111827",
    borderBottom: "1px solid #111827",
    minHeight: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    fontSize: "13px",
};

function buildPageRows(subject: DummySheetSubjectPage) {
    return Array.from({ length: Math.max(subject.students.length, MIN_ROWS_PER_PAGE) }, (_, index) => subject.students[index] || null);
}

function SubjectSheetPage({ data, subject, isLastPage }: { data: DummySheetData; subject: DummySheetSubjectPage; isLastPage: boolean }) {
    const rows = buildPageRows(subject);
    const classTeacherName = data.classArm.classTeacherName || "Class Teacher";

    return (
        <div
            className="dummy-sheet-page"
            style={{
                ...pageStyle,
                pageBreakAfter: isLastPage ? "auto" : "always",
                breakAfter: isLastPage ? "auto" : "page",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div
                    style={{
                        width: "86px",
                        height: "62px",
                        border: "1px solid #111827",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        marginRight: "12px",
                        flexShrink: 0,
                    }}
                >
                    {data.school.logoUrl ? (
                        <img
                            src={data.school.logoUrl}
                            alt="School logo"
                            style={{ width: "78px", height: "54px", objectFit: "contain" }}
                        />
                    ) : (
                        <span style={{ fontSize: "12px" }}>School Logo</span>
                    )}
                </div>

                <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: "28px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {data.school.name}
                    </div>
                    {data.school.address ? (
                        <div style={{ fontSize: "12px", marginTop: "4px" }}>{data.school.address}</div>
                    ) : null}
                    <div
                        style={{
                            marginTop: "8px",
                            fontSize: "24px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            textDecoration: "underline",
                        }}
                    >
                        Dummy
                    </div>
                </div>

                <div style={{ width: "240px", marginLeft: "12px", flexShrink: 0 }}>
                    <MetaRow label="Academic Session" value={data.session.name} />
                    <MetaRow label="Term" value={data.term.name} />
                </div>
            </div>

            <div style={{ marginBottom: "10px" }}>
                <MetaRow label="Subject" value={subject.subjectName} />
                <MetaRow label="Class" value={`${data.classArm.className} ${data.classArm.armName}`} />
            </div>

            <div style={{ border: "1px solid #111827" }}>
                <div style={{ display: "flex", backgroundColor: "#f3f4f6", fontWeight: 700, textTransform: "uppercase" }}>
                    <div style={{ ...tableCellBase, width: "46px", fontSize: "12px" }}>S/N</div>
                    <div style={{ ...tableCellBase, flex: 1, justifyContent: "flex-start", paddingLeft: "10px", fontSize: "12px" }}>Student Name</div>
                    <div style={{ ...tableCellBase, width: "76px", fontSize: "12px" }}>CA 1</div>
                    <div style={{ ...tableCellBase, width: "76px", fontSize: "12px" }}>CA 2</div>
                    <div style={{ ...tableCellBase, width: "76px", fontSize: "12px" }}>Exam</div>
                    <div style={{ ...tableCellBase, width: "76px", borderRight: "0", fontSize: "12px" }}>Total</div>
                </div>

                {rows.map((row, index) => (
                    <div key={row?.id || `blank-${index}`} style={{ display: "flex" }}>
                        <div style={{ ...tableCellBase, width: "46px" }}>{row?.serialNumber || ""}</div>
                        <div style={{ ...tableCellBase, flex: 1, justifyContent: "flex-start", padding: "0 10px" }}>{row?.fullName || ""}</div>
                        <div style={{ ...tableCellBase, width: "76px" }} />
                        <div style={{ ...tableCellBase, width: "76px" }} />
                        <div style={{ ...tableCellBase, width: "76px" }} />
                        <div style={{ ...tableCellBase, width: "76px", borderRight: "0" }} />
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "auto", paddingTop: "20px", display: "grid", rowGap: "12px" }}>
                {["CA1", "CA2", "EXAM"].map((label) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "190px", fontSize: "13px" }}>Check and Approve {label}</div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 700 }}>Sign</span>
                            <div style={{ flex: 1, borderBottom: "1px solid #111827", height: "12px" }} />
                        </div>
                        <div style={{ width: "180px", borderBottom: "1px solid #111827", textAlign: "center", paddingBottom: "2px", fontSize: "13px" }}>
                            {classTeacherName}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
            <div style={{ width: "120px", fontSize: "13px", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
            <div style={{ flex: 1, borderBottom: "1px solid #111827", paddingBottom: "2px", fontSize: "13px" }}>{value}</div>
        </div>
    );
}

export default function DummySheetPreview({ data }: DummySheetPreviewProps) {
    const subjects = data.subjects.length > 0
        ? data.subjects
        : [{ subjectId: "empty", subjectName: "No Subject Enrollments Found", students: [] }];

    return (
        <div style={{ width: "100%" }}>
            {subjects.map((subject, index) => (
                <SubjectSheetPage
                    key={subject.subjectId}
                    data={data}
                    subject={subject}
                    isLastPage={index === subjects.length - 1}
                />
            ))}
        </div>
    );
}
