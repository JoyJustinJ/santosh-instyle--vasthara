/**
 * Fix script: Customer 8220067696 installment corrections:
 *   - 1st installment date: 21-12-2024
 *   - 2nd installment date: 28-01-2025
 *
 * This script fetches all transactions for this customer (sorted by timestamp),
 * then sets the correct dates for the 1st and 2nd installments.
 */
const admin = require('firebase-admin');

const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixCustomer8220067696() {
    const phone = '8220067696';
    console.log(`=== Fixing installments for customer: ${phone} ===\n`);

    // Try to find the user first
    let userIds = [phone];
    const usersQuery = await db.collection('users').where('phone', '==', phone).get();
    if (!usersQuery.empty) {
        const userId = usersQuery.docs[0].id;
        console.log(`Found user document ID: ${userId}`);
        if (!userIds.includes(userId)) userIds.push(userId);
    }

    let allTxs = [];
    for (const uid of userIds) {
        const txSnap = await db.collection('transactions').where('userId', '==', uid).get();
        txSnap.forEach(doc => {
            allTxs.push({ id: doc.id, ref: doc.ref, ...doc.data() });
        });
    }

    // Deduplicate by id
    allTxs = allTxs.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

    console.log(`Found ${allTxs.length} total transactions\n`);
    
    if (allTxs.length === 0) {
        console.log("No transactions found. Nothing to fix.");
        process.exit(0);
    }

    // Sort by timestamp to determine order
    allTxs.sort((a, b) => {
        const ta = new Date(a.timestamp || a.date || '').getTime();
        const tb = new Date(b.timestamp || b.date || '').getTime();
        return ta - tb;
    });

    console.log("Current transactions (sorted by timestamp):");
    allTxs.forEach((tx, i) => {
        console.log(`  [${i + 1}] ID: ${tx.id} | date: ${tx.date} | timestamp: ${tx.timestamp}`);
    });

    const corrections = [
        { index: 0, newDate: '21-12-2024', newTimestamp: '2024-12-21T10:00:00.000Z', label: '1st installment' },
        { index: 1, newDate: '28-01-2025', newTimestamp: '2025-01-28T10:00:00.000Z', label: '2nd installment' },
    ];

    const batch = db.batch();
    for (const correction of corrections) {
        if (allTxs[correction.index]) {
            const tx = allTxs[correction.index];
            console.log(`\nFixing ${correction.label}: ${tx.date} → ${correction.newDate}`);
            batch.update(tx.ref, {
                date: correction.newDate,
                timestamp: correction.newTimestamp
            });
        } else {
            console.log(`WARNING: ${correction.label} (index ${correction.index}) not found!`);
        }
    }

    await batch.commit();
    console.log("\n✅ Done! Installment dates for 8220067696 have been fixed.");
    process.exit(0);
}

fixCustomer8220067696().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
