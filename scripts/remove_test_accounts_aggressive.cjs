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
    console.log("=== Removing Test Accounts (Aggressive Search) ===");

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

    let totalDeleted = 0;

    // Helper to check if any string value in an object matches our test names
    function hasTestName(obj) {
        if (!obj) return false;
        const str = JSON.stringify(obj).toLowerCase();
        return testNames.some(name => str.includes(name));
    }

    const collections = ['users', 'user_schemes', 'transactions', 'schemes', 'staff_requests'];

    for (const coll of collections) {
        console.log(`Scanning collection: ${coll}...`);
        const snap = await db.collection(coll).get();
        let deletedInColl = 0;
        
        snap.forEach(doc => {
            if (hasTestName(doc.data())) {
                addOp().delete(doc.ref);
                deletedInColl++;
                totalDeleted++;
                console.log(`   -> Deleting doc ${doc.id} from ${coll} (matched test name)`);
            }
        });
        console.log(`  -> Scheduled ${deletedInColl} docs for deletion in ${coll}.`);
    }

    if (totalDeleted > 0) {
        console.log(`\nCommitting ${totalDeleted} deletions...`);
        for (const batch of batchArray) {
            await batch.commit();
        }
        console.log("✅ Successfully removed all matching records!");
    } else {
        console.log("✅ No matching records found.");
    }
    
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
