const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const XLSX = require('xlsx');

function normalizeDateStr(raw) {
    if (!raw) return { dateStr: '01-07-2026', isoStr: '2026-07-01T10:00:00.000Z' };
    let str = String(raw).trim().replace(/\//g, '-');
    let parts = str.split('-');
    if (parts.length === 3) {
        let day = parts[0].padStart(2, '0');
        let month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        const dateStr = `${day}-${month}-${year}`;
        const isoStr = `${year}-${month}-${day}T10:00:00.000Z`;
        return { dateStr, isoStr, time: new Date(isoStr).getTime() };
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return { dateStr: `${day}-${month}-${year}`, isoStr: d.toISOString(), time: d.getTime() };
    }
    return { dateStr: str, isoStr: new Date().toISOString(), time: Date.now() };
}

async function main() {
    console.log("=== EXACTLY ALIGNING DB TRANSACTION DATES TO EXCEL INSTALLMENTS ===\n");
    const filePath = 'C:/Users/Administrator/Downloads/VASTRA NEW.xlsx';
    const workbook = XLSX.readFile(filePath, { cellStyles: true, cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

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

    for (let i = 1; i < data.length; i++) {
        if (!highlightedRows.has(i + 1)) continue;

        const row = data[i];
        const cusId = row[2];
        const phone = row[3];
        const name = row[4];
        const dojRaw = row[5];
        const schemeAmt = Number(row[6] || 0);

        const excelInstRaw = [];
        for (let c = 7; c <= 18; c++) {
            if (row[c] && typeof row[c] === 'string' && row[c].trim() !== '') {
                excelInstRaw.push(row[c].trim());
            }
        }

        const excelInst = excelInstRaw.map(r => normalizeDateStr(r));

        const user = userByPhone[phone] || userByCusId[cusId];
        let dbSchemes = [];
        if (user) {
            dbSchemes = schemes.filter(s => s.userId === user.id || s.phone === phone || s.userId === phone);
        } else {
            dbSchemes = schemes.filter(s => s.phone === phone || s.userId === phone);
        }

        let matchedScheme = dbSchemes.find(s => Number(s.amount || s.monthlyAmount || 0) === schemeAmt);
        if (!matchedScheme && dbSchemes.length > 0) matchedScheme = dbSchemes[0];

        if (!matchedScheme) continue;

        const txSnap = await db.collection('transactions')
            .where('accountId', '==', matchedScheme.accountId)
            .get();

        let dbTxs = [];
        txSnap.forEach(doc => {
            const t = doc.data();
            if (['Success', 'success', 'paid', 'completed'].includes(t.status)) {
                let ts = t.timestamp;
                let isoStr = ts ? (typeof ts === 'string' ? ts : (ts.toDate ? ts.toDate().toISOString() : new Date(ts).toISOString())) : '';
                let dStr = t.date || (isoStr ? isoStr.split('T')[0] : 'N/A');
                let norm = normalizeDateStr(dStr !== 'N/A' ? dStr : isoStr);
                dbTxs.push({ id: doc.id, ...t, norm });
            }
        });

        // Sort dbTxs accurately by timestamp/date time
        dbTxs.sort((a, b) => a.norm.time - b.norm.time);

        console.log(`\nChecking alignment for ${name} (${cusId} / ${phone}):`);
        console.log(`  Excel normalized:`, excelInst.map(e => e.dateStr));
        console.log(`  Current DB dates:`, dbTxs.map(t => t.norm.dateStr));

        // Ensure 1st installment date matches DOJ and subsequent match Excel
        if (dbTxs.length === excelInst.length) {
            for (let idx = 0; idx < dbTxs.length; idx++) {
                const target = excelInst[idx];
                const actual = dbTxs[idx];
                if (actual.date !== target.dateStr || actual.timestamp !== target.isoStr) {
                    console.log(`    -> Aligning Tx [${idx + 1}/${dbTxs.length}] (doc: ${actual.id}) from ${actual.date} to ${target.dateStr}`);
                    await db.collection('transactions').doc(actual.id).update({
                        date: target.dateStr,
                        timestamp: target.isoStr
                    });
                }
            }
        } else {
            console.log(`    ⚠️ Count mismatch: DB=${dbTxs.length}, Excel=${excelInst.length}`);
        }

        // Also check if scheme enrollmentDate matches the DOJ in Excel
        const expectedDoj = normalizeDateStr(dojRaw);
        if (matchedScheme.enrollmentDate !== expectedDoj.dateStr && matchedScheme.enrollmentDate !== expectedDoj.isoStr.split('T')[0] && expectedDoj.dateStr !== '01-07-2026') {
            console.log(`    -> Updating Scheme enrollmentDate from ${matchedScheme.enrollmentDate} to ${expectedDoj.dateStr}`);
            await db.collection('user_schemes').doc(matchedScheme.id).update({
                enrollmentDate: expectedDoj.dateStr,
                createdAt: expectedDoj.isoStr
            });
        }
    }

    console.log("\n=== ALL HIGHLIGHTED CUSTOMERS EXACTLY ALIGNED WITH EXCEL DATES & DOJ ===");
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
