const xlsx = require('xlsx');

function findSaroja() {
    const filePath = 'C:\\Users\\Administrator\\Downloads\\VASTRA INFO.xlsx';
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && row[0] && row[0].toString().toLowerCase().includes('saroja')) {
            console.log(`Found Saroja at row ${i + 1}:`);
            console.log(JSON.stringify(row));
            
            // Excel dates
            for (let col = 5; col <= 15; col++) {
                if (row[col]) {
                    const date = new Date((row[col] - (25567 + 2)) * 86400 * 1000);
                    console.log(`Installment ${col - 4} date: ${row[col]} -> ${date.toLocaleDateString()}`);
                }
            }
        }
    }
}

findSaroja();
