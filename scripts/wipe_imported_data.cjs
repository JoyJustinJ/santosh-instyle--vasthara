const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function deleteQueryBatch(query, resolve) {
    const snapshot = await query.get();
    
    if (snapshot.size === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    // Recurse on the next process tick, to avoid exploding the stack
    process.nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}

async function wipeImportedData() {
    console.log("Starting cleanup of imported legacy data...");

    // 1. Delete transactions
    console.log("Deleting imported transactions...");
    const txQuery = db.collection('transactions').where('recordedBy', '==', 'system_import').limit(500);
    await new Promise((resolve, reject) => deleteQueryBatch(txQuery, resolve).catch(reject));

    // 2. Delete user_schemes
    console.log("Deleting imported user_schemes...");
    const schemeQuery = db.collection('user_schemes').where('enrolledBy', '==', 'system_import').limit(500);
    await new Promise((resolve, reject) => deleteQueryBatch(schemeQuery, resolve).catch(reject));

    // 3. Delete users
    console.log("Deleting imported users...");
    const usersQuery = db.collection('users').where('accountCreatedVia', '==', 'import').limit(500);
    await new Promise((resolve, reject) => deleteQueryBatch(usersQuery, resolve).catch(reject));

    console.log("Cleanup complete!");
    process.exit(0);
}

wipeImportedData().catch(err => {
    console.error(err);
    process.exit(1);
});
