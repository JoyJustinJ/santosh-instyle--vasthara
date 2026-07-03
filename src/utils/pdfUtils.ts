import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const MARGIN_PT = 36; // ~12.7 mm margins on each side

/**
 * Scan canvas pixel rows near `targetY` to find the row with the most
 * whitespace (highest average brightness). Cutting there avoids slicing
 * through text or coloured elements.
 */
function findSafeCutY(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    targetY: number,
    searchRange = 60
): number {
    const start = Math.max(0, targetY - searchRange);
    const end = Math.min(canvasHeight - 1, targetY + searchRange);

    let bestY = targetY;
    let maxBrightness = -1;

    for (let y = start; y <= end; y++) {
        const { data } = ctx.getImageData(0, y, canvasWidth, 1);
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
            total += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const avg = total / (canvasWidth);
        if (avg > maxBrightness) {
            maxBrightness = avg;
            bestY = y;
        }
    }

    return bestY;
}

/**
 * Generates a multi-page A4 PDF from an HTML element.
 * - Uses html2canvas-pro (supports oklab / modern CSS colors)
 * - Intelligently finds whitespace rows to cut pages so content is never split in half
 */
export async function downloadAsPDF(
    element: HTMLElement,
    filename: string
): Promise<void> {
    // 1. Render full element to canvas
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const contentWidthPt = A4_WIDTH_PT - MARGIN_PT * 2;
    const contentHeightPt = A4_HEIGHT_PT - MARGIN_PT * 2;

    // Scale factor: canvas pixels per PDF point
    const pxPerPt = canvas.width / contentWidthPt;

    // How many canvas pixels fit in a single page's content area
    const pageHeightPx = Math.floor(contentHeightPt * pxPerPt);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    let currentY = 0; // current top of slice in canvas pixels
    let pageIndex = 0;

    while (currentY < canvas.height) {
        if (pageIndex > 0) pdf.addPage();

        // Find the ideal cut point near the bottom of this page slice
        const rawCutY = currentY + pageHeightPx;
        const safeCutY =
            rawCutY >= canvas.height
                ? canvas.height
                : findSafeCutY(ctx, canvas.width, canvas.height, rawCutY);

        // Height of this slice in canvas pixels
        const sliceHeightPx = safeCutY - currentY;

        // Create a temporary canvas for this slice only
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const sliceCtx = sliceCanvas.getContext('2d')!;
        sliceCtx.drawImage(canvas, 0, currentY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

        const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);

        // Height of this slice in PDF points
        const sliceHeightPt = sliceHeightPx / pxPerPt;

        pdf.addImage(imgData, 'JPEG', MARGIN_PT, MARGIN_PT, contentWidthPt, sliceHeightPt);

        currentY = safeCutY;
        pageIndex++;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
