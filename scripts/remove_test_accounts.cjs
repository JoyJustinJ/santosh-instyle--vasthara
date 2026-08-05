const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const testNames = [
    "satish kumar",
    "justin",
    "madeea iram",
    "rishvanth a",
    "sls sls",
    "freaking bad"
];

async function main() {
    console.log("=== Removing Test Accounts (Second Pass) ===");

    const usersSnap = await db.collection('users').get();
    
    let usersToDelete = new Map();

    usersSnap.forEach(doc => {
        const u = doc.data();
        const fullName = `${u.firstName || ''} ${u.lastName || ''} ${u.name || ''}`.trim().toLowerCase();
        
        const isTestAccount = testNames.some(testName => 
            fullName.includes(testName)
        );

        if (isTestAccount) {
            usersToDelete.set(doc.id, { id: doc.id, ...u });
        }
    });

    console.log(`Found ${usersToDelete.size} users to delete.`);
    
    if (usersToDelete.size === 0) {
        console.log("No test accounts found.");
        process.exit(0);
    }

    const batchArray = [db.batch()];
    let currentBatchIndex = 0;
    let opsInCurrentBatch = 0;

    const addOp = () => {
        opsInCurrentBatch++;
        if (opsInCurrentBatch >= 450) {
            batchArray.push(db.batch());
            currentBatchIndex++;
            opsInCurrentBatch = 0;
        }
        return batchArray[currentBatchIndex];
    };

    for (const [id, user] of usersToDelete) {
        console.log(`- Deleting user: ${user.firstName} ${user.lastName} / ${user.name} (ID: ${user.id}, Phone: ${user.phone})`);
        
        // Delete user document
        addOp().delete(db.collection('users').doc(user.id));

        // Delete associated schemes
        const schemesSnap = await db.collection('user_schemes').where('userId', '==', user.id).get();
        const schemeIds = [];
        schemesSnap.forEach(doc => {
            console.log(`   -> Deleting scheme: ${doc.id}`);
            addOp().delete(doc.ref);
            schemeIds.push(doc.id);
        });
        
        // Also find schemes by phone
        if (user.phone) {
             const schemesPhoneSnap = await db.collection('user_schemes').where('phone', '==', user.phone).get();
             schemesPhoneSnap.forEach(doc => {
                 console.log(`   -> Deleting scheme by phone: ${doc.id}`);
                 addOp().delete(doc.ref);
                 schemeIds.push(doc.id);
             });
        }

        // Delete associated transactions by userId
        const txSnap = await db.collection('transactions').where('userId', '==', user.id).get();
        txSnap.forEach(doc => {
            console.log(`   -> Deleting transaction: ${doc.id}`);
            addOp().delete(doc.ref);
        });
        
        // Delete associated transactions by phone
        if (user.phone) {
            const txPhoneSnap = await db.collection('transactions').where('customerAccount', '==', user.phone).get();
            txPhoneSnap.forEach(doc => {
                console.log(`   -> Deleting transaction by customerAccount: ${doc.id}`);
                addOp().delete(doc.ref);
            });
        }
        
        // Also delete transactions by accountId
        for (const sId of schemeIds) {
             const extraTxSnap = await db.collection('transactions').where('accountId', '==', sId).get();
             extraTxSnap.forEach(doc => {
                 addOp().delete(doc.ref);
             });
        }
    }

    console.log(`Committing deletions...`);
    for (const batch of batchArray) {
        await batch.commit();
    }
    
    console.log("✅ Successfully removed test accounts and their related records from the database!");
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
