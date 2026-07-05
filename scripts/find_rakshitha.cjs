const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function findRakshitha() {
    const usersRef = await db.collection('users').where('phone', '==', '9952718984').get();
    if (usersRef.empty) {
        console.log("User not found by phone 9952718984");
        return;
    }
    
    const user = usersRef.docs[0];
    console.log("User found:", user.id, user.data());
    
    const txRef = await db.collection('transactions').where('userId', '==', user.id).get();
    txRef.forEach(doc => {
        console.log("Tx:", doc.id, doc.data());
    });
    
    process.exit(0);
}

findRakshitha().catch(err => {
    console.error(err);
    process.exit(1);
});
