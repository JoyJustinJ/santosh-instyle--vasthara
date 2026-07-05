import { Capacitor } from '@capacitor/core';

/**
 * Cross-platform file download utility.
 * - On Android APK: saves the file to the device's Downloads folder,
 *   then opens the native OS Share Sheet so the user can view/save/forward it.
 * - On web/browser: uses the standard Blob + anchor-click download method.
 *
 * @param data     Raw string content (CSV) or base64 string (Excel/Binary).
 * @param fileName The desired file name (e.g. "Report.xlsx")
 * @param mimeType MIME type (e.g. "text/csv" or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
 * @param isBase64 Set to true when `data` is already a base64-encoded string (for binary files like XLSX).
 */
export async function downloadFile(
    data: string,
    fileName: string,
    mimeType: string,
    isBase64 = false
): Promise<void> {
    if (Capacitor.isNativePlatform()) {
        try {
            // Dynamically import to avoid bundling on web
            const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
            const { Share } = await import('@capacitor/share');

            let base64Data: string;
            if (isBase64) {
                base64Data = data;
            } else {
                // Encode text (CSV) to base64
                base64Data = btoa(unescape(encodeURIComponent(data)));
            }

            // Write to the app's cache directory (always writable, no permissions needed)
            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
            });

            // Share the file via the native OS share sheet
            await Share.share({
                title: `Download: ${fileName}`,
                text: `Your report is ready: ${fileName}`,
                url: result.uri,
                dialogTitle: `Save ${fileName}`,
            });
        } catch (err) {
            console.error('Native file download failed, falling back to web method:', err);
            // Fallback to web method if native fails
            downloadFileWeb(data, fileName, mimeType, isBase64);
        }
    } else {
        downloadFileWeb(data, fileName, mimeType, isBase64);
    }
}

/**
 * Standard browser Blob download. Used on web.
 */
function downloadFileWeb(
    data: string,
    fileName: string,
    mimeType: string,
    isBase64 = false
): void {
    let blob: Blob;
    if (isBase64) {
        const byteChars = atob(data);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: mimeType });
    } else {
        blob = new Blob([data], { type: `${mimeType};charset=utf-8;` });
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Helper to convert a SheetJS workbook to a base64 string for native download.
 * Import XLSX from 'xlsx' before calling this.
 */
export function workbookToBase64(wb: any, XLSX: any): string {
    const wbout: Uint8Array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    let binary = '';
    const bytes = new Uint8Array(wbout);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
