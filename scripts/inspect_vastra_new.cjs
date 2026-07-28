const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'C:/Users/Administrator/Downloads/VASTRA NEW.xlsx';

if (!fs.existsSync(filePath)) {
    console.error("File does not exist at:", filePath);
    process.exit(1);
}

const workbook = XLSX.readFile(filePath, { cellStyles: true, cellDates: true });
console.log("Sheet names:", workbook.SheetNames);

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const range = XLSX.utils.decode_range(sheet['!ref']);
console.log(`Range: ${sheet['!ref']} (${range.e.r + 1} rows, ${range.e.c + 1} columns)`);

// Let's print headers (first 5 rows)
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'DD-MM-YYYY' });
console.log("\nFirst 5 rows:");
for (let i = 0; i < Math.min(5, data.length); i++) {
    console.log(`Row ${i + 1}:`, JSON.stringify(data[i]));
}

// Let's check for any cell styling or colors in the sheet
let highlightedCells = 0;
let rowsWithHighlight = new Set();

for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellAddress];
        if (cell && cell.s) {
            // Check if fill or background color exists
            if (cell.s.fill || cell.s.fgColor || cell.s.bgColor || (cell.s.patternType && cell.s.patternType !== 'none')) {
                highlightedCells++;
                rowsWithHighlight.add(R + 1);
            }
        }
    }
}
console.log(`\nHighlighted cells detected via xlsx styles: ${highlightedCells}, across rows:`, Array.from(rowsWithHighlight));

// Let's inspect rows with data to see what columns exist
console.log(`\nTotal rows parsed: ${data.length}`);
