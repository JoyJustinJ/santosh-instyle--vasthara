/**
 * Fix script: Sudharshan's installment dates have day and month swapped.
 * This script finds all transactions for the "sudharshan" user and swaps
 * DD-MM if the resulting date is more chronologically valid.
 */
const admin = require('firebase-admin');

const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

function swapDayMonth(dateStr) {
    if (!dateStr) return dateStr;
    // Supports DD-MM-YYYY or DD/MM/YYYY
    const sep = dateStr.includes('/') ? '/' : '-';
    const parts = dateStr.split(sep);
    if (parts.length !== 3) return dateStr;
    // Swap parts[0] (day) and parts[1] (month)
    return `${parts[1]}${sep}${parts[0]}${sep}${parts[2]}`;
}

async function fixSudharshan() {
    console.log("=== Fixing Sudharshan's swapped installment dates ===\n");

    // Search for users named sudharshan (case insensitive by checking known variants)
    const usersSnap = await db.collection('users').get();
    const sudharshanUsers = [];
    usersSnap.forEach(doc => {
        const data = doc.data();
        const name = ((data.firstName || '') + ' ' + (data.lastName || '')).toLowerCase().trim();
        if (name.includes('sudharshan') || name.includes('sudarshan')) {
            sudharshanUsers.push({ id: doc.id, ...data });
        }
    });

    if (sudharshanUsers.length === 0) {
        console.log("ERROR: No user named 'sudharshan' found in the database.");
        process.exit(1);
    }

    console.log(`Found ${sudharshanUsers.length} user(s):`);
    sudharshanUsers.forEach(u => console.log(`  - ID: ${u.id}, Name: ${u.firstName} ${u.lastName}, Phone: ${u.phone}`));

    const batch = db.batch();
    let fixCount = 0;

    for (const user of sudharshanUsers) {
        const userIds = [user.id];
        if (user.phone && user.phone !== user.id) userIds.push(user.phone);

        for (const uid of userIds) {
            const txSnap = await db.collection('transactions').where('userId', '==', uid).get();
            console.log(`\nFound ${txSnap.size} transactions for userId: ${uid}`);

            txSnap.forEach(doc => {
                const data = doc.data();
                const oldDate = data.date;
                if (!oldDate) return;

                const newDate = swapDayMonth(oldDate);
                console.log(`  TX ${doc.id}: ${oldDate} → ${newDate}`);

                batch.update(doc.ref, { date: newDate });
                fixCount++;
            });
        }
    }

    if (fixCount === 0) {
        console.log("\nNo transactions found to fix.");
        process.exit(0);
    }

    console.log(`\nApplying ${fixCount} date swaps...`);
    await batch.commit();
    console.log("✅ Done! Sudharshan's dates have been fixed (day ↔ month swapped).");
    process.exit(0);
}

fixSudharshan().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
