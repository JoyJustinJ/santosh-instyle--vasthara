const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Fixing missing userName and schemeName on all transactions ===\n");

    const usersSnap = await db.collection('users').get();
    const userMap = {};
    usersSnap.forEach(doc => {
        userMap[doc.id] = doc.data();
    });

    const schemesSnap = await db.collection('user_schemes').get();
    const schemeMap = {};
    schemesSnap.forEach(doc => {
        schemeMap[doc.id] = doc.data(); // doc.id is accountId
    });

    const txSnap = await db.collection('transactions').get();

    let updatedCount = 0;
    const batchArray = [db.batch()];
    let currentBatchIndex = 0;
    let opsInCurrentBatch = 0;

    txSnap.forEach(doc => {
        const tx = doc.data();
        const updates = {};
        let needsUpdate = false;

        // Fix userName if missing or incorrect (e.g. if it equals schemeName)
        const user = userMap[tx.userId];
        if (user) {
            const correctName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            if (!tx.userName || tx.userName !== correctName) {
                updates.userName = correctName;
                needsUpdate = true;
            }
        }

        // Fix schemeName based on user_schemes
        const scheme = schemeMap[tx.accountId];
        if (scheme) {
            const correctSchemeName = scheme.name || scheme.schemeName || 'Purchase Plan';
            if (!tx.schemeName || tx.schemeName !== correctSchemeName) {
                updates.schemeName = correctSchemeName;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            batchArray[currentBatchIndex].update(doc.ref, updates);
            updatedCount++;
            opsInCurrentBatch++;
            if (opsInCurrentBatch >= 450) {
                batchArray.push(db.batch());
                currentBatchIndex++;
                opsInCurrentBatch = 0;
            }
        }
    });

    if (updatedCount > 0) {
        console.log(`\nCommitting updates for ${updatedCount} transaction(s)...`);
        for (const batch of batchArray) {
            await batch.commit();
        }
        console.log("✅ Successfully updated all transactions in Firestore!");
    } else {
        console.log("✅ No transactions needed updating.");
    }

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
