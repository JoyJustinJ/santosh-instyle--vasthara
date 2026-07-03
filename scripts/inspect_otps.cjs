const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function inspectOTPs() {
    const otpsSnap = await db.collection('otps').limit(5).get();
    otpsSnap.forEach(doc => {
        console.log(doc.id, doc.data());
    });
}

inspectOTPs().then(() => process.exit(0));
