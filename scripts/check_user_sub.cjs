const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkUserSub() {
    const userId = '9952718984'; // Rakshitha
    const schemesRef = await db.collection('schemes').where('userId', '==', userId).get();
    schemesRef.forEach(doc => {
        console.log("Scheme:", doc.id, doc.data());
    });

    const subsRef = await db.collection('subscriptions').where('userId', '==', userId).get();
    subsRef.forEach(doc => {
        console.log("Subscription doc:", doc.id, doc.data());
    });
    process.exit(0);
}

checkUserSub().catch(err => {
    console.error(err);
    process.exit(1);
});
