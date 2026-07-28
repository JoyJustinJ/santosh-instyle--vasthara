/**
 * Fix script: PUJITH customer installment date corrections.
 * Based on provided image, the installment dates should be:
 *   1st:  28-02-2026
 *   2nd:  31-03-2026
 *   3rd:  30-04-2026
 *   4th:  30-05-2026
 *   5th:  13-06-2026
 *
 * This script finds the PUJITH user and sets those exact dates for
 * transactions sorted chronologically.
 */
const admin = require('firebase-admin');

const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixPujith() {
    console.log("=== Fixing PUJITH installment dates ===\n");

    // Find user named PUJITH
    const usersSnap = await db.collection('users').get();
    const pujithUsers = [];
    usersSnap.forEach(doc => {
        const data = doc.data();
        const name = ((data.firstName || '') + ' ' + (data.lastName || '')).toLowerCase().trim();
        if (name.includes('pujith') || name.includes('pujit')) {
            pujithUsers.push({ id: doc.id, ...data });
        }
    });

    if (pujithUsers.length === 0) {
        console.log("ERROR: No user named 'PUJITH' found in the database.");
        process.exit(1);
    }

    console.log(`Found ${pujithUsers.length} user(s):`);
    pujithUsers.forEach(u => console.log(`  - ID: ${u.id}, Name: ${u.firstName} ${u.lastName}, Phone: ${u.phone}`));

    // Correct dates from the provided image (in order)
    const correctDates = [
        { date: '28-02-2026', timestamp: '2026-02-28T10:00:00.000Z', label: '1st installment' },
        { date: '31-03-2026', timestamp: '2026-03-31T10:00:00.000Z', label: '2nd installment' },
        { date: '30-04-2026', timestamp: '2026-04-30T10:00:00.000Z', label: '3rd installment' },
        { date: '30-05-2026', timestamp: '2026-05-30T10:00:00.000Z', label: '4th installment' },
        { date: '13-06-2026', timestamp: '2026-06-13T10:00:00.000Z', label: '5th installment' },
    ];

    for (const user of pujithUsers) {
        const userIds = [user.id];
        if (user.phone && user.phone !== user.id) userIds.push(user.phone);

        let allTxs = [];
        for (const uid of userIds) {
            const txSnap = await db.collection('transactions').where('userId', '==', uid).get();
            txSnap.forEach(doc => {
                allTxs.push({ id: doc.id, ref: doc.ref, ...doc.data() });
            });
        }

        // Deduplicate
        allTxs = allTxs.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        console.log(`\nFound ${allTxs.length} transactions for ${user.firstName} ${user.lastName}`);

        // Sort chronologically
        allTxs.sort((a, b) => {
            const ta = new Date(a.timestamp || '').getTime() || 0;
            const tb = new Date(b.timestamp || '').getTime() || 0;
            return ta - tb;
        });

        console.log("Current transactions:");
        allTxs.forEach((tx, i) => {
            console.log(`  [${i + 1}] ID: ${tx.id} | date: ${tx.date} | timestamp: ${tx.timestamp}`);
        });

        const batch = db.batch();
        let updateCount = 0;

        for (let i = 0; i < correctDates.length; i++) {
            if (allTxs[i]) {
                const tx = allTxs[i];
                const correction = correctDates[i];
                console.log(`\nSetting ${correction.label}: ${tx.date} → ${correction.date}`);
                batch.update(tx.ref, {
                    date: correction.date,
                    timestamp: correction.timestamp
                });
                updateCount++;
            } else {
                console.log(`INFO: ${correctDates[i].label} transaction does not exist yet (only ${allTxs.length} transactions present).`);
            }
        }

        if (updateCount > 0) {
            await batch.commit();
            console.log(`\n✅ Updated ${updateCount} transactions for PUJITH.`);
        } else {
            console.log("Nothing to update.");
        }
    }

    process.exit(0);
}

fixPujith().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
