import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import ProfessionalReportDocument from "./templates/professional/ProfessionalReportDocument";
import ClassicReportDocument from "./templates/classic/ClassicReportDocument";
import StandardTemplate from "./templates/StandardTemplate";
import { DynamicReportTemplate } from "./templates/DynamicReportTemplate";

interface ReportCardDocumentProps {
    data: ReportCardData;
}

const ReportCardDocument: React.FC<ReportCardDocumentProps> = ({ data }) => {
    // Switch between templates based on config
    const activeTemplate = data.config?.activeTemplate || "standard";

    // Custom templates with a layout use the dynamic renderer
    if (data.config?.customLayout) {
        return <DynamicReportTemplate data={data} />;
    }

    // Route based on template ID (matches IDs from admin settings)
    // Must match the routing in ReportCardPreview.tsx (web) to ensure View matches Download
    if (activeTemplate === "professional" || activeTemplate === "modern") {
        return <ProfessionalReportDocument data={data} />;
    }

    // classic, standard, minimal, or any unrecognized template — all use the configurable standard template
    return (
        <Document>
            <Page size="A4" style={{ padding: 0 }}>
                <StandardTemplate data={data} />
            </Page>
        </Document>
    );
};

export default ReportCardDocument;
