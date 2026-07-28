const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    const txSnap = await db.collection('transactions').where('status', '==', 'paid').get();
    txSnap.forEach(t => {
        console.log("Found transaction with status='paid':", t.id, t.data());
        // update to 'Success'
        t.ref.update({ status: 'Success' });
    });
    console.log("✅ Updated any 'paid' status transaction to 'Success'.");
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
