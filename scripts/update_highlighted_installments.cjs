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
        return { dateStr, isoStr };
    }
    return { dateStr: str, isoStr: new Date().toISOString() };
}

function parseDoj(dojRaw) {
    if (!dojRaw) return null;
    let str = String(dojRaw).trim().replace(/\//g, '-');
    let parts = str.split('-');
    if (parts.length === 3) {
        let day = parts[0].padStart(2, '0');
        let month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        return { dateStr: `${day}-${month}-${year}`, isoStr: `${year}-${month}-${day}T10:00:00.000Z` };
    }
    return null;
}

async function main() {
    console.log("=== UPDATING HIGHLIGHTED CUSTOMERS & INSTALLMENTS IN FIRESTORE ===\n");
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

    let updatedSchemesCount = 0;
    let addedTxCount = 0;

    for (let i = 1; i < data.length; i++) {
        if (!highlightedRows.has(i + 1)) continue;

        const row = data[i];
        const cusId = row[2];
        const phone = row[3];
        const name = row[4];
        const dojRaw = row[5];
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

        if (!matchedScheme) {
            console.log(`⚠️ Row ${i + 1}: No matched DB scheme for ${name} (${cusId} / ${phone})! Skipping...`);
            continue;
        }

        console.log(`\n--- Row ${i + 1}: ${name} (${cusId}, Phone: ${phone}) [Account: ${matchedScheme.accountId}] ---`);

        // Fetch current transactions from Firestore for this scheme
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
                dbTxs.push({ id: doc.id, ...t, parsedDate: dStr, isoStr });
            }
        });

        // Sort chronologically
        dbTxs.sort((a, b) => new Date(a.isoStr || 0).getTime() - new Date(b.isoStr || 0).getTime());

        // Check if there are missing installments
        let newInstallmentsToAdd = [];

        // Special check for PUJITH (Row 64) who is missing both 1st installment (28-02-2026) and latest installment
        if (cusId === 'VS1053' || phone === '7708956941') {
            const hasFeb = dbTxs.some(t => t.parsedDate === '28-02-2026');
            if (!hasFeb && excelInst.includes('28-02-2026')) {
                newInstallmentsToAdd.push('28-02-2026');
            }
            const latest = excelInst[excelInst.length - 1]; // 3/7/26 -> 03-07-2026
            const normLatest = normalizeDateStr(latest).dateStr;
            const hasLatest = dbTxs.some(t => t.parsedDate === normLatest);
            if (!hasLatest) {
                newInstallmentsToAdd.push(latest);
            }
        } else if (excelInst.length > dbTxs.length) {
            // For general cases, the trailing installments in Excel are new
            const missingCount = excelInst.length - dbTxs.length;
            newInstallmentsToAdd = excelInst.slice(dbTxs.length);
        }

        // Add missing transactions to Firestore
        for (const rawDate of newInstallmentsToAdd) {
            const { dateStr, isoStr } = normalizeDateStr(rawDate);
            console.log(`  ➕ Adding missing transaction: Date=${dateStr} (${isoStr}), Amt=₹${schemeAmt}`);
            await db.collection('transactions').add({
                accountId: matchedScheme.accountId,
                userId: matchedScheme.userId,
                amount: schemeAmt,
                date: dateStr,
                timestamp: isoStr,
                method: 'CASH',
                status: 'Success',
                type: 'installment',
                schemeName: matchedScheme.schemeName || matchedScheme.name || 'Gold Scheme',
                userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : name,
                userPhone: phone,
                recordedBy: 'admin',
                recordedByName: 'Admin (Excel Sync)'
            });
            addedTxCount++;
        }

        // Refetch all transactions after adding to ensure clean order and state
        const refetchSnap = await db.collection('transactions')
            .where('accountId', '==', matchedScheme.accountId)
            .get();

        let updatedTxs = [];
        refetchSnap.forEach(doc => {
            const t = doc.data();
            if (['Success', 'success', 'paid', 'completed'].includes(t.status)) {
                let ts = t.timestamp;
                let isoStr = ts ? (typeof ts === 'string' ? ts : (ts.toDate ? ts.toDate().toISOString() : new Date(ts).toISOString())) : '';
                let dStr = t.date || (isoStr ? isoStr.split('T')[0] : 'N/A');
                updatedTxs.push({ id: doc.id, ...t, parsedDate: dStr, isoStr });
            }
        });
        updatedTxs.sort((a, b) => new Date(a.isoStr || 0).getTime() - new Date(b.isoStr || 0).getTime());

        // Ensure 1st installment matches DOJ ("the 1st month installment should be same as doj and then regular as the dates")
        const parsedDoj = parseDoj(dojRaw || matchedScheme.enrollmentDate);
        if (parsedDoj && updatedTxs.length > 0) {
            const firstTx = updatedTxs[0];
            if (firstTx.parsedDate !== parsedDoj.dateStr) {
                console.log(`  🔄 Aligning 1st Installment Date (${firstTx.parsedDate}) to equal DOJ (${parsedDoj.dateStr})`);
                await db.collection('transactions').doc(firstTx.id).update({
                    date: parsedDoj.dateStr,
                    timestamp: parsedDoj.isoStr
                });
            }
        }

        // Update scheme totalPaid and monthsPaid in Firestore
        const finalTotalPaid = updatedTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const finalMonthsPaid = updatedTxs.length;

        if (Number(matchedScheme.totalPaid) !== finalTotalPaid || Number(matchedScheme.monthsPaid) !== finalMonthsPaid) {
            console.log(`  💾 Updating Scheme ${matchedScheme.id}: totalPaid ₹${matchedScheme.totalPaid} -> ₹${finalTotalPaid}, monthsPaid ${matchedScheme.monthsPaid} -> ${finalMonthsPaid}`);
            await db.collection('user_schemes').doc(matchedScheme.id).update({
                totalPaid: finalTotalPaid,
                monthsPaid: finalMonthsPaid
            });
            updatedSchemesCount++;
        } else {
            console.log(`  ✅ Scheme stats up-to-date: totalPaid=₹${finalTotalPaid}, monthsPaid=${finalMonthsPaid}`);
        }
    }

    console.log(`\n=== SUMMARY: Successfully added ${addedTxCount} missing transactions and updated ${updatedSchemesCount} user scheme records! ===`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
