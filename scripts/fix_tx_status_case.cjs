const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Normalizing transaction status to 'Success' across Firestore ===\n");

    const txSnap = await db.collection('transactions').get();
    const batch = db.batch();
    let count = 0;
    const stats = {};

    txSnap.forEach(d => {
        const data = d.data();
        const s = data.status;
        stats[s] = (stats[s] || 0) + 1;
        if (s && s !== 'Success' && s.toLowerCase() === 'success') {
            batch.update(d.ref, { status: 'Success' });
            count++;
            console.log(`Updating tx ${d.id} (User: ${data.userId}, Amount: ${data.amount}, Date: ${data.date}) from status='${s}' to 'Success'`);
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`\n✅ Successfully updated ${count} transaction records!`);
    } else {
        console.log("\n✅ All success transactions are already capitalized properly.");
    }

    console.log("Status distribution across all transactions:", stats);

    // Re-verify Geetha 9585137199 transactions
    const gTx = await db.collection('transactions').where("userId", "==", "9585137199").get();
    console.log(`\nVerified ${gTx.size} transactions for 9585137199 (VS1016 / GEETHA):`);
    gTx.forEach(t => {
        const data = t.data();
        console.log(`  ID: ${t.id} | Date: ${data.date} | Status: '${data.status}' | Amount: ${data.amount}`);
    });

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
