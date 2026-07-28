const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
    const txId = 'APdW8t8NRdayITehozxq';
    const ref = db.collection('transactions').doc(txId);
    const snap = await ref.get();

    if (!snap.exists) {
        console.log(`Transaction ${txId} not found.`);
        process.exit(1);
    }

    console.log(`Deleting duplicate TX: ${txId}`);
    console.log(`  date: ${snap.data().date} | timestamp: ${snap.data().timestamp} | userId: ${snap.data().userId}`);

    await ref.delete();
    console.log('\n✅ Duplicate PUJITH transaction deleted successfully.');
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
