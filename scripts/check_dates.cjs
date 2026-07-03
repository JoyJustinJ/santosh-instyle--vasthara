const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkDates() {
    const txRef = await db.collection('transactions').where('recordedBy', '==', 'system_import').limit(10).get();
    txRef.forEach(doc => {
        const data = doc.data();
        console.log(`Transaction ID: ${doc.id}, Date: ${data.date}, Timestamp: ${data.timestamp}, User: ${data.userId}`);
    });
    process.exit(0);
}

checkDates().catch(err => {
    console.error(err);
    process.exit(1);
});
