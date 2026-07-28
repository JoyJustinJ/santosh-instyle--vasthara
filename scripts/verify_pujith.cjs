const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function verify() {
    const snap = await db.collection('transactions').where('userId', '==', '7708956941').get();
    const txs = [];
    snap.forEach(doc => txs.push({ id: doc.id, ...doc.data() }));
    txs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    console.log("PUJITH transactions after fix:");
    txs.forEach((tx, i) => console.log(`  [${i+1}] date: ${tx.date} | timestamp: ${tx.timestamp}`));
    process.exit(0);
}
verify().catch(console.error);
