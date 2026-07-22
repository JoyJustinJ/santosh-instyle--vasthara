/**
 * fix_pavithra.mjs
 * Deletes the badly-ID'd scheme 20072010202650002 and re-creates it correctly as 07102026500001
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, writeBatch } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
    authDomain: "vasthara-8f0cf.firebaseapp.com",
    projectId: "vasthara-8f0cf",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function makeRefId() { return "REF-" + Math.random().toString(36).substring(2, 8).toUpperCase(); }
function dateToISO(ddmmyyyy) {
    const [dd, mm, yyyy] = ddmmyyyy.split("/");
    const y = yyyy.length === 2 ? "20" + yyyy : yyyy;
    return `${y}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}T00:00:00.000Z`;
}

const PHONE = "9566471802";
const DOJ   = "07/10/2026";
const AMT   = 500;
const CORRECT_ACC_ID = "07102026500001"; // DD MM YYYY AMT 01
const BAD_ACC_ID     = "20072010202650002";

async function fix() {
    // 1. Delete bad scheme doc
    const badScheme = await getDoc(doc(db, "user_schemes", BAD_ACC_ID));
    if (badScheme.exists()) {
        await deleteDoc(doc(db, "user_schemes", BAD_ACC_ID));
        console.log("Deleted bad scheme:", BAD_ACC_ID);
    } else {
        console.log("Bad scheme already gone:", BAD_ACC_ID);
    }

    // 2. Delete any system_import transactions pointing to bad accId
    const q = query(collection(db, "transactions"), where("accountId","==",BAD_ACC_ID), where("recordedBy","==","system_import"));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => { batch.delete(doc(db,"transactions",d.id)); console.log("Deleted bad tx:", d.id); });

    // 3. Check if correct scheme already exists
    const goodScheme = await getDoc(doc(db, "user_schemes", CORRECT_ACC_ID));
    if (!goodScheme.exists()) {
        // Create correct scheme
        batch.set(doc(db, "user_schemes", CORRECT_ACC_ID), {
            userId: PHONE,
            accountId: CORRECT_ACC_ID,
            planId: "",
            name: `₹${AMT} Scheme`,
            schemeName: `₹${AMT} Scheme`,
            amount: AMT,
            monthlyAmount: AMT,
            duration: 11,
            monthsPaid: 1,
            totalPaid: AMT,
            status: "active",
            enrollmentDate: dateToISO(DOJ),
            enrolledBy: "system_import",
            referralCode: null
        });
        console.log("Creating correct scheme:", CORRECT_ACC_ID);

        // First transaction
        const txRef = doc(collection(db, "transactions"));
        batch.set(txRef, {
            id: txRef.id,
            referenceId: makeRefId(),
            invoicePrimaryKey: txRef.id,
            userId: PHONE,
            accountId: CORRECT_ACC_ID,
            amount: AMT,
            type: "subscription_join",
            status: "Success",
            method: "CASH",
            recordedBy: "system_import",
            date: "07/10/2026",
            timestamp: dateToISO(DOJ)
        });
        console.log("Creating first tx for", CORRECT_ACC_ID);
    } else {
        console.log("Correct scheme already exists:", CORRECT_ACC_ID);
    }

    await batch.commit();
    console.log("Done.");
    process.exit(0);
}
fix().catch(e => { console.error(e); process.exit(1); });
