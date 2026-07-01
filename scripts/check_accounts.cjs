const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkAccounts() {
    const userId = '9952718984'; // Rakshitha
    const accRef = await db.collection('accounts').where('userId', '==', userId).get();
    accRef.forEach(doc => {
        console.log("Account doc:", doc.id, doc.data());
    });
    
    // Also let's check `customerSchemes` or `userSchemes`? Let's check collections
    const collections = await db.listCollections();
    collections.forEach(collection => {
        console.log('Found collection with id:', collection.id);
    });

    process.exit(0);
}

checkAccounts().catch(err => {
    console.error(err);
    process.exit(1);
});
