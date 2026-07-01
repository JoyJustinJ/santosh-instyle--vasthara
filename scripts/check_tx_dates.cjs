const admin = require('firebase-admin');
const xlsx = require('xlsx');

const serviceAccount = require('../service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

function parseExcelDate(excelDate) {
    if (!excelDate) return null;
    if (typeof excelDate === 'number') {
        const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    } else if (typeof excelDate === 'string') {
        let clean = excelDate;
        if (clean === '30/25/26') clean = '30/05/26'; // PUJITH
        
        const parts = clean.split(/[-/]/);
        if (parts.length === 3) {
            let [d, m, y] = parts;
            if (y === '2206') y = '2026'; // S Uma
            if (y.length === 2) y = '20' + y;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }
    return null;
}

const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

async function checkDates() {
    const wb = xlsx.readFile('C:/Users/Administrator/Downloads/VASTRA INFO.xlsx');
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws);
    
    const usersSnap = await db.collection('users').get();
    const usersMap = {}; 
    usersSnap.forEach(d => { usersMap[d.data().phone] = d.id; });

    const schemesSnap = await db.collection('user_schemes').get();
    const schemesMap = {}; 
    schemesSnap.forEach(d => {
        const s = d.data();
        if (!schemesMap[s.userId]) schemesMap[s.userId] = [];
        schemesMap[s.userId].push(s);
    });

    const txSnap = await db.collection('transactions').get();
    const txMap = {}; 
    txSnap.forEach(d => {
        const t = d.data();
        if (!txMap[t.accountId]) txMap[t.accountId] = [];
        txMap[t.accountId].push(t);
    });

    let mismatches = 0;
    let details = [];

    for (let row of data) {
        if (!row['Phone No']) continue;
        let phone = row['Phone No'].toString();
        
        if (phone === '883891121' && row['Cus Name'] === 'ANITHA') {
            phone = '9637636453';
        }

        const userId = usersMap[phone];
        if (!userId) continue;

        const userSchemes = schemesMap[userId] || [];
        const matchedScheme = userSchemes.find(s => s.monthsPaid === row['Count'] && s.totalPaid === row['Total Paid']);
        if (!matchedScheme) continue;

        let txs = txMap[matchedScheme.accountId] || [];
        txs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let excelDates = [];
        for (let i = 0; i < row['Count']; i++) {
            const excelCol = `${getOrdinal(i + 1)} Installment`;
            const excelRaw = row[excelCol];
            const excelDateParsed = parseExcelDate(excelRaw);
            if(excelDateParsed) excelDates.push(excelDateParsed);
        }
        
        // Sort Excel dates chronologically!
        excelDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        for (let i = 0; i < excelDates.length; i++) {
            if (i >= txs.length) continue;
            
            const excelDateParsed = excelDates[i];
            const dbDateParsed = new Date(txs[i].timestamp).toISOString().split('T')[0];
            
            if (excelDateParsed !== dbDateParsed && Math.abs(new Date(excelDateParsed) - new Date(dbDateParsed)) > 86400000) {
                mismatches++;
                details.push(`[${row['Cus Name']}] Sorted Tx ${i+1}: Excel=${excelDateParsed} vs DB=${dbDateParsed}`);
            }
        }
    }
    console.log("Total date mismatches:", mismatches);
    if(mismatches > 0) {
        console.log(details.slice(0, 15).join('\n'));
        if (details.length > 15) console.log("...and more");
    }
    process.exit(0);
}

checkDates().catch(console.error);
