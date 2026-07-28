const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== UPDATING INSTALLMENTS FOR MANJULA.A (VS1039 / 8870384464 / ACC-JKAHLUBM) ===\n");

    const accountId = 'ACC-JKAHLUBM';
    const userId = '8870384464';
    const schemeDocId = 'ztTrsmCJqhmbG6EGGKWn';

    // 1. Correct 1st installment date to match DOJ (21-01-2026 instead of 01-02-2026)
    const tx1Id = 'Rekoln7AleShzA1ZQVoW';
    console.log(`1. Correcting 1st installment (doc ${tx1Id}) date from 01-02-2026 -> 21-01-2026 (matching DOJ)`);
    await db.collection('transactions').doc(tx1Id).update({
        date: '21-01-2026',
        timestamp: '2026-01-21T10:00:00.000Z'
    });

    // 2. Ensure 2nd installment has clean timestamp matching its calendar date (12-02-2026)
    const tx2Id = '34CtdN1D2skchpPvHJyq';
    console.log(`2. Aligning 2nd installment (doc ${tx2Id}) timestamp to 2026-02-12`);
    await db.collection('transactions').doc(tx2Id).update({
        date: '12-02-2026',
        timestamp: '2026-02-12T10:00:00.000Z'
    });

    // 3. Add missing 3rd, 4th, 5th, 6th, and 7th installments
    const newInstallments = [
        { date: '08-03-2026', timestamp: '2026-03-08T10:00:00.000Z', name: '3rd Installment' },
        { date: '11-04-2026', timestamp: '2026-04-11T10:00:00.000Z', name: '4th Installment' },
        { date: '26-05-2026', timestamp: '2026-05-26T10:00:00.000Z', name: '5th Installment' },
        { date: '26-06-2026', timestamp: '2026-06-26T10:00:00.000Z', name: '6th Installment' },
        { date: '26-07-2026', timestamp: '2026-07-26T10:00:00.000Z', name: '7th Installment' }
    ];

    for (const inst of newInstallments) {
        const existSnap = await db.collection('transactions')
            .where('accountId', '==', accountId)
            .where('date', '==', inst.date)
            .get();
        
        if (existSnap.empty) {
            console.log(`3. Adding ${inst.name}: Date=${inst.date}, Amount=₹200`);
            await db.collection('transactions').add({
                accountId: accountId,
                userId: userId,
                amount: 200,
                date: inst.date,
                timestamp: inst.timestamp,
                method: 'CASH',
                status: 'Success',
                type: 'installment',
                schemeName: 'Gold Scheme',
                userName: 'MANJULA.A',
                userPhone: userId,
                recordedBy: 'admin',
                recordedByName: 'Admin (Handwritten Sync)'
            });
        } else {
            console.log(`3. ${inst.name} (${inst.date}) already exists. Skipping add.`);
        }
    }

    // 4. Update scheme enrollmentDate, totalPaid, and monthsPaid
    console.log(`4. Updating Scheme ${schemeDocId}: enrollmentDate=21-01-2026, totalPaid=₹1400, monthsPaid=7`);
    await db.collection('user_schemes').doc(schemeDocId).update({
        enrollmentDate: '21-01-2026',
        createdAt: '2026-01-21T10:00:00.000Z',
        totalPaid: 1400,
        monthsPaid: 7
    });

    // 5. Verification
    const finalTxSnap = await db.collection('transactions').where('accountId', '==', accountId).get();
    let allTxs = [];
    finalTxSnap.forEach(d => allTxs.push({ id: d.id, ...d.data() }));
    allTxs.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

    console.log(`\n=== VERIFIED COMPLETE INSTALLMENTS FOR MANJULA.A (ACC-JKAHLUBM) ===`);
    allTxs.forEach((t, i) => {
        console.log(`  [${i + 1}/7] Date: ${t.date} | Amount: ₹${t.amount} | Status: ${t.status} | DocID: ${t.id}`);
    });

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
