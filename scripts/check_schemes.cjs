const admin = require('firebase-admin');
const xlsx = require('xlsx');

// Initialize Firebase Admin (assuming service-account.json is in root)
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function getSchemes() {
    const schemesRef = db.collection('schemes');
    const snapshot = await schemesRef.where('status', '==', 'active').get();
    const schemes = [];
    snapshot.forEach(doc => {
        schemes.push({ id: doc.id, ...doc.data() });
    });
    return schemes;
}

getSchemes().then(schemes => {
    console.log("Active Schemes in DB:");
    schemes.forEach(s => console.log(`${s.id}: ${s.name} - ₹${s.monthlyAmount} (${s.duration} months)`));
    process.exit(0);
}).catch(console.error);
