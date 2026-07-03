const xlsx = require('xlsx');
const path = require('path');

const filePath = 'C:\\Users\\Administrator\\Downloads\\VASTRA INFO.xlsx';
const workbook = xlsx.readFile(filePath);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Headers:");
console.log(data[0]);

console.log("\nFirst 3 rows of data:");
for (let i = 1; i <= 3; i++) {
  if (data[i]) {
    console.log(data[i]);
  }
}
