const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkManual() {
    const importedUsers = await db.collection('users').where('accountCreatedVia', '==', 'import').get();
    const importedPhones = new Set();
    importedUsers.forEach(d => importedPhones.add(d.id));

    const allTx = await db.collection('transactions').get();
    let manualTx = 0;
    allTx.forEach(doc => {
        const data = doc.data();
        if (importedPhones.has(data.userId) && data.recordedBy !== 'system_import') {
            manualTx++;
        }
    });
    console.log(`Manual transactions for imported users: ${manualTx}`);
    process.exit(0);
}

checkManual().catch(err => {
    console.error(err);
    process.exit(1);
});
