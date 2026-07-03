const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkSub() {
    const subRef = await db.collection('subscriptions').doc('ACC-2026-9072-56').get();
    console.log("Subscription:", subRef.data());
    
    // Check if there are schemes collections
    const schemesRef = await db.collection('schemes').get();
    if (!schemesRef.empty) {
        console.log("Schemes collection exists.");
    }
    process.exit(0);
}

checkSub().catch(err => {
    console.error(err);
    process.exit(1);
});
