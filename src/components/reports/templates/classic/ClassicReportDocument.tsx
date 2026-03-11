import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ClassicStyles";
import Header from "./ClassicHeader";
import StudentProfile from "./ClassicStudentProfile";
import AcademicTable from "./ClassicAcademicTable";
import TraitsTable from "./ClassicTraitsTable";
import Footer from "./ClassicFooter";

interface ClassicReportDocumentProps {
    data: ReportCardData;
}

const ClassicReportDocument: React.FC<ClassicReportDocumentProps> = ({ data }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Header school={data.school} term={data.term} config={data.config} />

                <StudentProfile
                    student={data.student}
                    term={data.term}
                    attendance={data.attendance}
                    summary={data.academic.summary}
                    config={data.config}
                />

                <AcademicTable
                    subjects={data.academic.subjects}
                    config={data.config}
                    reportType={data.reportType}
                />

                <TraitsTable
                    affective={data.affective}
                    psychomotor={data.psychomotor}
                    config={data.config}
                />

                <Footer
                    comments={data.comments}
                    term={data.term}
                    config={data.config}
                    school={data.school}
                />
            </Page>
        </Document>
    );
};

export default ClassicReportDocument;
