/**
 * fix_pavithra_dedup.mjs
 * Step 1: Inspect all schemes & transactions for PAVITHRA (9566471802)
 * Step 2: Remove the duplicate scheme and its transactions
 *
 * Run: node fix_pavithra_dedup.mjs
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
    authDomain: "vasthara-8f0cf.firebaseapp.com",
    projectId: "vasthara-8f0cf",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PHONE = "9566471802";

// Determine which is the correct scheme based on the fix_pavithra.mjs script
// "07102026500001" was the CORRECT account ID created by fix_pavithra.mjs
// "20072010202650001" is the BAD duplicate that should have been deleted
const CORRECT_ACC_ID = "07102026500001";
const DUPLICATE_ACC_ID = "20072010202650001";

const DRY_RUN = process.argv.includes("--dry-run");

async function run() {
    console.log("=== PAVITHRA Dedup Script ===\n");
    if (DRY_RUN) console.log("🔍 DRY RUN MODE - no changes will be made\n");

    // 1. List all schemes for Pavithra
    console.log("--- All schemes for PAVITHRA ---");
    const schemesQ = query(collection(db, "user_schemes"), where("userId", "==", PHONE));
    const schemesSnap = await getDocs(schemesQ);
    
    for (const d of schemesSnap.docs) {
        const data = d.data();
        console.log(`  📋 ${d.id}`);
        console.log(`     enrollmentDate: ${data.enrollmentDate}`);
        console.log(`     amount: ${data.amount || data.monthlyAmount}`);
        console.log(`     monthsPaid: ${data.monthsPaid}, totalPaid: ${data.totalPaid}`);
        console.log(`     status: ${data.status}`);
        console.log(`     enrolledBy: ${data.enrolledBy || "N/A"}`);
        console.log();
    }

    // 2. List all transactions for Pavithra
    console.log("--- All transactions for PAVITHRA ---");
    const txQ = query(collection(db, "transactions"), where("userId", "==", PHONE));
    const txSnap = await getDocs(txQ);
    
    for (const d of txSnap.docs) {
        const data = d.data();
        console.log(`  💰 ${d.id} | accountId: ${data.accountId} | amount: ${data.amount} | type: ${data.type} | date: ${data.date || data.timestamp} | by: ${data.recordedBy}`);
    }
    console.log(`  Total transactions: ${txSnap.size}\n`);

    // 3. Delete the duplicate scheme
    const dupScheme = await getDoc(doc(db, "user_schemes", DUPLICATE_ACC_ID));
    if (dupScheme.exists()) {
        console.log(`🗑️  Duplicate scheme found: ${DUPLICATE_ACC_ID}`);
        if (!DRY_RUN) {
            await deleteDoc(doc(db, "user_schemes", DUPLICATE_ACC_ID));
            console.log(`  ✅ Deleted scheme: ${DUPLICATE_ACC_ID}`);
        } else {
            console.log(`  [DRY RUN] Would delete scheme: ${DUPLICATE_ACC_ID}`);
        }
    } else {
        console.log(`ℹ️  Duplicate scheme ${DUPLICATE_ACC_ID} not found (already deleted?)`);
    }

    // 4. Delete transactions linked to the duplicate accountId
    const dupTxQ = query(collection(db, "transactions"), where("accountId", "==", DUPLICATE_ACC_ID));
    const dupTxSnap = await getDocs(dupTxQ);
    
    if (dupTxSnap.size > 0) {
        console.log(`🗑️  Found ${dupTxSnap.size} transactions linked to duplicate ${DUPLICATE_ACC_ID}`);
        for (const d of dupTxSnap.docs) {
            if (!DRY_RUN) {
                await deleteDoc(doc(db, "transactions", d.id));
                console.log(`  ✅ Deleted transaction: ${d.id}`);
            } else {
                console.log(`  [DRY RUN] Would delete transaction: ${d.id}`);
            }
        }
    } else {
        console.log(`ℹ️  No transactions linked to duplicate ${DUPLICATE_ACC_ID}`);
    }

    // 5. Verify what remains
    console.log("\n--- Remaining schemes after cleanup ---");
    const finalSnap = await getDocs(schemesQ);
    const remaining = DRY_RUN ? schemesSnap.docs.filter(d => d.id !== DUPLICATE_ACC_ID) : finalSnap.docs;
    for (const d of remaining) {
        const data = d.data ? d.data() : d;
        console.log(`  ✅ ${d.id} | enrollmentDate: ${data.enrollmentDate} | amount: ${data.amount} | monthsPaid: ${data.monthsPaid} | totalPaid: ${data.totalPaid}`);
    }

    console.log("\n✅ Done.");
    process.exit(0);
}

run().catch(e => { console.error("Error:", e); process.exit(1); });
