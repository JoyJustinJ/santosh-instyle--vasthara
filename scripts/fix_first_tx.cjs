const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixFirstTx() {
    // Transaction on 22/04/2026 is uYqipnO6iuqYVrQNeZSq
    const txId = 'uYqipnO6iuqYVrQNeZSq';
    await db.collection('transactions').doc(txId).update({
        type: 'subscription_join'
    });
    console.log("First transaction updated to subscription_join");
    process.exit(0);
}

fixFirstTx().catch(err => {
    console.error(err);
    process.exit(1);
});
