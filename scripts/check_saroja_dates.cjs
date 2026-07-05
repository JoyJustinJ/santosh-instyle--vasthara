const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkSarojaDates() {
    const txRef = await db.collection('transactions').where('userId', '==', 'w0erPLg81lVkFGlwedHN5UMJRDq2').get();
    let dates = [];
    txRef.forEach(doc => {
        dates.push(doc.data().date);
    });
    console.log("Saroja's Current Dates:");
    console.log(dates.join(', '));
    process.exit(0);
}

checkSarojaDates().catch(err => {
    console.error(err);
    process.exit(1);
});
