/**
 * fix_doj.mjs
 * Fixes the Date of Joining (enrollmentDate) for:
 *   1. PAVITHRA (phone: 9566471802) → DOJ should be 10/07/2026 (10th July 2026)
 *   2. ABHISHREE (phone: 8675863066) → DOJ should be 12/03/2026 (12th March 2026)
 *
 * Run: node fix_doj.mjs
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
    authDomain: "vasthara-8f0cf.firebaseapp.com",
    projectId: "vasthara-8f0cf",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Customers to fix: { name, userId (phone), correct enrollmentDate in DD-MM-YYYY }
const FIXES = [
    {
        name: "PAVITHRA",
        userId: "9566471802",
        correctDate: "10-07-2026",       // 10th July 2026
        correctISO: "2026-07-10T00:00:00.000Z",
    },
    {
        name: "ABHISHREE",
        userId: "8675863066",
        correctDate: "12-03-2026",       // 12th March 2026
        correctISO: "2026-03-12T00:00:00.000Z",
    },
];

async function fix() {
    for (const cust of FIXES) {
        console.log(`\n--- Fixing ${cust.name} (${cust.userId}) ---`);

        // Find all user_schemes for this user
        const q = query(collection(db, "user_schemes"), where("userId", "==", cust.userId));
        const snap = await getDocs(q);

        if (snap.empty) {
            console.log(`  No schemes found for ${cust.name}`);
            continue;
        }

        for (const schemeDoc of snap.docs) {
            const data = schemeDoc.data();
            const oldDate = data.enrollmentDate;
            console.log(`  Scheme ${schemeDoc.id}: current enrollmentDate = "${oldDate}"`);

            // Update enrollmentDate
            await updateDoc(doc(db, "user_schemes", schemeDoc.id), {
                enrollmentDate: cust.correctDate,
            });
            console.log(`  ✅ Updated to "${cust.correctDate}"`);
        }

        // Also update createdAt on the user profile if needed
        const userQ = query(collection(db, "users"), where("phone", "==", cust.userId));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
            const userDoc = userSnap.docs[0];
            const userData = userDoc.data();
            console.log(`  User profile createdAt: "${userData.createdAt}"`);
            await updateDoc(doc(db, "users", userDoc.id), {
                createdAt: cust.correctISO,
            });
            console.log(`  ✅ Updated user createdAt to "${cust.correctISO}"`);
        }

        // Also try with the userId as doc ID directly
        try {
            const directRef = doc(db, "users", cust.userId);
            await updateDoc(directRef, {
                createdAt: cust.correctISO,
            });
            console.log(`  ✅ Updated user doc (by ID) createdAt to "${cust.correctISO}"`);
        } catch (e) {
            // Doc might not exist by that ID, that's OK
        }
    }

    console.log("\n✅ All DOJ fixes applied.");
    process.exit(0);
}

fix().catch(e => { console.error("Error:", e); process.exit(1); });
