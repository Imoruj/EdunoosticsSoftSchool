import html2canvas from "html2canvas";
import jsPDF from "jspdf";

async function waitForImages(container: HTMLElement): Promise<void> {
    const images = Array.from(container.querySelectorAll("img"));

    await Promise.all(images.map((img) => {
        if (img.complete) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });
    }));
}

interface DownloadHtmlPagesAsPdfOptions {
    filename: string;
    pageSelector?: string;
}

export async function downloadHtmlPagesAsPdf(
    container: HTMLElement,
    options: DownloadHtmlPagesAsPdfOptions
): Promise<void> {
    const { filename, pageSelector = ".dummy-sheet-page" } = options;
    const pages = Array.from(container.querySelectorAll<HTMLElement>(pageSelector));

    if (pages.length === 0) {
        throw new Error("Load the sheets preview before downloading.");
    }

    await waitForImages(container);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (const [index, page] of pages.entries()) {
        const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
        });

        if (index > 0) {
            pdf.addPage("a4", "portrait");
        }

        const imageData = canvas.toDataURL("image/png");
        pdf.addImage(imageData, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    }

    pdf.save(filename);
}
