const fs = require('fs');
const xlsx = require('xlsx');

const schemes = JSON.parse(fs.readFileSync('user_schemes.json', 'utf-8'));
const wb = xlsx.readFile('C:/Users/Administrator/Downloads/Tally Vastra Cus list (1).xlsx');
const legacyData = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const legAgg = {};
legacyData.forEach(r => {
    if (r['S No'] === 'Total') return;
    const phone = r['Phone No'] ? r['Phone No'].toString().trim() : null;
    if (!phone) return;
    legAgg[phone] = (legAgg[phone] || 0) + (parseInt(r['Total Paid']) || 0);
});

const sysAgg = {};
schemes.forEach(s => {
    const phone = s.userId;
    sysAgg[phone] = (sysAgg[phone] || 0) + (s.totalPaid || 0);
});

for (let phone in legAgg) {
    if (legAgg[phone] !== sysAgg[phone]) {
        console.log(`Phone: ${phone} | Legacy: ${legAgg[phone]} | System: ${sysAgg[phone] || 0}`);
    }
}

for (let phone in sysAgg) {
    if (legAgg[phone] === undefined) {
        console.log(`Phone: ${phone} is in System (${sysAgg[phone]}) but NOT in Legacy`);
    }
}
