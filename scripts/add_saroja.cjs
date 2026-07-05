const admin = require('firebase-admin');

const serviceAccount = require('/Users/rishvantha/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-49ec9824b9.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
    try {
        const phone = '9894848405';
        const name = 'Saroja.C';
        const userId = phone; // To match import_legacy_data.cjs
        const amount = 500;
        const dojStr = '18-08-2025';
        
        // 1. Check and clean up previous records if they exist to avoid duplicates
        const oldPlans = await db.collection('user_schemes').where('userId', '==', userId).get();
        for (const doc of oldPlans.docs) {
            await doc.ref.delete();
        }
        const oldTxs = await db.collection('transactions').where('userId', '==', userId).get();
        for (const doc of oldTxs.docs) {
            await doc.ref.delete();
        }

        // Upsert User
        await db.collection('users').doc(userId).set({
            id: userId,
            firstName: name,
            lastName: "",
            phone: phone,
            customerId: `VS9999`, 
            role: 'user',
            createdAt: new Date().toISOString()
        }, { merge: true });
        
        console.log("Upserted user Saroja.C");
        
        // Create Plan
        const accountId = `ACC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const planRef = db.collection('user_schemes').doc();
        
        await planRef.set({
            id: planRef.id,
            userId: userId,
            accountId: accountId,
            amount: amount,
            monthlyAmount: amount,
            duration: 11,
            monthsPaid: 11,
            totalPaid: 5500,
            status: 'completed',
            enrollmentDate: dojStr,
            createdAt: new Date().toISOString()
        });
        
        console.log(`Created Plan ${planRef.id} for account ${accountId}`);

        // Specific transactions
        const instDates = [
            "18-08-2025",
            "09-09-2025",
            "27-10-2025",
            "16-11-2025",
            "13-12-2025",
            "19-01-2026", // Written 2025 in image, but mathematically 2026
            "10-02-2026",
            "23-03-2026",
            "10-04-2026",
            "19-05-2026",
            "15-06-2026"
        ];
        
        for (let i = 0; i < instDates.length; i++) {
            const txRef = db.collection('transactions').doc();
            
            // Generate a plausible timestamp
            const parts = instDates[i].split('-');
            const txDateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
            
            await txRef.set({
                id: txRef.id,
                accountId: accountId,
                userId: userId,
                amount: amount,
                date: instDates[i], 
                timestamp: txDateObj.toISOString(), 
                status: 'Success',
                method: 'Legacy Import',
                referenceId: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            });
        }
        
        console.log("Transactions added. Success!");
        
    } catch (e) {
        console.error(e);
    }
}

run();
