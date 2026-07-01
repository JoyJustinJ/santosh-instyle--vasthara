const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function add4thPayment() {
    const userId = '9952718984'; // Rakshitha
    const accId = 'ACC-2026-9072-56';
    
    // Add new transaction on 30/06/2026
    const newTxRef = db.collection('transactions').doc();
    await newTxRef.set({
        id: newTxRef.id,
        referenceId: 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        invoicePrimaryKey: newTxRef.id,
        userId: userId,
        accountId: accId,
        amount: 2000,
        type: 'subscription_payment',
        status: 'Success',
        method: 'CASH',
        recordedBy: 'system_import',
        date: '30/06/2026',
        timestamp: '2026-06-30T10:00:00.000Z'
    });
    console.log("Added 4th transaction for 30/06/2026");

    // Update totalPaid and monthsPaid for the scheme
    await db.collection('user_schemes').doc(accId).update({
        monthsPaid: admin.firestore.FieldValue.increment(1),
        totalPaid: admin.firestore.FieldValue.increment(2000)
    });
    console.log(`Updated user_schemes totalPaid incremented by 2000, monthsPaid by 1`);

    process.exit(0);
}

add4thPayment().catch(err => {
    console.error(err);
    process.exit(1);
});
