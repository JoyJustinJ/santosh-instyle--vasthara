const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkRedemptions() {
    const plansSnap = await db.collection('user_schemes').get();
    const plans = plansSnap.docs.map(d => d.data());
    
    plans.forEach(p => {
        if (p.monthsPaid >= 11) {
            console.log(`Paid 11+: ${p.userId}, status: ${p.status}, paid: ${p.monthsPaid}, duration: ${p.duration}`);
        }
    });
}

checkRedemptions().then(() => process.exit(0));
