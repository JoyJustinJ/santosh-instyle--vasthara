const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function cleanupOTPs() {
    console.log("Starting OTP database cleanup...");
    
    // Fetch all OTPs
    const otpsSnap = await db.collection('otps').get();
    
    let deletedCount = 0;
    const now = Date.now();
    
    // Create a batch (Note: Firestore batches support up to 500 operations. We will handle batches if needed)
    let batch = db.batch();
    let operationsInBatch = 0;
    
    for (const doc of otpsSnap.docs) {
        const data = doc.data();
        // Delete if used === true or if it's expired
        if (data.used === true || (data.expiresAt && data.expiresAt < now)) {
            batch.delete(doc.ref);
            operationsInBatch++;
            deletedCount++;
            
            // Commit batch if we reach the 500 limit
            if (operationsInBatch === 500) {
                await batch.commit();
                console.log(`Committed batch of 500 deletions...`);
                batch = db.batch();
                operationsInBatch = 0;
            }
        }
    }
    
    // Commit any remaining operations
    if (operationsInBatch > 0) {
        await batch.commit();
    }
    
    console.log(`Cleanup complete! Successfully deleted ${deletedCount} old/used OTP records.`);
}

cleanupOTPs()
    .then(() => process.exit(0))
    .catch(err => {
        console.error("Error during cleanup:", err);
        process.exit(1);
    });
