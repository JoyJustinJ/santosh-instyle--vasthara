/**
 * Update SELVI.R (Phone: 7708308986, Customer ID: VS1073) DOJ and 1st Installment date.
 * Issue: The date 11/1/2026 (January 11, 2026) was incorrectly parsed as November 1, 2026 (01-11-2026).
 * Fix:
 *   - Update Scheme (qzsXzdNUrj7kjjnzmREC) enrollmentDate: 01-11-2026 -> 11-01-2026
 *   - Update 1st installment transaction (0iJznnM4VzS6quhgNYZb): date 01-11-2026 -> 11-01-2026 & timestamp -> 2026-01-11T10:00:00.000Z
 */
const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== UPDATING SELVI.R (VS1073 | Phone: 7708308986) DOJ & 1ST INSTALLMENT ===\n");
    const batch = db.batch();

    // 1. Update Scheme DOJ
    const schemeRef = db.collection('user_schemes').doc('qzsXzdNUrj7kjjnzmREC');
    batch.update(schemeRef, {
        enrollmentDate: '11-01-2026',
        createdAt: '2026-01-11T10:00:00.000Z'
    });
    console.log("-> Scheme qzsXzdNUrj7kjjnzmREC: updated enrollmentDate to 11-01-2026 (January 11, 2026)");

    // 2. Update 1st Installment Transaction
    const txRef = db.collection('transactions').doc('0iJznnM4VzS6quhgNYZb');
    batch.update(txRef, {
        date: '11-01-2026',
        timestamp: '2026-01-11T10:00:00.000Z',
        status: 'Success'
    });
    console.log("-> Transaction 0iJznnM4VzS6quhgNYZb: updated date to 11-01-2026 and timestamp to 2026-01-11T10:00:00.000Z\n");

    console.log("Committing updates to Firestore...");
    await batch.commit();
    console.log("✅ Updates committed successfully!\n");

    // Verification
    console.log("=== VERIFYING UPDATED RECORDS FOR SELVI.R ===");
    const schemeSnap = await schemeRef.get();
    console.log(`Scheme ID: ${schemeSnap.id} | DOJ: "${schemeSnap.data().enrollmentDate}" | Months Paid: ${schemeSnap.data().monthsPaid} | Total Paid: ₹${schemeSnap.data().totalPaid}`);

    const txSnap = await db.collection('transactions').where('userId', '==', '7708308986').get();
    const finalTxs = [];
    txSnap.forEach(d => finalTxs.push({ id: d.id, ...d.data() }));
    finalTxs.sort((a,b) => (a.timestamp || a.date).localeCompare(b.timestamp || b.date));

    console.log(`\nVerified Transaction History (${finalTxs.length} records in chronological order):`);
    finalTxs.forEach((t, i) => {
        console.log(`  [${i+1}] Date: "${t.date}" (${t.id}) | Amount: ₹${t.amount} | Status: ${t.status} | Account: ${t.accountId}`);
    });

    process.exit(0);
}

main().catch(err => {
    console.error("Error updating records:", err);
    process.exit(1);
});
