const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Finding DINAGARAN ===\n");

    // Search by name
    const snap1 = await db.collection('users').where('firstName', '==', 'DINAGARAN').get();
    let userId = null;
    snap1.forEach(d => {
        console.log('User:', JSON.stringify({ id: d.id, ...d.data() }));
        userId = d.id;
    });

    if (!userId) {
        console.log("Not found by firstName. Trying full search...");
        process.exit(1);
    }

    // Find transactions with bad format date
    const txSnap = await db.collection('transactions').where('userId', '==', userId).get();
    let txs = [];
    txSnap.forEach(d => txs.push({ id: d.id, ...d.data() }));
    txs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    console.log(`\nTransactions (${txs.length}):`);
    txs.forEach((t, i) => console.log(`  [${i+1}] ID: ${t.id} | date: "${t.date}" | ts: ${t.timestamp}`));

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
