const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkDuplicates() {
    console.log("Checking for imported data...");
    
    const users = await db.collection('users').where('accountCreatedVia', '==', 'import').get();
    console.log(`Users created via import: ${users.size}`);

    const userSchemes = await db.collection('user_schemes').where('enrolledBy', '==', 'system_import').get();
    console.log(`User schemes enrolled via import: ${userSchemes.size}`);
    
    const tx = await db.collection('transactions').where('recordedBy', '==', 'system_import').get();
    console.log(`Transactions recorded via import: ${tx.size}`);

    // Check how many have duplicate user_schemes (same userId and planId)
    const schemesMap = {};
    let duplicates = 0;
    userSchemes.forEach(doc => {
        const data = doc.data();
        const key = `${data.userId}_${data.planId}`;
        if (schemesMap[key]) {
            duplicates++;
        } else {
            schemesMap[key] = true;
        }
    });
    console.log(`Duplicate user_schemes for same user and plan: ${duplicates}`);
    process.exit(0);
}

checkDuplicates().catch(err => {
    console.error(err);
    process.exit(1);
});
