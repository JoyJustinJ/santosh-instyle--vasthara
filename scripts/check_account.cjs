const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkAccount() {
    const accRef = await db.collection('accounts').doc('ACC-2026-9072-56').get();
    console.log("Account:", accRef.data());
    process.exit(0);
}

checkAccount().catch(err => {
    console.error(err);
    process.exit(1);
});
