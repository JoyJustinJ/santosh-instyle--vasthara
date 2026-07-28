const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== UPDATING ARAVINDH AND HEMALATHA IN FLUTTER/FIRESTORE DB ===\n");
    const batch = db.batch();

    // 1. ARAVINDH (8637651579 / Scheme mykuwPAoCX0NgxoAssOt / ACC-JA8DLZRN)
    // Update DOJ & 1st Installment to 06-03-2026
    console.log("1. Applying corrections for ARAVINDH (8637651579):");
    const aravindhSchemeRef = db.collection('user_schemes').doc('mykuwPAoCX0NgxoAssOt');
    batch.update(aravindhSchemeRef, {
        enrollmentDate: '06-03-2026',
        createdAt: '2026-03-06T10:00:00.000Z'
    });
    console.log("   -> Updated scheme mykuwPAoCX0NgxoAssOt enrollmentDate to 06-03-2026");

    const aravindhTxRef = db.collection('transactions').doc('r7D8ByNiAc59ajdhaGWN');
    batch.update(aravindhTxRef, {
        date: '06-03-2026',
        timestamp: '2026-03-06T10:00:00.000Z'
    });
    console.log("   -> Updated 1st installment transaction r7D8ByNiAc59ajdhaGWN date to 06-03-2026\n");

    // 2. HEMALATHA.S (7619658080 / Scheme AIEodXMkGPZeXXEXAukn / ACC-7AARHOHT)
    // Ensure 1st Installment matches DOJ (02-12-2025)
    console.log("2. Applying corrections for HEMALATHA (7619658080):");
    const hemalathaSchemeSnap = await db.collection('user_schemes').doc('AIEodXMkGPZeXXEXAukn').get();
    const doj = hemalathaSchemeSnap.data().enrollmentDate || '02-12-2025';
    console.log(`   -> Found Hemalatha DOJ (enrollmentDate): ${doj}`);

    // Update duplicate transaction 6dZ7m6Hx0pZdHA0JTxLx to match DOJ
    const hemalathaTxRef = db.collection('transactions').doc('6dZ7m6Hx0pZdHA0JTxLx');
    batch.update(hemalathaTxRef, {
        date: doj,
        timestamp: '2025-12-02T10:00:00.000Z'
    });
    console.log(`   -> Updated 1st installment transaction 6dZ7m6Hx0pZdHA0JTxLx date to match DOJ (${doj})\n`);

    console.log("Committing batch to Firestore...");
    await batch.commit();
    console.log("✅ All updates successfully saved to Firestore!\n");

    // VERIFICATION
    console.log("=== VERIFICATION AFTER UPDATE ===");
    console.log("\nARAVINDH Scheme & Installments (Chronological):");
    const aScheme = await db.collection('user_schemes').doc('mykuwPAoCX0NgxoAssOt').get();
    console.log(`Scheme DOJ (enrollmentDate): ${aScheme.data().enrollmentDate} | Months Paid: ${aScheme.data().monthsPaid}`);
    const aTxs = await db.collection('transactions').where('accountId', '==', 'ACC-JA8DLZRN').get();
    let aList = [];
    aTxs.forEach(d => aList.push({ id: d.id, ...d.data() }));
    aList.sort((a,b) => (a.timestamp || a.date).localeCompare(b.timestamp || b.date));
    aList.forEach((t, i) => {
        console.log(`  [${i+1}] ${t.date} (${t.id}) - ₹${t.amount} [${t.status}]`);
    });

    console.log("\nHEMALATHA Scheme & Installments (Chronological):");
    const hScheme = await db.collection('user_schemes').doc('AIEodXMkGPZeXXEXAukn').get();
    console.log(`Scheme DOJ (enrollmentDate): ${hScheme.data().enrollmentDate} | Months Paid: ${hScheme.data().monthsPaid}`);
    const hTxs = await db.collection('transactions').where('accountId', '==', 'ACC-7AARHOHT').get();
    let hList = [];
    hTxs.forEach(d => hList.push({ id: d.id, ...d.data() }));
    hList.sort((a,b) => (a.timestamp || a.date).localeCompare(b.timestamp || b.date));
    hList.forEach((t, i) => {
        console.log(`  [${i+1}] ${t.date} (${t.id}) - ₹${t.amount} [${t.status}]`);
    });

    process.exit(0);
}

main().catch(e => { console.error("Error:", e); process.exit(1); });
