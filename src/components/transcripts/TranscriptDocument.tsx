import React from "react";
import { Document } from "@react-pdf/renderer";
import { TranscriptData } from "./types";
import StandardTranscriptTemplate from "./templates/StandardTranscriptTemplate";

interface TranscriptDocumentProps {
    data: TranscriptData;
}

const TranscriptDocument: React.FC<TranscriptDocumentProps> = ({ data }) => {
    return (
        <Document>
            <StandardTranscriptTemplate data={data} />
        </Document>
    );
};

export default TranscriptDocument;
