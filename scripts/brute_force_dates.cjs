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
        // Fix typos
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

function formatForDBDate(yyyy_mm_dd) {
    const [y, m, d] = yyyy_mm_dd.split('-');
    return `${d}/${m}/${y}`;
}

async function fixDates() {
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

    let fixedCount = 0;
    let batch = db.batch();
    let batchCount = 0;
    
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
        // Important: Sort TXs by their actual string ID to ensure deterministic assignment if timestamps are weird.
        // Or we can sort by original timestamp. Since we messed up some timestamps (like 2026-25-30), sorting by ID is safer for assigning new ones.
        txs.sort((a, b) => a.id.localeCompare(b.id));

        let excelDates = [];
        for (let i = 0; i < row['Count']; i++) {
            const excelCol = `${getOrdinal(i + 1)} Installment`;
            const excelDateParsed = parseExcelDate(row[excelCol]);
            if (excelDateParsed) excelDates.push(excelDateParsed);
        }
        
        excelDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        for (let i = 0; i < excelDates.length; i++) {
            if (i >= txs.length) break;
            
            const excelDateParsed = excelDates[i];
            
            let currentDbDateParsed;
            try {
                currentDbDateParsed = new Date(txs[i].timestamp).toISOString().split('T')[0];
            } catch (e) {
                currentDbDateParsed = 'invalid';
            }
            
            if (excelDateParsed !== currentDbDateParsed) {
                const txId = txs[i].id;
                const newTimestamp = `${excelDateParsed}T10:0${i}:00.000Z`;
                const newDate = formatForDBDate(excelDateParsed);
                
                const ref = db.collection('transactions').doc(txId);
                batch.update(ref, {
                    timestamp: newTimestamp,
                    date: newDate
                });
                batchCount++;
                
                if (batchCount >= 400) {
                    await batch.commit();
                    batch = db.batch();
                    batchCount = 0;
                }
                
                console.log(`Updated [${row['Cus Name']}] TX ${txId}: ${currentDbDateParsed} -> ${excelDateParsed}`);
                fixedCount++;
            }
        }
    }
    
    if (batchCount > 0) {
        await batch.commit();
    }
    
    console.log(`Successfully fixed ${fixedCount} transaction dates (chronologically sorted).`);
    process.exit(0);
}

fixDates().catch(console.error);
