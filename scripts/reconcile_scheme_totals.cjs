const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Reconciling all user_schemes totalPaid and monthsPaid with actual transactions ===\n");

    const schemesSnap = await db.collection('user_schemes').get();
    const txsSnap = await db.collection('transactions').get();

    // Group transactions by accountId and userId
    const txsByAccount = {};
    const txsByUser = {};

    txsSnap.forEach(doc => {
        const data = doc.data();
        const amount = Number(data.amount) || 0;
        if (data.accountId) {
            if (!txsByAccount[data.accountId]) txsByAccount[data.accountId] = [];
            txsByAccount[data.accountId].push(amount);
        }
        if (data.userId) {
            if (!txsByUser[data.userId]) txsByUser[data.userId] = [];
            txsByUser[data.userId].push({ accountId: data.accountId, amount });
        }
    });

    let updatedCount = 0;
    const batchArray = [db.batch()];
    let currentBatchIndex = 0;
    let opsInCurrentBatch = 0;

    for (const doc of schemesSnap.docs) {
        const s = doc.data();
        let actualTxs = txsByAccount[s.accountId];

        // If no transactions found by accountId directly, try finding transactions by userId if there's only 1 scheme for that user
        if ((!actualTxs || actualTxs.length === 0) && s.userId && txsByUser[s.userId]) {
            const userSchemesCount = schemesSnap.docs.filter(d => d.data().userId === s.userId).length;
            if (userSchemesCount === 1) {
                actualTxs = txsByUser[s.userId].map(t => t.amount);
            }
        }

        if (actualTxs && actualTxs.length > 0) {
            const calculatedTotalPaid = actualTxs.reduce((a, b) => a + b, 0);
            const calculatedMonthsPaid = actualTxs.length;

            const storedTotalPaid = Number(s.totalPaid || 0);
            const storedMonthsPaid = Number(s.monthsPaid || 0);

            if (calculatedTotalPaid !== storedTotalPaid || calculatedMonthsPaid !== storedMonthsPaid) {
                console.log(`Mismatch in scheme ${doc.id} (user: ${s.userId}, account: ${s.accountId}):`);
                console.log(`   Stored: totalPaid=${storedTotalPaid}, monthsPaid=${storedMonthsPaid}`);
                console.log(`   Actual: totalPaid=${calculatedTotalPaid}, monthsPaid=${calculatedMonthsPaid} (${actualTxs.length} transactions)`);
                
                batchArray[currentBatchIndex].update(doc.ref, {
                    totalPaid: calculatedTotalPaid,
                    monthsPaid: calculatedMonthsPaid
                });

                updatedCount++;
                opsInCurrentBatch++;
                if (opsInCurrentBatch >= 450) {
                    batchArray.push(db.batch());
                    currentBatchIndex++;
                    opsInCurrentBatch = 0;
                }
            }
        }
    }

    if (updatedCount > 0) {
        console.log(`\nCommitting updates for ${updatedCount} scheme(s)...`);
        for (const batch of batchArray) {
            await batch.commit();
        }
        console.log("✅ Successfully updated all mismatched scheme totals in Firestore!");
    } else {
        console.log("✅ All user_schemes totalPaid and monthsPaid perfectly match transaction amounts!");
    }

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
