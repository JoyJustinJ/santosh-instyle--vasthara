const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Checking and Fixing All Transactions & Verifying DOJ vs 1st Installment ===\n");

    const txSnap = await db.collection('transactions').get();
    const batch = db.batch();
    let updateCount = 0;
    const stats = {};

    const allTx = [];
    txSnap.forEach(d => {
        const data = d.data();
        const s = data.status;
        stats[s] = (stats[s] || 0) + 1;
        allTx.push({ id: d.id, ...data });

        // If status is not exactly 'Success' (e.g., 'paid', 'success', 'Paid', 'SUCCESS', 'ACTIVE', 'completed')
        // note: do not touch 'Failed' or 'cancelled' if they exist
        if (s && s !== 'Success' && !['failed', 'error', 'cancelled', 'pending'].includes(s.toLowerCase())) {
            console.log(`Fixing tx status for ${d.id} (User: ${data.userId}, Date: ${data.date}) from '${s}' -> 'Success'`);
            batch.update(d.ref, { status: 'Success' });
            updateCount++;
            data.status = 'Success'; // update in-memory object too
        }
    });

    if (updateCount > 0) {
        await batch.commit();
        console.log(`\n✅ Successfully committed ${updateCount} transaction status updates to Firestore!`);
    } else {
        console.log("\n✅ All success transaction statuses are already correctly formatted.");
    }

    console.log("\nStatus distribution before fix:", stats);

    // Now check DOJ vs 1st Installment for all schemes
    console.log("\n--- Checking DOJ vs 1st Installment Date for all schemes ---");
    const schemesSnap = await db.collection('user_schemes').get();
    const usersSnap = await db.collection('users').get();
    const userMap = {};
    usersSnap.forEach(u => {
        userMap[u.id] = u.data();
        if (u.data().phone) userMap[u.data().phone] = u.data();
    });

    let mismatchCount = 0;
    schemesSnap.forEach(s => {
        const plan = s.data();
        const user = userMap[plan.userId] || userMap[plan.phone] || {};
        
        // Filter transactions for this plan
        const txs = allTx.filter(tx => tx.accountId === plan.accountId && (tx.status === 'Success' || tx.status === 'paid' || tx.status === 'success'));
        
        // Sort transactions chronologically
        txs.sort((a, b) => {
            const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tA - tB;
        });

        const doj = plan.enrollmentDate || plan.createdAt || 'N/A';
        const firstTxDate = txs.length > 0 ? txs[0].date : 'No Txs';

        // Check if DOJ differs from first installment date
        // Note: DOJ might be DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD
        const normDoj = doj.split('T')[0].replace(/\//g, '-');
        const normFirst = (firstTxDate || '').replace(/\//g, '-');
        
        // Convert to common compare string or display if relevant
        if (txs.length > 0 && normDoj !== normFirst) {
            console.log(`[Mismatch/Info] User: ${user.firstName || ''} (${plan.userId}, ${user.customerId || 'N/A'}) | Account: ${plan.accountId} | DOJ: ${doj} | 1st Tx: ${firstTxDate} (${txs[0].id})`);
            mismatchCount++;
        }
    });

    console.log(`\nTotal schemes checked. Mismatch between DOJ and 1st Tx date: ${mismatchCount}`);

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
