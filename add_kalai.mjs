import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, writeBatch } from "firebase/firestore";

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

// Arguments: node add_kalai.mjs <amount>
const amountArg = process.argv[2];
if (!amountArg) {
    console.error("Please provide the monthly amount! Example: node add_kalai.mjs 500");
    process.exit(1);
}

const AMT = parseInt(amountArg, 10);
const PHONE = "9751500007";
const NAME = "Kalai Mam";
const DOJ = "25/06/2026";
// Create ID format: DDMMYYYY + AMT + 0001 (e.g., 250620265000001)
const ACC_ID = `25062026${AMT}0001`; 

async function insertCustomer() {
    const batch = writeBatch(db);

    // 1. Create User
    batch.set(doc(db, "users", PHONE), {
        id: PHONE,
        phone: PHONE,
        firstName: "Kalai",
        lastName: "Mam",
        role: "customer",
        status: "active",
        createdAt: dateToISO(DOJ),
        pin: "1234" // Default pin
    });

    // 2. Create Scheme
    batch.set(doc(db, "user_schemes", ACC_ID), {
        userId: PHONE,
        accountId: ACC_ID,
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

    // 3. Create First Transaction
    const txRef = doc(collection(db, "transactions"));
    batch.set(txRef, {
        id: txRef.id,
        referenceId: makeRefId(),
        invoicePrimaryKey: txRef.id,
        userId: PHONE,
        userName: NAME,
        userPhone: PHONE,
        accountId: ACC_ID,
        schemeName: `₹${AMT} Scheme`,
        amount: AMT,
        type: "subscription_join",
        status: "Success",
        method: "CASH",
        recordedBy: "system_import",
        date: DOJ,
        timestamp: dateToISO(DOJ)
    });

    await batch.commit();
    console.log(`Successfully added ${NAME} (${PHONE}) with scheme ₹${AMT}`);
    process.exit(0);
}

insertCustomer().catch(e => { console.error(e); process.exit(1); });
