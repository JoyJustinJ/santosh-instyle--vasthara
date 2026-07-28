/**
 * Restore Sudharshan's transactions to the exact original dates
 * as shown in the source data image:
 *   1st:  10-11-2024
 *   2nd:  02-12-2025
 *   3rd:  02-01-2026
 *   4th:  03-02-2026
 *   5th:  02-03-2026
 *   6th:  02-05-2026
 *   7th:  02-06-2026
 */
const admin = require('firebase-admin');

const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// Exact dates from the original source image (in order)
const correctDates = [
    { date: '10-11-2024', timestamp: '2024-11-10T10:00:00.000Z', label: '1st installment' },
    { date: '02-12-2025', timestamp: '2025-12-02T10:00:00.000Z', label: '2nd installment' },
    { date: '02-01-2026', timestamp: '2026-01-02T10:00:00.000Z', label: '3rd installment' },
    { date: '03-02-2026', timestamp: '2026-02-03T10:00:00.000Z', label: '4th installment' },
    { date: '02-03-2026', timestamp: '2026-03-02T10:00:00.000Z', label: '5th installment' },
    { date: '02-05-2026', timestamp: '2026-05-02T10:00:00.000Z', label: '6th installment' },
    { date: '02-06-2026', timestamp: '2026-06-02T10:00:00.000Z', label: '7th installment' },
];

async function restoreSudharshan() {
    console.log("=== Restoring SUDHARSHAN.B original dates ===\n");

    const userId = '9916729721';
    const txSnap = await db.collection('transactions').where('userId', '==', userId).get();

    let txs = [];
    txSnap.forEach(doc => txs.push({ id: doc.id, ref: doc.ref, ...doc.data() }));

    // Sort by current timestamp to preserve original order
    txs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log(`Found ${txs.length} transactions. Assigning ${correctDates.length} dates from image.\n`);

    const batch = db.batch();

    for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];
        if (correctDates[i]) {
            const c = correctDates[i];
            console.log(`[${i + 1}] TX ${tx.id}: ${tx.date} → ${c.date}  (${c.label})`);
            batch.update(tx.ref, { date: c.date, timestamp: c.timestamp });
        } else {
            console.log(`[${i + 1}] TX ${tx.id}: ${tx.date} — no correction (not in image, left unchanged)`);
        }
    }

    await batch.commit();
    console.log("\n✅ Done! SUDHARSHAN.B dates restored to original image values.");
    process.exit(0);
}

restoreSudharshan().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
