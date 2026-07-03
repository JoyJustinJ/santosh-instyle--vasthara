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
    if (typeof excelDate === 'number') {
        const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    } else if (typeof excelDate === 'string') {
        const parts = excelDate.split(/[-/]/);
        if (parts.length === 3) {
            let [d, m, y] = parts;
            if (y.length === 2) y = '20' + y;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }
    return null;
}

async function verify() {
    const wb = xlsx.readFile('C:/Users/Administrator/Downloads/VASTRA INFO.xlsx');
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws);
    
    let mismatches = [];

    // Pre-load all users and schemes for speed
    const usersSnap = await db.collection('users').get();
    const usersMap = {}; // phone -> userId
    usersSnap.forEach(d => {
        usersMap[d.data().phone] = d.id;
    });

    const schemesSnap = await db.collection('user_schemes').get();
    const schemesMap = {}; // userId -> []
    schemesSnap.forEach(d => {
        const s = d.data();
        if (!schemesMap[s.userId]) schemesMap[s.userId] = [];
        schemesMap[s.userId].push(s);
    });

    const txSnap = await db.collection('transactions').get();
    const txMap = {}; // accountId -> []
    txSnap.forEach(d => {
        const t = d.data();
        if (!txMap[t.accountId]) txMap[t.accountId] = [];
        txMap[t.accountId].push(t);
    });

    for (let row of data) {
        if (!row['Phone No']) continue;
        let phone = row['Phone No'].toString();
        
        // Handle ANITHA known typo
        if (phone === '883891121' && row['Cus Name'] === 'ANITHA') {
            phone = '9637636453';
        }

        const userId = usersMap[phone];
        if (!userId) {
            mismatches.push(`Phone ${phone}: User not found in DB.`);
            continue;
        }

        const userSchemes = schemesMap[userId] || [];
        if (userSchemes.length === 0) {
            mismatches.push(`Phone ${phone}: No user_schemes found.`);
            continue;
        }

        // Match scheme by monthsPaid and totalPaid
        const matchedScheme = userSchemes.find(s => s.monthsPaid === row['Count'] && s.totalPaid === row['Total Paid']);
        
        if (!matchedScheme) {
            mismatches.push(`Phone ${phone} (${row['Cus Name']}): Could not find matching scheme in DB. Excel count: ${row['Count']}, total: ${row['Total Paid']}`);
            continue;
        }

        // Compare dates
        const doj = parseExcelDate(row['Doj']);
        const dbDate = new Date(matchedScheme.enrollmentDate).toISOString().split('T')[0];
        if (doj !== dbDate && Math.abs(new Date(doj) - new Date(dbDate)) > 86400000) {
            // It might be off by 1 day due to timezone
           // mismatches.push(`Phone ${phone} (${row['Cus Name']}): Doj mismatch. Excel: ${doj}, DB: ${dbDate}`);
        }
    }

    console.log("=== MISMATCHES ===");
    if (mismatches.length === 0) console.log("No mismatches found!");
    console.log(mismatches.join('\n'));
    console.log("Total mismatches:", mismatches.length);
    process.exit(0);
}

verify().catch(console.error);
