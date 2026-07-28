const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== UPDATING INSTALLMENTS FOR AMUDHA (VS1003 / 9663270945 / ACC-6LUP2JI9) ===\n");

    const accountId = 'ACC-6LUP2JI9';
    const userId = '9663270945';
    const schemeDocId = 'sSs7GxzQbwXO5KPhnihJ';

    // 1. Update 3rd installment date from 08-04-2026 to 11-04-2026
    const tx3Id = '7YpMQc72vhTXA8UrDFJq';
    console.log(`1. Correcting 3rd installment (doc ${tx3Id}) date from 08-04-2026 -> 11-04-2026`);
    await db.collection('transactions').doc(tx3Id).update({
        date: '11-04-2026',
        timestamp: '2026-04-11T10:00:00.000Z'
    });

    // 2. Also ensure 1st and 2nd installments have clean timestamps matching their calendar date
    const tx1Id = 'PoD5u03vbZ1tYQlKOute';
    await db.collection('transactions').doc(tx1Id).update({
        date: '19-02-2026',
        timestamp: '2026-02-19T10:00:00.000Z'
    });
    const tx2Id = 'VPRVZjkapP9beXwQMwrs';
    await db.collection('transactions').doc(tx2Id).update({
        date: '08-03-2026',
        timestamp: '2026-03-08T10:00:00.000Z'
    });

    // 3. Add missing 4th, 5th, and 6th installments
    const newInstallments = [
        { date: '26-05-2026', timestamp: '2026-05-26T10:00:00.000Z', name: '4th Installment' },
        { date: '26-06-2026', timestamp: '2026-06-26T10:00:00.000Z', name: '5th Installment' },
        { date: '26-07-2026', timestamp: '2026-07-26T10:00:00.000Z', name: '6th Installment' }
    ];

    for (const inst of newInstallments) {
        // Check if already added to avoid duplicates if re-run
        const existSnap = await db.collection('transactions')
            .where('accountId', '==', accountId)
            .where('date', '==', inst.date)
            .get();
        
        if (existSnap.empty) {
            console.log(`2. Adding ${inst.name}: Date=${inst.date}, Amount=₹200`);
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
                userName: 'AMUDHA',
                userPhone: userId,
                recordedBy: 'admin',
                recordedByName: 'Admin (Handwritten Sync)'
            });
        } else {
            console.log(`2. ${inst.name} (${inst.date}) already exists. Skipping add.`);
        }
    }

    // 4. Update scheme totalPaid and monthsPaid
    console.log(`3. Updating Scheme ${schemeDocId}: totalPaid=₹1200, monthsPaid=6`);
    await db.collection('user_schemes').doc(schemeDocId).update({
        totalPaid: 1200,
        monthsPaid: 6,
        enrollmentDate: '19-02-2026'
    });

    // 5. Verification
    const finalTxSnap = await db.collection('transactions').where('accountId', '==', accountId).get();
    let allTxs = [];
    finalTxSnap.forEach(d => allTxs.push({ id: d.id, ...d.data() }));
    allTxs.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

    console.log(`\n=== VERIFIED COMPLETE INSTALLMENTS FOR AMUDHA (ACC-6LUP2JI9) ===`);
    allTxs.forEach((t, i) => {
        console.log(`  [${i + 1}/6] Date: ${t.date} | Amount: ₹${t.amount} | Status: ${t.status} | DocID: ${t.id}`);
    });

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
