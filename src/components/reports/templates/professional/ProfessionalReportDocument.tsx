import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ProfessionalStyles";
import Header from "./ProfessionalHeader";
import StudentProfile from "./ProfessionalStudentProfile";
import AcademicTable from "./ProfessionalAcademicTable";
import TraitsTable from "./ProfessionalTraitsTable";
import Footer from "./ProfessionalFooter";

interface ProfessionalReportDocumentProps {
    data: ReportCardData;
}

const ProfessionalReportDocument: React.FC<ProfessionalReportDocumentProps> = ({ data }) => {
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
                />

                <TraitsTable
                    affective={data.affective}
                    psychomotor={data.psychomotor}
                    config={data.config}
                />

                <Footer
                    comments={data.comments}
                    term={data.term}
                    config={{ ...data.config, school: data.school }}
                />
            </Page>
        </Document>
    );
};

export default ProfessionalReportDocument;
