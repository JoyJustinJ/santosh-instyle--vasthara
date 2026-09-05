import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const MARGIN_PT = 36;

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
 * Renders an element as a single A4 page PDF.
 * The element must already be sized to A4 (794×1123px at 96dpi).
 */
export async function downloadAsSinglePagePDF(
    element: HTMLElement,
    filename: string
): Promise<void> {
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
        windowWidth: Math.max(element.offsetWidth, window.innerWidth),
        windowHeight: Math.max(element.offsetHeight, window.innerHeight),
        onclone: (doc) => {
            // Un-scale the wrapper inside the clone if needed
            const el = doc.getElementById(element.id);
            if (el) {
                // Prevent mobile viewport from squishing the layout in the clone
                doc.body.style.width = '1200px';
                doc.documentElement.style.width = '1200px';
                doc.body.style.maxWidth = 'none';
                doc.documentElement.style.maxWidth = 'none';

                if (el.parentElement) {
                    el.parentElement.style.transform = 'none';
                    el.parentElement.style.maxWidth = 'none';
                    el.parentElement.style.width = 'auto';
                }
                
                // Remove letter-spacing to fix html2canvas text overlap bug on mobile
                const allElems = el.querySelectorAll('*');
                allElems.forEach((e: any) => {
                    if (e.style && e.style.letterSpacing) {
                        e.style.letterSpacing = 'normal';
                    }
                });
            }
        }
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const imgData = canvas.toDataURL('image/jpeg', 0.97);
    const contentW = A4_WIDTH_PT - MARGIN_PT * 2;
    const contentH = A4_HEIGHT_PT - MARGIN_PT * 2;
    pdf.addImage(imgData, 'JPEG', MARGIN_PT, MARGIN_PT, contentW, contentH);

    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    const base64Data = pdf.output('datauristring').split(',')[1];
    const { downloadFile } = await import('./download');
    await downloadFile(base64Data, finalFilename, 'application/pdf', true);
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
        width: element.offsetWidth,
        height: element.offsetHeight,
        windowWidth: Math.max(element.offsetWidth, window.innerWidth),
        windowHeight: Math.max(element.offsetHeight, window.innerHeight),
        onclone: (doc) => {
            const el = doc.getElementById(element.id);
            if (el) {
                // Prevent mobile viewport from squishing the layout in the clone
                doc.body.style.width = '1200px';
                doc.documentElement.style.width = '1200px';
                doc.body.style.maxWidth = 'none';
                doc.documentElement.style.maxWidth = 'none';

                if (el.parentElement) {
                    el.parentElement.style.transform = 'none';
                    el.parentElement.style.maxWidth = 'none';
                    el.parentElement.style.width = 'auto';
                }

                // Remove letter-spacing to fix html2canvas text overlap bug on mobile
                const allElems = el.querySelectorAll('*');
                allElems.forEach((e: any) => {
                    if (e.style && e.style.letterSpacing) {
                        e.style.letterSpacing = 'normal';
                    }
                });
            }
        }
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

    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    const dataUri = pdf.output('datauristring');
    const base64Data = dataUri.split(',')[1];
    
    // Import dynamically to avoid circular dependencies if any
    const { downloadFile } = await import('./download');
    await downloadFile(base64Data, finalFilename, 'application/pdf', true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit Note PDF — fully programmatic (no html2canvas)
// Uses jsPDF vector drawing so backgrounds/colors always render correctly.
// ─────────────────────────────────────────────────────────────────────────────

export interface CreditNotePayload {
    accountId: string;
    closedAt: string;
    userName?: string;
    userPhone?: string;
    userId?: string;
    schemeName?: string;
    name?: string;
    bonuses?: string;
    gifts?: string;
    totalPaid: number;
    duplicate?: boolean;
    transactions?: Array<{
        id: string;
        date?: string;
        timestamp?: string;
        method?: string;
        amount: number;
    }>;
}

function fmtCNDate(d: string | undefined): string {
    if (!d) return '—';
    const ddmm = d.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmm) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${ddmm[1]} ${months[parseInt(ddmm[2]) - 1]} ${ddmm[3]}`;
    }
    const mddyyyy = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mddyyyy) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${String(mddyyyy[2]).padStart(2,'0')} ${months[parseInt(mddyyyy[1]) - 1]} ${mddyyyy[3]}`;
    }
    try {
        const dt = new Date(d);
        if (!isNaN(dt.getTime()))
            return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    } catch { /* ignore */ }
    return d;
}

/**
 * Generates a professional Credit Note PDF entirely via jsPDF vector drawing.
 * NO html2canvas — backgrounds, colors and layout render correctly on every device.
 */
export async function generateCreditNotePDF(
    data: CreditNotePayload,
    filename: string,
    openForPrint = false
): Promise<void> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210, ML = 14, MR = 14, CW = PW - ML - MR;
    let y = 0;

    const fill  = (r: number, g: number, b: number) => pdf.setFillColor(r, g, b);
    const pen   = (r: number, g: number, b: number, lw = 0.3) => { pdf.setDrawColor(r, g, b); pdf.setLineWidth(lw); };
    const ink   = (r: number, g: number, b: number) => pdf.setTextColor(r, g, b);
    const box   = (x: number, yy: number, w: number, h: number, s: 'F'|'S'|'FD') => pdf.rect(x, yy, w, h, s);
    const hline = (yy: number, r = 226, g = 232, b = 240) => { pen(r, g, b); pdf.line(0, yy, PW, yy); };

    // 1. Watermark
    if (data.duplicate) {
        pdf.saveGraphicsState();
        pdf.setGState(new (pdf as any).GState({ opacity: 0.04 }));
        pdf.setFontSize(72); pdf.setFont('helvetica', 'bold'); ink(26, 26, 26);
        pdf.text('DUPLICATE', PW / 2, 160, { align: 'center', angle: 45 });
        pdf.restoreGraphicsState();
    }

    // 2. Header band
    const HDR_H = 38;
    fill(26, 26, 46); box(0, y, PW, HDR_H, 'F');
    try {
        const resp = await fetch('/vasthara-logo.jpg');
        if (resp.ok) {
            const blob = await resp.blob();
            const logoUrl = await new Promise<string>((res, rej) => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result as string);
                reader.onerror = rej;
                reader.readAsDataURL(blob);
            });
            pdf.addImage(logoUrl, 'JPEG', (PW - 20) / 2, y + 4, 20, 13);
        }
    } catch { /* skip logo */ }
    pdf.setFontSize(15); pdf.setFont('helvetica', 'bold'); ink(255, 255, 255);
    pdf.text('SANTOSH INSTYLE VASTRA', PW / 2, y + 26, { align: 'center' });
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); ink(160, 174, 192);
    pdf.text('OFFICIAL CREDIT NOTE', PW / 2, y + 33, { align: 'center' });
    y += HDR_H;

    // 3. Duplicate banner
    if (data.duplicate) {
        fill(254, 243, 199); box(0, y, PW, 8, 'F');
        pen(245, 158, 11, 0.5); pdf.line(0, y + 8, PW, y + 8);
        pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); ink(146, 64, 14);
        pdf.text('! DUPLICATE COPY', PW / 2, y + 5.5, { align: 'center' });
        y += 8;
    }

    // 4. Scheme closed banner
    fill(240, 253, 244); box(0, y, PW, 13, 'F');
    hline(y + 13, 187, 247, 208);
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); ink(22, 101, 52);
    pdf.text('SCHEME CLOSED', ML + 8, y + 7);
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); ink(22, 163, 74);
    pdf.text('All installments completed - Redemption Approved', ML + 8, y + 11.5);
    y += 13;

    // 5. Meta strip
    fill(248, 250, 252); box(0, y, PW, 16, 'F');
    hline(y + 16);
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); ink(148, 163, 184);
    pdf.text('CLOSURE DATE', ML, y + 6);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); ink(26, 26, 26);
    pdf.text(fmtCNDate(data.closedAt), ML, y + 13);
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); ink(148, 163, 184);
    pdf.text('ACCOUNT ID', PW - MR, y + 6, { align: 'right' });
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); ink(26, 26, 26);
    pdf.text(data.accountId || '—', PW - MR, y + 13, { align: 'right' });
    y += 20;

    // 6. Info table
    const LABEL_W = 58, ROW_H = 10;
    const rows: { label: string; value: string }[] = [
        { label: 'CUSTOMER NAME', value: data.userName || 'Unknown' },
        { label: 'PHONE',         value: data.userPhone || data.userId || '—' },
        { label: 'SCHEME',        value: data.schemeName || data.name || '—' },
    ];
    if (data.bonuses) rows.push({ label: 'BONUS', value: data.bonuses });
    if (data.gifts)   rows.push({ label: 'GIFT',  value: data.gifts });

    pen(226, 232, 240); box(ML, y, CW, rows.length * ROW_H + 13, 'S');
    rows.forEach((row, i) => {
        const ry = y + i * ROW_H;
        fill(248, 250, 252); box(ML, ry, LABEL_W, ROW_H, 'F');
        hline(ry + ROW_H);
        pen(226, 232, 240); pdf.line(ML + LABEL_W, ry, ML + LABEL_W, ry + ROW_H);
        pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); ink(100, 116, 139);
        pdf.text(row.label, ML + 3, ry + 6.8);
        pdf.setFontSize(9.5); pdf.setFont('helvetica', 'bold'); ink(26, 26, 26);
        const maxW = CW - LABEL_W - 6;
        let val = row.value;
        while (pdf.getTextWidth(val) > maxW && val.length > 3) val = val.slice(0, -1);
        if (val !== row.value) val += '...';
        pdf.text(val, ML + LABEL_W + 4, ry + 6.8);
    });
    const totalRowY = y + rows.length * ROW_H;
    fill(240, 253, 244); box(ML, totalRowY, CW, 13, 'F');
    pen(187, 247, 208, 0.4); pdf.line(ML, totalRowY, ML + CW, totalRowY);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); ink(26, 26, 26);
    pdf.text('TOTAL REDEMPTION VALUE', ML + 3, totalRowY + 8.5);
    pdf.setFontSize(17); pdf.setFont('helvetica', 'bold'); ink(22, 101, 52);
    pdf.text(`Rs.${data.totalPaid}`, ML + CW - 3, totalRowY + 9.5, { align: 'right' });
    y += rows.length * ROW_H + 13 + 6;

    // 7. Transaction ledger
    if (data.transactions && data.transactions.length > 0) {
        pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); ink(148, 163, 184);
        pdf.text('TRANSACTION LEDGER', ML, y); y += 4;
        const TX = 8;
        const C0 = ML, C1 = ML + 11, C2 = ML + 60;
        fill(26, 26, 46); box(ML, y, CW, TX, 'F');
        pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); ink(226, 232, 240);
        pdf.text('#', C0 + 2, y + 5.5);
        pdf.text('DATE', C1 + 2, y + 5.5);
        pdf.text('METHOD', C2 + 2, y + 5.5);
        pdf.text('AMOUNT', ML + CW - 3, y + 5.5, { align: 'right' });
        y += TX;
        data.transactions.forEach((tx, i) => {
            const bg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
            fill(bg[0], bg[1], bg[2]); box(ML, y, CW, TX, 'F');
            pen(241, 245, 249, 0.2); pdf.line(ML, y + TX, ML + CW, y + TX);
            pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); ink(148, 163, 184);
            pdf.text(String(i + 1), C0 + 2, y + 5.5);
            pdf.setFont('helvetica', 'bold'); ink(55, 65, 81);
            pdf.text(fmtCNDate(tx.date || tx.timestamp), C1 + 2, y + 5.5);
            pdf.setFont('helvetica', 'normal'); ink(100, 116, 139);
            pdf.text((tx.method || 'CASH').toUpperCase(), C2 + 2, y + 5.5);
            pdf.setFont('helvetica', 'bold'); ink(22, 101, 52);
            pdf.text(`Rs.${tx.amount}`, ML + CW - 3, y + 5.5, { align: 'right' });
            y += TX;
        });
        fill(26, 26, 46); box(ML, y, CW, TX, 'F');
        pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); ink(226, 232, 240);
        pdf.text('TOTAL', C0 + 2, y + 5.5);
        ink(74, 222, 128);
        pdf.text(`Rs.${data.totalPaid}`, ML + CW - 3, y + 5.5, { align: 'right' });
        y += TX + 6;
    }

    // 8. Footer
    const footerY = Math.max(y + 4, 282);
    fill(248, 250, 252); box(0, footerY, PW, 12, 'F');
    hline(footerY);
    pdf.setFontSize(6); pdf.setFont('helvetica', 'normal'); ink(148, 163, 184);
    pdf.text('This is a computer-generated document and does not require a physical signature.', ML, footerY + 7);
    pdf.text('VASTHARA', PW - MR, footerY + 7, { align: 'right' });

    if (openForPrint) {
        // Open the PDF in a new tab so the user can use the browser's print dialog
        const blobUrl = pdf.output('bloburl') as unknown as string;
        const win = window.open(blobUrl, '_blank');
        if (win) {
            // Trigger print automatically after the PDF loads
            win.addEventListener('load', () => win.print(), { once: true });
        }
    } else {
        const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        const base64Data = pdf.output('datauristring').split(',')[1];
        const { downloadFile } = await import('./download');
        await downloadFile(base64Data, finalFilename, 'application/pdf', true);
    }
}
