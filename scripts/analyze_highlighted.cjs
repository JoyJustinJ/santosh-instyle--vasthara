const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const XLSX = require('xlsx');

async function main() {
    console.log("=== DETAILED ANALYSIS OF HIGHLIGHTED ROWS IN 'VASTRA NEW.xlsx' ===\n");
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

    let idx = 1;
    for (let i = 1; i < data.length; i++) {
        if (!highlightedRows.has(i + 1)) continue;

        const row = data[i];
        const sNo = row[0];
        const schemeId = row[1];
        const cusId = row[2];
        const phone = row[3];
        const name = row[4];
        const doj = row[5];
        const schemeAmt = Number(row[6] || 0);

        const excelInst = [];
        for (let c = 7; c <= 18; c++) {
            if (row[c] && typeof row[c] === 'string' && row[c].trim() !== '') {
                excelInst.push(row[c].trim());
            }
        }

        const user = userByPhone[phone] || userByCusId[cusId];
        let dbSchemes = [];
        if (user) {
            dbSchemes = schemes.filter(s => s.userId === user.id || s.phone === phone || s.userId === phone);
        } else {
            dbSchemes = schemes.filter(s => s.phone === phone || s.userId === phone);
        }

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

        console.log(`\n--- [${idx++}/18] Row ${i + 1} : ${name} (${cusId} / ${phone}) ---`);
        console.log(`  DoJ in Excel: ${doj} | Scheme Amt: ₹${schemeAmt}`);
        console.log(`  Excel Installments (${excelInst.length}):`, JSON.stringify(excelInst));
        console.log(`  DB Installments    (${dbTxDates.length}):`, JSON.stringify(dbTxDates));
        if (matchedScheme) {
            console.log(`  Scheme DB: accountId=${matchedScheme.accountId}, docId=${matchedScheme.id}, totalPaid=₹${matchedScheme.totalPaid}, monthsPaid=${matchedScheme.monthsPaid}`);
            // Show diff in transactions
            if (excelInst.length > dbTxDates.length) {
                const missing = excelInst.slice(dbTxDates.length);
                console.log(`  -> ACTION NEEDED: Add missing ${missing.length} installment(s) in DB:`, JSON.stringify(missing));
            } else if (JSON.stringify(excelInst) !== JSON.stringify(dbTxDates)) {
                console.log(`  -> ACTION NEEDED: Mismatch in installment dates between Excel and DB!`);
            } else {
                console.log(`  -> STATUS: Already in sync!`);
            }
        } else {
            console.log(`  -> ACTION NEEDED: No matching scheme found in DB!`);
        }
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
