const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function syncRakshitha() {
    const userId = '9952718984'; // Rakshitha
    const accId = 'ACC-2026-9072-56';

    // 1. Delete the fake March 7 transaction
    const txRef = await db.collection('transactions').where('userId', '==', userId).where('date', '==', '07/03/2026').get();
    for (const doc of txRef.docs) {
        await doc.ref.delete();
        console.log("Deleted March 7 transaction:", doc.id);
    }

    // 2. The 30/06/2026 transaction needs to be reverted to 03/07/2026 and made the join transaction
    const txRef3006 = await db.collection('transactions').where('userId', '==', userId).where('date', '==', '30/06/2026').get();
    for (const doc of txRef3006.docs) {
        await doc.ref.update({
            date: '03/07/2026',
            timestamp: '2026-07-03T00:00:00.000Z',
            type: 'subscription_join'
        });
        console.log("Reverted 30/06/2026 transaction back to 03/07/2026 (subscription_join)");
    }

    // 3. Ensure the 22/04/2026 is subscription_payment
    const txRef2204 = await db.collection('transactions').where('userId', '==', userId).where('date', '==', '22/04/2026').get();
    for (const doc of txRef2204.docs) {
        await doc.ref.update({
            type: 'subscription_payment'
        });
        console.log("Reverted 22/04/2026 transaction to subscription_payment");
    }

    // 4. Ensure the 27/05/2026 is subscription_payment (it should already be, but just to be sure)
    const txRef2705 = await db.collection('transactions').where('userId', '==', userId).where('date', '==', '27/05/2026').get();
    for (const doc of txRef2705.docs) {
        await doc.ref.update({
            type: 'subscription_payment'
        });
        console.log("Verified 27/05/2026 transaction is subscription_payment");
    }

    // 5. Update user and user_schemes date to 03/07/2026
    await db.collection('users').doc(userId).update({
        createdAt: '2026-07-03T00:00:00.000Z'
    });
    console.log("Reverted user createdAt to 03/07/2026");

    await db.collection('user_schemes').doc(accId).update({
        enrollmentDate: '2026-07-03T00:00:00.000Z',
        monthsPaid: 3,
        totalPaid: 6000
    });
    console.log("Reverted user_schemes enrollmentDate to 03/07/2026, totalPaid to 6000, monthsPaid to 3");

    process.exit(0);
}

syncRakshitha().catch(err => {
    console.error(err);
    process.exit(1);
});
