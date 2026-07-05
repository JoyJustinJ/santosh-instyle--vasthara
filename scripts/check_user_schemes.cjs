const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkUserSchemes() {
    const userId = '9952718984';
    const accRef = await db.collection('user_schemes').where('userId', '==', userId).get();
    accRef.forEach(doc => {
        console.log("User scheme doc:", doc.id, doc.data());
    });
    process.exit(0);
}

checkUserSchemes().catch(err => {
    console.error(err);
    process.exit(1);
});
