const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixSarojaDOJ() {
    try {
        const userId = 'w0erPLg81lVkFGlwedHN5UMJRDq2';
        const accurateDOJTimestamp = "2025-08-18T10:00:00.000Z";
        const batch = db.batch();

        // Fix user document createdAt
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
            createdAt: accurateDOJTimestamp
        });
        
        // Fix enrollment document dates
        const schemesRef = await db.collection('user_schemes').where('userId', '==', userId).get();
        schemesRef.forEach(doc => {
            batch.update(doc.ref, {
                enrollmentDate: accurateDOJTimestamp,
                startDate: accurateDOJTimestamp,
                createdAt: accurateDOJTimestamp
            });
            console.log(`Updated enrollment ${doc.id} dates to ${accurateDOJTimestamp}`);
        });

        await batch.commit();
        console.log("Successfully updated Saroja's Date of Joining on all related documents.");
    } catch (err) {
        console.error("Error updating DOJ:", err);
    } finally {
        process.exit();
    }
}

fixSarojaDOJ();
