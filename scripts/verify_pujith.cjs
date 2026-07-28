const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
    // Try by name
    const snap = await db.collection('transactions').where('customerName', '==', 'PUJITH').get();
    let txs = [];
    snap.forEach(d => txs.push({ id: d.id, ...d.data() }));

    if (!txs.length) {
        // try case variations
        const snap2 = await db.collection('transactions').where('customerName', '==', 'Pujith').get();
        snap2.forEach(d => txs.push({ id: d.id, ...d.data() }));
    }

    txs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    console.log(`Found ${txs.length} transactions for PUJITH:\n`);
    txs.forEach((t, i) => console.log(`[${i+1}] ID: ${t.id} | date: ${t.date} | timestamp: ${t.timestamp} | userId: ${t.userId}`));
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
