const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixSarojaExactDates() {
    const txRef = await db.collection('transactions').where('userId', '==', 'w0erPLg81lVkFGlwedHN5UMJRDq2').get();
    
    // Sort transactions by their timestamp to get them in order 1 to 11
    let transactions = [];
    txRef.forEach(doc => {
        transactions.push({ id: doc.id, data: doc.data() });
    });
    
    transactions.sort((a, b) => new Date(a.data.timestamp) - new Date(b.data.timestamp));

    // Exact dates from the WhatsApp image
    const exactDates = [
        "18/08/2025",
        "09/09/2025",
        "27/10/2025",
        "16/11/2025",
        "13/12/2025",
        "19/01/2026",
        "10/02/2026",
        "23/03/2026",
        "10/04/2026",
        "19/05/2026",
        "15/06/2026"
    ];

    const exactTimestamps = [
        "2025-08-18T10:00:00.000Z",
        "2025-09-09T10:00:00.000Z",
        "2025-10-27T10:00:00.000Z",
        "2025-11-16T10:00:00.000Z",
        "2025-12-13T10:00:00.000Z",
        "2026-01-19T10:00:00.000Z",
        "2026-02-10T10:00:00.000Z",
        "2026-03-23T10:00:00.000Z",
        "2026-04-10T10:00:00.000Z",
        "2026-05-19T10:00:00.000Z",
        "2026-06-15T10:00:00.000Z"
    ];

    const batch = db.batch();

    for (let i = 0; i < transactions.length && i < exactDates.length; i++) {
        const txDoc = db.collection('transactions').doc(transactions[i].id);
        batch.update(txDoc, {
            date: exactDates[i],
            timestamp: exactTimestamps[i]
        });
        console.log(`Updating tx ${transactions[i].id} to ${exactDates[i]}`);
    }

    await batch.commit();
    console.log("Successfully fixed Saroja's dates accurately from WhatsApp image.");
    process.exit(0);
}

fixSarojaExactDates().catch(err => {
    console.error(err);
    process.exit(1);
});
