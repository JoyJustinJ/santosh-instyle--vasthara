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

    for (let row of data) {
        if (!row['Phone No']) continue;
        const phone = row['Phone No'].toString();
        
        const usersRef = await db.collection('users').where('phone', '==', phone).get();
        if (usersRef.empty) {
            mismatches.push(`Phone ${phone}: User not found in DB.`);
            continue;
        }
        const user = usersRef.docs[0];
        const userId = user.id;

        const schemesRef = await db.collection('user_schemes').where('userId', '==', userId).get();
        if (schemesRef.empty) {
            mismatches.push(`Phone ${phone}: No user_schemes found.`);
            continue;
        }
        const schemeDoc = schemesRef.docs[0];
        const scheme = schemeDoc.data();

        const txRef = await db.collection('transactions').where('userId', '==', userId).get();
        const txs = txRef.docs.map(d => d.data());

        // Check Count
        if (scheme.monthsPaid !== row['Count']) {
            mismatches.push(`Phone ${phone} (${row['Cus Name']}): Count mismatch. Excel: ${row['Count']}, DB scheme monthsPaid: ${scheme.monthsPaid}`);
        }
        if (txs.length !== row['Count']) {
            mismatches.push(`Phone ${phone} (${row['Cus Name']}): Tx length mismatch. Excel count: ${row['Count']}, DB tx length: ${txs.length}`);
        }

        // Check Total Paid
        if (scheme.totalPaid !== row['Total Paid']) {
            mismatches.push(`Phone ${phone} (${row['Cus Name']}): Total Paid mismatch. Excel: ${row['Total Paid']}, DB: ${scheme.totalPaid}`);
        }
    }

    console.log("=== MISMATCHES ===");
    console.log(mismatches.join('\n'));
    console.log("Total mismatches:", mismatches.length);
    process.exit(0);
}

verify().catch(console.error);
