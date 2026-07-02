const fs = require('fs');
const xlsx = require('xlsx');

// System data
const schemes = JSON.parse(fs.readFileSync('user_schemes.json', 'utf-8'));
const transactions = JSON.parse(fs.readFileSync('transactions.json', 'utf-8'));

// Legacy data
const wb = xlsx.readFile('C:/Users/Administrator/Downloads/Tally Vastra Cus list (1).xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const legacyData = xlsx.utils.sheet_to_json(sheet);

let legacyGrandTotal = 0;
let legacySchemeSum = 0;
let legacyUsersCount = 0;
let sarojaLegacyTotal = 0;

legacyData.forEach(row => {
    let name = row['Cus Name'] ? row['Cus Name'].toString().trim().toUpperCase() : '';
    let totalPaid = parseInt(row['Total Paid']) || 0;
    
    if (name === 'SAROJA') {
        sarojaLegacyTotal += totalPaid;
    } else {
        legacyGrandTotal += totalPaid;
        legacySchemeSum += (parseInt(row['Scheme Amt']) || 0);
        legacyUsersCount++;
    }
});

let systemGrandTotalSchemes = 0;
let systemGrandTotalTx = 0;

schemes.forEach(s => {
    // Excluding Saroja based on phone number if we can, wait... let's just use user list
    systemGrandTotalSchemes += (s.totalPaid || 0);
});

transactions.forEach(t => {
    if (t.status === 'Success') {
        systemGrandTotalTx += parseInt(t.amount || 0);
    }
});

// Since we need to exclude SAROJA from system as well for a fair comparison
const users = JSON.parse(fs.readFileSync('users.json', 'utf-8'));
const sarojaUser = users.find(u => u.name.toUpperCase() === 'SAROJA' || u.firstName.toUpperCase() === 'SAROJA');
const sarojaPhone = sarojaUser ? sarojaUser.phone : null;

let sysSarojaSchemeTotal = 0;
let sysSarojaTxTotal = 0;

if (sarojaPhone) {
    schemes.filter(s => s.userId === sarojaPhone).forEach(s => sysSarojaSchemeTotal += (s.totalPaid || 0));
    transactions.filter(t => t.userId === sarojaPhone && t.status === 'Success').forEach(t => sysSarojaTxTotal += parseInt(t.amount || 0));
}

console.log("=== Legacy Data ===");
console.log("Legacy Grand Total (Excl Saroja):", legacyGrandTotal);
console.log("Legacy Saroja Total:", sarojaLegacyTotal);
console.log("Legacy Absolute Grand Total:", legacyGrandTotal + sarojaLegacyTotal);
console.log("Legacy rows (excl Saroja):", legacyUsersCount);

console.log("\n=== System Data ===");
console.log("System Total from Schemes (Excl Saroja):", systemGrandTotalSchemes - sysSarojaSchemeTotal);
console.log("System Total from Transactions (Excl Saroja):", systemGrandTotalTx - sysSarojaTxTotal);
console.log("System Saroja Total (Schemes):", sysSarojaSchemeTotal);
console.log("System Absolute Grand Total (Schemes):", systemGrandTotalSchemes);
console.log("System Absolute Grand Total (Transactions):", systemGrandTotalTx);
