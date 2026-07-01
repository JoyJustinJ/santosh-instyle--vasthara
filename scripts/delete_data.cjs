const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function deleteData() {
    const batch = db.batch();
    let deleteCount = 0;
    
    // Batch has a limit of 500 writes, so if it's large we might need to commit multiple batches, 
    // but this is likely small enough.
    const batches = [db.batch()];
    let currentBatchIndex = 0;
    let opsInCurrentBatch = 0;
    
    function deleteRef(ref) {
        if (opsInCurrentBatch >= 450) {
            batches.push(db.batch());
            currentBatchIndex++;
            opsInCurrentBatch = 0;
        }
        batches[currentBatchIndex].delete(ref);
        opsInCurrentBatch++;
        deleteCount++;
    }

    // 1. Delete user 9345578962
    console.log("Searching for user 9345578962...");
    const usersSnapshot = await db.collection('users').where('phone', '==', '9345578962').get();
    
    // Fallback if the document ID is the phone number
    const userDocRef = db.collection('users').doc('9345578962');
    const userDoc = await userDocRef.get();
    
    const userIdsToDelete = [];
    
    if (userDoc.exists) {
        console.log(`Found user by ID: 9345578962`);
        deleteRef(userDocRef);
        userIdsToDelete.push('9345578962');
    }

    usersSnapshot.forEach(doc => {
        if (!userIdsToDelete.includes(doc.id)) {
            console.log(`Found user by phone field: ${doc.id}`);
            deleteRef(doc.ref);
            userIdsToDelete.push(doc.id);
        }
    });

    // Also delete any plans/transactions for this user
    for (const uid of userIdsToDelete) {
        console.log(`Searching plans for user ${uid}...`);
        const plansRef = await db.collection('user_schemes').where('userId', '==', uid).get();
        plansRef.forEach(doc => {
            deleteRef(doc.ref);
        });

        // Some might be under phone number
        const plansByPhoneRef = await db.collection('user_schemes').where('userId', '==', '9345578962').get();
        plansByPhoneRef.forEach(doc => {
            deleteRef(doc.ref);
        });

        const txRef = await db.collection('transactions').where('userId', '==', uid).get();
        txRef.forEach(doc => {
            deleteRef(doc.ref);
        });
        const txByPhoneRef = await db.collection('transactions').where('customerPhone', '==', '9345578962').get();
        txByPhoneRef.forEach(doc => {
            deleteRef(doc.ref);
        });
    }

    // 2. Delete "1rs sche" from everywhere
    console.log("Searching for scheme '1rs sche'...");
    
    // Find the scheme in 'schemes' collection
    const schemeIds = [];
    const allSchemes = await db.collection('schemes').get();
    allSchemes.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase().trim() === '1rs sche') {
            console.log(`Found scheme: ${doc.id}`);
            deleteRef(doc.ref);
            schemeIds.push(doc.id);
        }
    });

    // Delete user_schemes tied to this scheme ID
    for (const sid of schemeIds) {
        const userSchemesSnap = await db.collection('user_schemes').where('schemeId', '==', sid).get();
        userSchemesSnap.forEach(doc => {
            deleteRef(doc.ref);
        });
    }

    // Since we also want to remove anything referencing "1rs sche" directly by name in user_schemes (if stored)
    const allUserSchemes = await db.collection('user_schemes').get();
    allUserSchemes.forEach(doc => {
        const data = doc.data();
        if (data.schemeName && data.schemeName.toLowerCase().trim() === '1rs sche') {
            console.log(`Found user_scheme referencing by name: ${doc.id}`);
            deleteRef(doc.ref);
        }
    });
    
    // Let's also check if there are any transactions tied to this scheme
    const allTxs = await db.collection('transactions').get();
    allTxs.forEach(doc => {
        const data = doc.data();
        // If there's a reference to the scheme name or ID
        if ((data.schemeName && data.schemeName.toLowerCase().trim() === '1rs sche') || 
            (data.schemeId && schemeIds.includes(data.schemeId))) {
             deleteRef(doc.ref);
        }
    });

    if (deleteCount > 0) {
        console.log(`Committing ${batches.length} batches...`);
        for (const b of batches) {
            await b.commit();
        }
        console.log(`Successfully deleted ${deleteCount} records.`);
    } else {
        console.log("No matching records found to delete.");
    }
}

deleteData().then(() => {
    console.log("Done");
    process.exit(0);
}).catch(console.error);
