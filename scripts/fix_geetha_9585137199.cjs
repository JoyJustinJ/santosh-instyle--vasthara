const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Correcting GEETA data (Mobile: 9585137199, Scheme: ACC-331CO3UK) ===\n");

    const newUserId = "9585137199";
    const accountId = "ACC-331CO3UK";
    const schemeDocId = "RD3CdbFJKQhfs8fjGYM8";

    // 1. Create / Update User Profile for GEETA (9585137199) with CustID VS1016
    const userRef = db.collection('users').doc(newUserId);
    const userSnap = await userRef.get();
    const userData = {
        id: newUserId,
        firstName: "GEETA",
        lastName: "",
        phone: newUserId,
        customerId: "VS1016",
        role: "user",
        createdAt: "2025-12-31T00:00:00.000Z"
    };
    await userRef.set(userData, { merge: true });
    console.log("✅ Created/updated user profile for GEETA:", userData);

    // 2. Update Scheme (RD3CdbFJKQhfs8fjGYM8) to belong to 9585137199 and update totals
    const schemeRef = db.collection('user_schemes').doc(schemeDocId);
    const schemeSnap = await schemeRef.get();
    if (!schemeSnap.exists) {
        throw new Error(`Scheme doc ${schemeDocId} not found!`);
    }
    const oldSchemeData = schemeSnap.data();
    console.log("\nOld Scheme Data:", JSON.stringify(oldSchemeData));

    const updatedSchemeData = {
        userId: newUserId,
        enrollmentDate: "31-12-2025",
        totalPaid: 4000,
        monthsPaid: 8
    };
    await schemeRef.update(updatedSchemeData);
    console.log("✅ Updated scheme to new phone number and 8 installments:", updatedSchemeData);

    // 3. Regulate and update all 8 transactions
    const targetInstallments = [
        { docId: "ve5al5w98zxqZtM3J5m8", date: "31-12-2025", timestamp: "2025-12-31T12:00:00.000Z" }, // 1st
        { docId: "1BygD0sinFm1GM8L2mCB", date: "17-01-2026", timestamp: "2026-01-17T12:00:00.000Z" }, // 2nd
        { docId: null,                   date: "20-02-2026", timestamp: "2026-02-20T12:00:00.000Z" }, // 3rd (new)
        { docId: "UzW8G8g24z7jzxNrciNM", date: "11-03-2026", timestamp: "2026-03-11T12:00:00.000Z" }, // 4th
        { docId: "Qu1I3FQovmtfAgQvdlol", date: "06-04-2026", timestamp: "2026-04-06T12:00:00.000Z" }, // 5th
        { docId: null,                   date: "21-05-2026", timestamp: "2026-05-21T12:00:00.000Z" }, // 6th (new)
        { docId: null,                   date: "30-06-2026", timestamp: "2026-06-30T12:00:00.000Z" }, // 7th (new)
        { docId: null,                   date: "27-07-2026", timestamp: "2026-07-27T12:00:00.000Z" }  // 8th (new)
    ];

    const batch = db.batch();
    const txCollection = db.collection('transactions');

    console.log("\nUpdating transactions:");
    for (let i = 0; i < targetInstallments.length; i++) {
        const item = targetInstallments[i];
        let ref;
        if (item.docId) {
            ref = txCollection.doc(item.docId);
        } else {
            ref = txCollection.doc();
        }

        const txData = {
            accountId: accountId,
            userId: newUserId,
            amount: 500,
            date: item.date,
            timestamp: item.timestamp,
            method: "Cash",
            status: "success"
        };
        batch.set(ref, txData, { merge: true });
        console.log(`  [${i + 1}] Set date=${item.date}, amount=500, userId=${newUserId} (Doc: ${ref.id})`);
    }

    await batch.commit();
    console.log("\n✅ All 8 installments regulated and saved successfully!");

    // 4. Verification: fetch and display the final state
    console.log("\n=== Final Verification for GEETA (9585137199) ===");
    const verifyUser = await db.collection('users').doc(newUserId).get();
    console.log("User:", verifyUser.data());

    const verifySchemes = await db.collection('user_schemes').where("userId", "==", newUserId).get();
    verifySchemes.forEach(s => {
        console.log("Scheme:", { id: s.id, ...s.data() });
    });

    const verifyTxs = await db.collection('transactions').where("userId", "==", newUserId).get();
    const loadedTxs = [];
    verifyTxs.forEach(t => loadedTxs.push({ id: t.id, ...t.data() }));
    loadedTxs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    console.log(`\nTransactions (${loadedTxs.length} total):`);
    loadedTxs.forEach((t, idx) => {
        console.log(`  [${idx + 1}] ID: ${t.id} | Date: ${t.date} | Amount: ${t.amount} | UserID: ${t.userId}`);
    });

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
