const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixDates() {
    const txRef = await db.collection('transactions').where('userId', '==', 'w0erPLg81lVkFGlwedHN5UMJRDq2').get();
    
    // Sort transactions by their current date string to order them correctly
    let transactions = [];
    txRef.forEach(doc => {
        transactions.push({ id: doc.id, data: doc.data() });
    });
    
    // Sort by timestamp
    transactions.sort((a, b) => new Date(a.data.timestamp) - new Date(b.data.timestamp));

    // Desired dates (from July 2025 to May 2026)
    const fixedDates = [
        "29/07/2025",
        "29/08/2025",
        "29/09/2025",
        "29/10/2025",
        "29/11/2025",
        "29/12/2025",
        "29/01/2026",
        "28/02/2026", // fixed leap year bug
        "29/03/2026",
        "29/04/2026",
        "29/05/2026"
    ];

    const fixedTimestamps = [
        "2025-07-29T10:00:00.000Z",
        "2025-08-29T10:00:00.000Z",
        "2025-09-29T10:00:00.000Z",
        "2025-10-29T10:00:00.000Z",
        "2025-11-29T10:00:00.000Z",
        "2025-12-29T10:00:00.000Z",
        "2026-01-29T10:00:00.000Z",
        "2026-02-28T10:00:00.000Z",
        "2026-03-29T10:00:00.000Z",
        "2026-04-29T10:00:00.000Z",
        "2026-05-29T10:00:00.000Z"
    ];

    const batch = db.batch();

    for (let i = 0; i < transactions.length && i < fixedDates.length; i++) {
        const txDoc = db.collection('transactions').doc(transactions[i].id);
        batch.update(txDoc, {
            date: fixedDates[i],
            timestamp: fixedTimestamps[i]
        });
        console.log(`Updating tx ${transactions[i].id} from ${transactions[i].data.date} to ${fixedDates[i]}`);
    }

    await batch.commit();
    console.log("Successfully fixed Saroja's dates.");
    process.exit(0);
}

fixDates().catch(err => {
    console.error(err);
    process.exit(1);
});
