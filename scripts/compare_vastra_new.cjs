const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const XLSX = require('xlsx');
const fs = require('fs');

async function main() {
    console.log("=== COMPARING 'VASTRA NEW.xlsx' WITH FIRESTORE DATABASE ===\n");
    const filePath = 'C:/Users/Administrator/Downloads/VASTRA NEW.xlsx';
    const workbook = XLSX.readFile(filePath, { cellStyles: true, cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    // Identify highlighted rows
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const highlightedRows = new Set();
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = sheet[cellAddress];
            if (cell && cell.s && (cell.s.fill || cell.s.fgColor || cell.s.bgColor || (cell.s.patternType && cell.s.patternType !== 'none'))) {
                highlightedRows.add(R + 1);
            }
        }
    }

    console.log(`Detected ${highlightedRows.size} highlighted rows:`, Array.from(highlightedRows).sort((a, b) => a - b));

    // Fetch all users, schemes, and transactions from Firestore
    const usersSnap = await db.collection('users').get();
    const userByPhone = {};
    const userByCusId = {};
    usersSnap.forEach(d => {
        const u = d.data();
        if (u.phone) userByPhone[u.phone] = { id: d.id, ...u };
        if (u.customerId) userByCusId[u.customerId] = { id: d.id, ...u };
    });

    const schemesSnap = await db.collection('user_schemes').get();
    const schemes = [];
    schemesSnap.forEach(d => schemes.push({ id: d.id, ...d.data() }));

    const txSnap = await db.collection('transactions').get();
    const allTx = [];
    txSnap.forEach(d => allTx.push({ id: d.id, ...d.data() }));

    console.log("\n--- ANALYZING HIGHLIGHTED CUSTOMERS & DIFFERENCES ---");

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0 || (!row[2] && !row[3] && !row[4])) continue;

        const sNo = row[0];
        const schemeId = row[1];
        const cusId = row[2];
        const phone = row[3];
        const name = row[4];
        const doj = row[5];
        const schemeAmt = Number(row[6] || 0);

        const isHighlighted = highlightedRows.has(i + 1);

        // Extract installments from Excel
        const excelInst = [];
        for (let c = 7; c <= 18; c++) {
            if (row[c] && typeof row[c] === 'string' && row[c].trim() !== '') {
                excelInst.push(row[c].trim());
            }
        }

        // Find corresponding user in DB
        const user = userByPhone[phone] || userByCusId[cusId];
        let dbSchemes = [];
        if (user) {
            dbSchemes = schemes.filter(s => s.userId === user.id || s.phone === phone || s.userId === phone);
        } else {
            dbSchemes = schemes.filter(s => s.phone === phone || s.userId === phone);
        }

        // Find best matching scheme by amount
        let matchedScheme = dbSchemes.find(s => Number(s.amount || s.monthlyAmount || 0) === schemeAmt);
        if (!matchedScheme && dbSchemes.length > 0) matchedScheme = dbSchemes[0];

        let dbTxDates = [];
        let dbTxObjects = [];
        if (matchedScheme) {
            dbTxObjects = allTx.filter(t => t.accountId === matchedScheme.accountId && ['Success', 'success', 'paid', 'completed'].includes(t.status));
            dbTxObjects.sort((a, b) => {
                const tA = new Date(a.timestamp || 0).getTime();
                const tB = new Date(b.timestamp || 0).getTime();
                return tA - tB;
            });
            dbTxDates = dbTxObjects.map(t => {
                if (t.date) return t.date;
                if (!t.timestamp) return 'N/A';
                const ts = typeof t.timestamp === 'string' ? t.timestamp : (t.timestamp.toDate ? t.timestamp.toDate().toISOString() : new Date(t.timestamp).toISOString());
                return ts.split('T')[0];
            });
        }

        // Check if there's any discrepancy between Excel installments and DB installments
        const isDiff = JSON.stringify(excelInst) !== JSON.stringify(dbTxDates) || excelInst.length !== dbTxDates.length;

        if (isHighlighted || isDiff) {
            const prefix = isHighlighted ? "✨ [HIGHLIGHTED]" : "⚠️ [DIFF ONLY]";
            console.log(`\n${prefix} Row ${i + 1} | ${name} (${cusId}, Phone: ${phone}) | DoJ: ${doj} | Amt: ₹${schemeAmt}`);
            console.log(`  Excel Installments (${excelInst.length}):`, JSON.stringify(excelInst));
            console.log(`  DB Installments    (${dbTxDates.length}):`, JSON.stringify(dbTxDates));
            if (!matchedScheme) {
                console.log(`  ⚠️ No matching scheme found in DB!`);
            } else {
                console.log(`  Matched DB Scheme: ${matchedScheme.accountId} (Status: ${matchedScheme.status}, TotalPaid: ${matchedScheme.totalPaid})`);
            }
        }
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
