const xlsx = require('xlsx');

function checkExcel() {
    const filePath = 'C:\\Users\\Administrator\\Downloads\\VASTRA INFO.xlsx';
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    console.log("Headers:", data[0]);
    console.log("Row 1:", data[1]);
    console.log("Row 2:", data[2]);

    for (let r = 0; r < data.length; r++) {
        for (let c = 0; c < data[r].length; c++) {
            if (data[r][c] && data[r][c].toString().includes('9894848405')) {
                console.log(`Found phone at row ${r+1}, col ${c+1}:`, data[r]);
            }
        }
    }
}

checkExcel();
