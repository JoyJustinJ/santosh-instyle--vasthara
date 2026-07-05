const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkCustomer() {
    const phone = '9894848405';
    
    // Check users
    const usersRef = await db.collection('users').where('phone', '==', phone).get();
    console.log(`Found ${usersRef.size} users with phone ${phone}`);
    usersRef.forEach(doc => {
        console.log(`User ID: ${doc.id}, Name: ${doc.data().firstName}`);
    });

    const userDocId = usersRef.empty ? phone : usersRef.docs[0].id;
    
    // Check schemes
    const schemesRef = await db.collection('user_schemes').where('userId', '==', userDocId).get();
    console.log(`Found ${schemesRef.size} schemes for user ${userDocId}`);
    
    // Also check transactions
    const txRef = await db.collection('transactions').where('userId', '==', userDocId).get();
    console.log(`Found ${txRef.size} transactions for user ${userDocId}`);

    process.exit(0);
}

checkCustomer().catch(err => {
    console.error(err);
    process.exit(1);
});
