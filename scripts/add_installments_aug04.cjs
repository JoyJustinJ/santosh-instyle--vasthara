const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function generateRefId() {
    return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function addInstallment({ label, schemeDocId, accountId, userId, amount, date, installmentNo }) {
    console.log(`\n--- Adding installment #${installmentNo} for ${label} ---`);
    console.log(`  AccountId: ${accountId}  |  Amount: ₹${amount}  |  Date: ${date}`);

    const batch = db.batch();

    const txRef = db.collection('transactions').doc();
    const txData = {
        id: txRef.id,
        accountId,
        userId,
        amount,
        date,
        timestamp: new Date().toISOString(),
        status: 'Success',
        method: 'Manual Entry',
        referenceId: generateRefId()
    };
    batch.set(txRef, txData);

    const schemeRef = db.collection('user_schemes').doc(schemeDocId);
    batch.update(schemeRef, {
        monthsPaid: admin.firestore.FieldValue.increment(1),
        totalPaid: admin.firestore.FieldValue.increment(amount)
    });

    await batch.commit();
    console.log(`  ✅ SUCCESS — txDoc: ${txRef.id}`);
    return txRef.id;
}

async function main() {
    const results = [];

    // ─────────────────────────────────────────────
    // 1. KRISHNAVENI (9751168633) — 8th installment
    //    CHECK: Already has 8 transactions (one dated 2026-08-02)
    //    → SKIP: already added
    // ─────────────────────────────────────────────
    console.log('\n[KRISHNAVENI] 8th installment date 2026-08-02 already exists in DB → SKIPPING (already added)');
    results.push({ customer: 'Krishnaveni', phone: '9751168633', installment: 8, date: '02-08-2026', status: 'Already existed — SKIPPED' });

    // ─────────────────────────────────────────────
    // 2. SIVARAMA KRISHNAN (8838279147) — NOT FOUND IN DB
    //    → SKIP: no user/scheme record
    // ─────────────────────────────────────────────
    console.log('\n[SIVARAMA KRISHNAN] Not found in DB → SKIPPING (report to user)');
    results.push({ customer: 'Sivarama Krishnan', phone: '8838279147', installment: 11, date: '12-07-2026', status: 'NOT FOUND in database — needs investigation' });

    // ─────────────────────────────────────────────
    // 3. LATHA (9345295934) — 8th installment on 31-07-2026
    //    She has 3 schemes:
    //      ₹500  → 9 months paid  (over-count, skip)
    //      ₹1000 → 9 months paid  (over-count, skip)
    //      ₹2000 → 7 months paid  → needs 8th ✓
    // ─────────────────────────────────────────────
    const lathaDocId = 'jyVlFn29vrFSh5I3UA2n';
    const lathaAccId = 'ACC-9345295934-2000';
    const lathaTxId = await addInstallment({
        label: 'Latha (₹2000 scheme)',
        schemeDocId: lathaDocId,
        accountId: lathaAccId,
        userId: '9345295934',
        amount: 2000,
        date: '31-07-2026',
        installmentNo: 8
    });
    results.push({ customer: 'Latha', phone: '9345295934', installment: 8, date: '31-07-2026', status: `Added ✅ (txId: ${lathaTxId})`, scheme: '₹2000 — ACC-9345295934-2000' });

    // ─────────────────────────────────────────────
    // 4. DHARANIRAJ (6374218894) — 8th installment on 31-07-2026
    //    monthsPaid: 7 → needs 8th ✓
    // ─────────────────────────────────────────────
    const dharanirajDocId = 'TKRmGK2ODGsImzVHfrA3';
    const dharanirajAccId = 'ACC-CEXNB1EQ';
    const dharanirajTxId = await addInstallment({
        label: 'Dharaniraj',
        schemeDocId: dharanirajDocId,
        accountId: dharanirajAccId,
        userId: '6374218894',
        amount: 2000,
        date: '31-07-2026',
        installmentNo: 8
    });
    results.push({ customer: 'Dharaniraj', phone: '6374218894', installment: 8, date: '31-07-2026', status: `Added ✅ (txId: ${dharanirajTxId})`, scheme: '₹2000 — ACC-CEXNB1EQ' });

    // ─────────────────────────────────────────────
    // 5. CHRISTINA (9944488760) — 2nd installment on 21-07-2026
    //    monthsPaid: 1 → next is 2nd ✓
    //    (Note: image shows date 21/07/26, installment number not clear — treating as 2nd)
    // ─────────────────────────────────────────────
    const christinaDocId = 'aFOYMx5hZwuKg8G0Od80';
    const christinaAccId = 'ACC-GT4W6B7T';
    const christinaTxId = await addInstallment({
        label: 'Christina',
        schemeDocId: christinaDocId,
        accountId: christinaAccId,
        userId: '9944488760',
        amount: 500,
        date: '21-07-2026',
        installmentNo: 2
    });
    results.push({ customer: 'Christina', phone: '9944488760', installment: 2, date: '21-07-2026', status: `Added ✅ (txId: ${christinaTxId})`, scheme: '₹500 — ACC-GT4W6B7T' });

    // ─────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────
    console.log('\n\n========== FINAL SUMMARY ==========');
    for (const r of results) {
        console.log(`\n👤 ${r.customer} (${r.phone})`);
        console.log(`   Installment #${r.installment}  |  Date: ${r.date}`);
        if (r.scheme) console.log(`   Scheme: ${r.scheme}`);
        console.log(`   Status: ${r.status}`);
    }
    console.log('\n====================================\n');

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
