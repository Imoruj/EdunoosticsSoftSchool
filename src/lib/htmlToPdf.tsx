import React from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ReportCardPreview from "@/components/reports/ReportCardPreview";
import { ReportCardData } from "@/components/reports/types";

/**
 * Wait for all images inside a container to finish loading.
 */
function waitForImages(container: HTMLElement): Promise<void> {
    const images = container.querySelectorAll("img");
    const promises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });
    });
    return Promise.all(promises).then(() => {});
}

/**
 * Render the web preview component off-screen, capture it with html2canvas,
 * and produce a PDF that is an exact replica of the on-screen preview.
 */
export async function generatePdfFromPreview(
    reportData: ReportCardData,
    filename: string
): Promise<void> {
    // 1. Create an off-screen container (A4-proportional width for clean PDF)
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "794px"; // ~A4 width at 96dpi
    container.style.backgroundColor = "#ffffff";
    document.body.appendChild(container);

    try {
        // 2. Render the exact same web preview component
        const root = createRoot(container);
        root.render(<ReportCardPreview data={reportData} />);

        // 3. Wait for React to render + images to load
        await new Promise((r) => setTimeout(r, 500));
        await waitForImages(container);
        // Extra buffer for any late-rendering content
        await new Promise((r) => setTimeout(r, 300));

        // 4. Capture the rendered HTML as a canvas
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
        });

        // 5. Convert canvas to PDF — single page that fits all content
        const imgData = canvas.toDataURL("image/png");
        const pdfWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        // Use custom page size: A4 width, height = content height (single page)
        const pdf = new jsPDF("p", "mm", [pdfWidth, imgHeight]);
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);

        pdf.save(filename);

        // Cleanup React root
        root.unmount();
    } finally {
        // Always clean up the container
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
}
