const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixMissingInstallment() {
    const userId = '9952718984'; // Rakshitha
    const accId = 'ACC-2026-9072-56';
    
    // 1. Add new transaction on 07/03/2026 as subscription_join
    const newTxRef = db.collection('transactions').doc();
    await newTxRef.set({
        id: newTxRef.id,
        referenceId: 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        invoicePrimaryKey: newTxRef.id,
        userId: userId,
        accountId: accId,
        amount: 2000,
        type: 'subscription_join',
        status: 'Success',
        method: 'CASH',
        recordedBy: 'system_import',
        date: '07/03/2026',
        timestamp: '2026-03-07T10:00:00.000Z'
    });
    console.log("Added missing transaction for 07/03/2026");

    // 2. Change the 22/04/2026 transaction back to subscription_payment
    const txId2204 = 'uYqipnO6iuqYVrQNeZSq';
    await db.collection('transactions').doc(txId2204).update({
        type: 'subscription_payment'
    });
    console.log("Reverted 22/04/2026 transaction to subscription_payment");

    // 3. Update user and user_schemes date to 07/03/2026
    await db.collection('users').doc(userId).update({
        createdAt: '2026-03-07T10:00:00.000Z'
    });
    console.log("Updated user createdAt to 07/03/2026");

    // We also need to update totalPaid and monthsPaid for the scheme
    const schemeDoc = await db.collection('user_schemes').doc(accId).get();
    const schemeData = schemeDoc.data();
    
    await db.collection('user_schemes').doc(accId).update({
        enrollmentDate: '2026-03-07T10:00:00.000Z',
        monthsPaid: admin.firestore.FieldValue.increment(1),
        totalPaid: admin.firestore.FieldValue.increment(2000)
    });
    console.log(`Updated user_schemes enrollmentDate to 07/03/2026, totalPaid incremented by 2000`);

    process.exit(0);
}

fixMissingInstallment().catch(err => {
    console.error(err);
    process.exit(1);
});
