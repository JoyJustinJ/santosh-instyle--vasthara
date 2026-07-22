/**
 * import_vastra_excel.mjs
 * Imports green-highlighted data from VASTRA.xlsx into Firebase:
 *   1. Adds new installment transactions for existing customers
 *   2. Updates user_schemes (monthsPaid / totalPaid) accordingly
 *   3. Creates a new user account + scheme for PAVITHRA (new customer)
 *
 * Run: node import_vastra_excel.mjs
 */

import { initializeApp } from "firebase/app";
import {
    getFirestore, collection, doc, getDocs, getDoc,
    setDoc, updateDoc, query, where, writeBatch
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
    authDomain: "vasthara-8f0cf.firebaseapp.com",
    projectId: "vasthara-8f0cf",
    storageBucket: "vasthara-8f0cf.firebasestorage.app",
    messagingSenderId: "909051366907",
    appId: "1:909051366907:web:c2d36286f7e05177ec8f5e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- helpers ----------
function makeRefId() {
    return "REF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Convert DD/MM/YYYY or DD/MM/YY to ISO timestamp (midnight UTC) */
function dateToISO(ddmmyyyy) {
    const parts = ddmmyyyy.split("/");
    let [dd, mm, yyyy] = parts;
    if (yyyy.length === 2) yyyy = "20" + yyyy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`;
}

/** Convert DD/MM/YYYY to en-GB style DD/MM/YYYY (no change needed, just normalise) */
function toDisplayDate(ddmmyyyy) {
    const parts = ddmmyyyy.split("/");
    let [dd, mm, yyyy] = parts;
    if (yyyy.length === 2) yyyy = "20" + yyyy;
    return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}`;
}

async function generateCustomerId() {
    const snap = await getDocs(collection(db, "users"));
    let max = 999;
    snap.docs.forEach(d => {
        const cid = d.data().customerId;
        if (cid && /^CUS-\d+$/.test(cid)) {
            const n = parseInt(cid.split("-")[1]);
            if (n > max) max = n;
        }
    });
    return `CUS-${String(max + 1).padStart(4, "0")}`;
}

// ---------- DATA: new installments (one entry per green cell) ----------
// Only truly NEW ones (not already in Firebase as of the transactions.json snapshot).
// Skipped: RAKSHITHA inst#4 (already exists), SARADHA inst#5, SARITHA inst#6,
//          DIVYA inst#6, GEETHA inst#9 & inst#10 (already in dump), PADHMA inst#8,
//          NEERAJA inst#4.
const NEW_INSTALLMENTS = [
    { phone: "9626032090", name: "UMA MAHESHWARI",   amt: 500,  accId: "ACC-65F2W4E0",  date: "16/07/2026" },
    { phone: "9566666304", name: "MAHESHWARI",        amt: 1000, accId: "ACC-G7DRIAV9",  date: "07/05/2026" },
    { phone: "9916729721", name: "SUDHARSHAN.B",      amt: 1500, accId: "ACC-GSTHZWGI",  date: "07/01/2026" },
    { phone: "7708354594", name: "ANANYA",            amt: 1000, accId: "ACC-VHWSZ4A5",  date: "07/02/2026" },
    { phone: "8610690393", name: "MANIMARAN.S",       amt: 1000, accId: "ACC-KEP61DTN",  date: "13/07/2026" },
    { phone: "9952718984", name: "RAKSHITHA (5th)",   amt: 2000, accId: "ACC-X1FP6V2Z",  date: "15/07/2026" },
    { phone: "8754463042", name: "SHIVAKUMAR",        amt: 1000, accId: "ACC-VE31Y4SN",  date: "07/01/2026" },
    { phone: "7708956941", name: "PUJITH",            amt: 1500, accId: "ACC-HD3SCR5L",  date: "07/03/2026" },
    { phone: "8015304436", name: "MURALIMOHAN",       amt: 1000, accId: "ACC-STQUQ6U1",  date: "07/11/2026" },
    { phone: "9486291126", name: "DINAGARAN (8th)",   amt: 500,  accId: "ACC-90VAVUQO",  date: "06/11/2026" },
    { phone: "9486291126", name: "DINAGARAN (9th)",   amt: 500,  accId: "ACC-90VAVUQO",  date: "07/11/2026" },
    { phone: "8637651579", name: "ARAVINDH",          amt: 500,  accId: "ACC-JA8DLZRN",  date: "07/08/2026" },
    { phone: "7619658080", name: "HEMALATHA.S",       amt: 500,  accId: "ACC-7AARHOHT",  date: "07/03/2026" },
    { phone: "9902696907", name: "CARMEL VIOLET 9th", amt: 500,  accId: "ACC-0WLBJFEN",  date: "06/06/2026" },
    { phone: "9902696907", name: "CARMEL VIOLET 10th",amt: 500,  accId: "ACC-0WLBJFEN",  date: "07/06/2026" },
];

// ---------- DATA: new customer ----------
const NEW_CUSTOMER = {
    phone: "9566471802",
    firstName: "PAVITHRA",
    lastName: "",
    doj: "07/10/2026",   // date of joining
    schemeAmt: 500,
    firstInstallDate: "07/10/2026"
};

// ---------- MAIN ----------
async function run() {
    console.log("=== VASTRA Excel Import ===\n");

    // ── STEP 1: Add new transactions and update scheme counters ──
    console.log("--- Step 1: Adding new installment transactions ---");

    // ── Resolve live accountIds by querying Firestore (userId + amount) ──
    // Build a map: phone+amt -> real accountId
    console.log("  Resolving live account IDs from Firestore...");
    const resolvedAccIds = {};  // key: "phone|amt" -> accountId
    const phonesNeeded = [...new Set(NEW_INSTALLMENTS.map(i => i.phone))];
    for (const phone of phonesNeeded) {
        const q = query(collection(db, "user_schemes"), where("userId", "==", phone));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
            const data = d.data();
            const amt = Number(data.amount || data.monthlyAmount || 0);
            const key = `${phone}|${amt}`;
            // If multiple schemes with same amount, take the active one or first
            if (!resolvedAccIds[key] || data.status === "active") {
                resolvedAccIds[key] = d.id;
            }
        });
    }

    // Aggregate increments per resolved accountId
    const schemeIncrements = {};
    const enrichedInstallments = NEW_INSTALLMENTS.map(inst => {
        const key = `${inst.phone}|${inst.amt}`;
        const liveAccId = resolvedAccIds[key] || inst.accId;
        return { ...inst, liveAccId };
    });

    for (const inst of enrichedInstallments) {
        if (!schemeIncrements[inst.liveAccId]) {
            schemeIncrements[inst.liveAccId] = { count: 0, total: 0 };
        }
        schemeIncrements[inst.liveAccId].count += 1;
        schemeIncrements[inst.liveAccId].total += inst.amt;
    }

    // Batch-write all transactions
    const batch = writeBatch(db);
    let opCount = 0;

    for (const inst of enrichedInstallments) {
        const txRef = doc(collection(db, "transactions"));
        const displayDate = toDisplayDate(inst.date);
        const isoDate = dateToISO(inst.date);
        batch.set(txRef, {
            id: txRef.id,
            referenceId: makeRefId(),
            invoicePrimaryKey: txRef.id,
            userId: inst.phone,
            accountId: inst.liveAccId,
            amount: inst.amt,
            type: "subscription_payment",
            status: "Success",
            method: "CASH",
            recordedBy: "system_import",
            date: displayDate,
            timestamp: isoDate
        });
        opCount++;
        console.log(`  + TX: ${inst.name} | ${displayDate} | ₹${inst.amt} | ${inst.liveAccId}`);
    }

    // Update user_schemes for each affected account
    for (const [accId, inc] of Object.entries(schemeIncrements)) {
        const schemeRef = doc(db, "user_schemes", accId);
        const snap = await getDoc(schemeRef);
        if (!snap.exists()) {
            console.warn(`  ⚠ Scheme not found in Firestore: ${accId} — skipping scheme counter update`);
            continue;
        }
        const current = snap.data();
        const newMonthsPaid = (current.monthsPaid || 0) + inc.count;
        const newTotalPaid  = (current.totalPaid  || 0) + inc.total;
        const duration      = Number(current.duration || 11);
        const newStatus     = newMonthsPaid >= duration ? "completed" : "active";
        batch.update(schemeRef, {
            monthsPaid: newMonthsPaid,
            totalPaid:  newTotalPaid,
            status:     newStatus
        });
        opCount++;
        console.log(`  ↑ ${accId}: monthsPaid ${current.monthsPaid}→${newMonthsPaid}, totalPaid ₹${current.totalPaid}→₹${newTotalPaid}${newStatus === "completed" ? "  [COMPLETED]" : ""}`);
    }

    await batch.commit();
    console.log(`\n  ✓ Committed ${opCount} operations.\n`);

    // ── STEP 2: Create new customer PAVITHRA ──
    console.log("--- Step 2: Creating new customer PAVITHRA ---");

    const nc = NEW_CUSTOMER;

    // Check if already exists
    const existQ = query(collection(db, "users"), where("phone", "==", nc.phone));
    const existSnap = await getDocs(existQ);
    if (!existSnap.empty) {
        console.log(`  ⚠ User with phone ${nc.phone} already exists — skipping user creation.`);
    } else {
        const customerId = await generateCustomerId();
        const userRef = doc(db, "users", nc.phone);
        await setDoc(userRef, {
            id: nc.phone,
            phone: nc.phone,
            firstName: nc.firstName,
            lastName: nc.lastName,
            name: nc.firstName,
            customerId,
            role: "customer",
            phoneVerified: true,
            emailVerified: false,
            accountCreatedVia: "staff_import",
            createdAt: dateToISO(nc.doj),
            updatedAt: new Date().toISOString(),
            balance: 0,
            savings: 0,
            referralEmpId: null
        });
        console.log(`  ✓ Created user: ${nc.firstName} | Phone: ${nc.phone} | CustomerID: ${customerId}`);
    }

    // Create scheme enrollment
    // AccountId format: DDMMYYYY + amount + Nth (matching app logic)
    const [dd, mm, yyyy2] = nc.doj.split("/");
    const fullYear = yyyy2.length === 2 ? "20" + yyyy2 : yyyy2;
    // count existing same-amount schemes for this user
    const existingSchemesQ = query(collection(db, "user_schemes"), where("userId", "==", nc.phone));
    const existingSchemesSnap = await getDocs(existingSchemesQ);
    const sameAmtCount = existingSchemesSnap.docs.filter(
        d => Number(d.data().amount || d.data().monthlyAmount || 0) === nc.schemeAmt
    ).length;
    const nth = String(sameAmtCount + 1).padStart(2, "0");
    const accountId = `${dd.padStart(2,"0")}${mm.padStart(2,"0")}${fullYear}${nc.schemeAmt}${nth}`;

    const schemeCheck = await getDoc(doc(db, "user_schemes", accountId));
    if (schemeCheck.exists()) {
        console.log(`  ⚠ Scheme ${accountId} already exists — skipping scheme creation.`);
    } else {
        const schemeBatch = writeBatch(db);

        // user_schemes record
        schemeBatch.set(doc(db, "user_schemes", accountId), {
            userId: nc.phone,
            accountId,
            planId: "",
            name: `₹${nc.schemeAmt} Scheme`,
            schemeName: `₹${nc.schemeAmt} Scheme`,
            amount: nc.schemeAmt,
            monthlyAmount: nc.schemeAmt,
            duration: 11,
            monthsPaid: 1,
            totalPaid: nc.schemeAmt,
            status: "active",
            enrollmentDate: dateToISO(nc.doj),
            enrolledBy: "system_import",
            referralCode: null
        });

        // first transaction
        const firstTxRef = doc(collection(db, "transactions"));
        const displayDate = toDisplayDate(nc.firstInstallDate);
        schemeBatch.set(firstTxRef, {
            id: firstTxRef.id,
            referenceId: makeRefId(),
            invoicePrimaryKey: firstTxRef.id,
            userId: nc.phone,
            accountId,
            amount: nc.schemeAmt,
            type: "subscription_join",
            status: "Success",
            method: "CASH",
            recordedBy: "system_import",
            date: displayDate,
            timestamp: dateToISO(nc.firstInstallDate)
        });

        await schemeBatch.commit();
        console.log(`  ✓ Created scheme: ${accountId} | ₹${nc.schemeAmt}/month | DOJ: ${nc.doj}`);
        console.log(`  ✓ Recorded 1st installment: ${displayDate} | ₹${nc.schemeAmt}`);
    }

    console.log("\n=== Import complete ===");
    process.exit(0);
}

run().catch(err => {
    console.error("Import failed:", err);
    process.exit(1);
});
