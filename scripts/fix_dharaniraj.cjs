const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Restoring DHARANIRAJ profile to phone 6374218894 and assigning VS1012 ===\n");

    const targetPhone = "6374218894";
    const targetCustId = "VS1012";
    const oldDocId = "uuid-dharaniraj-1234";

    // 1. Check existing old doc
    const oldRef = db.collection('users').doc(oldDocId);
    const oldSnap = await oldRef.get();
    if (oldSnap.exists) {
        console.log("Found old orphan profile:", oldSnap.data());
        await oldRef.delete();
        console.log(`Deleted orphan doc '${oldDocId}'`);
    }

    // 2. Create proper user doc under 6374218894
    const newRef = db.collection('users').doc(targetPhone);
    const userData = {
        id: targetPhone,
        customerId: targetCustId,
        firstName: "DHARANIRAJ",
        lastName: "",
        phone: targetPhone,
        role: "user",
        createdAt: "2025-12-27T00:00:00.000Z"
    };
    await newRef.set(userData, { merge: true });
    console.log("✅ Created standardized user profile for DHARANIRAJ:", userData);

    // 3. Check and verify schemes & transactions for this user
    const schemesSnap = await db.collection('user_schemes').where("userId", "==", targetPhone).get();
    console.log(`\nLinked Schemes for ${targetPhone}: ${schemesSnap.size}`);
    schemesSnap.forEach(s => {
        console.log("  Scheme:", { id: s.id, ...s.data() });
    });

    const txSnap = await db.collection('transactions').where("userId", "==", targetPhone).get();
    let txs = [];
    txSnap.forEach(t => txs.push({ id: t.id, ...t.data() }));
    txs.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    console.log(`\nLinked Transactions for ${targetPhone}: ${txs.length}`);
    txs.forEach((t, i) => {
        console.log(`  [${i + 1}] ID: ${t.id} | Date: ${t.date} | Amount: ${t.amount} | Status: ${t.status}`);
    });

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
