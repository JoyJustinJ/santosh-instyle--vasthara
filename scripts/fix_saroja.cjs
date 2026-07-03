const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixSaroja() {
    console.log("Starting Saroja data fix...");
    const oldId = 'w0erPLg81lVkFGlwedHN5UMJRDq2';
    const newId = '9894848405';

    // 1. Get old user
    const userRef = db.collection('users').doc(oldId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        console.log(`User ${oldId} not found, checking if already migrated...`);
        const newSnap = await db.collection('users').doc(newId).get();
        if (newSnap.exists) {
            console.log("New user already exists.");
        }
    } else {
        const userData = userSnap.data();
        userData.id = newId;

        console.log("Creating new user doc:", newId);
        await db.collection('users').doc(newId).set(userData);

        console.log("Deleting old user doc:", oldId);
        await userRef.delete();
    }

    // 2. Update all schemes for oldId
    console.log("Updating schemes...");
    const schemesSnap = await db.collection('user_schemes').where('userId', '==', oldId).get();
    for (const doc of schemesSnap.docs) {
        console.log(`Updating scheme ${doc.id} userId to ${newId}`);
        await doc.ref.update({ userId: newId });
    }
    
    // Also check for schemes that might already have the newId but need reversing
    const newSchemesSnap = await db.collection('user_schemes').where('userId', '==', newId).get();
    for (const doc of newSchemesSnap.docs) {
        const data = doc.data();
        if (data.status === 'closed' || data.status === 'redeemed') {
            console.log(`Reversing closed scheme ${doc.id}`);
            await doc.ref.update({
                status: (data.monthsPaid >= data.duration) ? 'completed' : 'active',
                closedAt: admin.firestore.FieldValue.delete(),
                redeemedAt: admin.firestore.FieldValue.delete()
            });
        }
    }

    // 3. Update all transactions for oldId
    console.log("Updating transactions...");
    const txSnap = await db.collection('transactions').where('userId', '==', oldId).get();
    for (const doc of txSnap.docs) {
        console.log(`Updating transaction ${doc.id} userId to ${newId}`);
        await doc.ref.update({ userId: newId });
    }

    console.log("Fix complete!");
    process.exit(0);
}

fixSaroja().catch(err => {
    console.error(err);
    process.exit(1);
});
