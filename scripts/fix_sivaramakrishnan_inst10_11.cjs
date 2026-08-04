const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function generateRefId() {
    return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function main() {
    const schemeDocId  = '3Mh9Wevg9l7EEjdnYPXZ';
    const accountId    = 'ACC-3SAJP4I4';
    const userId       = '8838279177';

    // ── STEP 1: Delete the wrong inst #11 we added (06-07-2026, ₹1000) ──
    const wrongTxId = 'Otz7PhbNG8fzVSKyOUdQ';
    await db.collection('transactions').doc(wrongTxId).delete();
    console.log(`🗑️  Deleted wrong transaction: ${wrongTxId}  (06-07-2026, ₹1000)`);

    // ── STEP 2: Reverse the scheme counter for that wrong entry ──
    //    (scheme was at monthsPaid=10, totalPaid=5500 after wrong add)
    //    After reversal: monthsPaid=9, totalPaid=4500
    const schemeRef = db.collection('user_schemes').doc(schemeDocId);
    await schemeRef.update({
        monthsPaid: admin.firestore.FieldValue.increment(-1),
        totalPaid:  admin.firestore.FieldValue.increment(-1000)
    });
    console.log(`↩️  Reversed scheme: monthsPaid back to 9, totalPaid back to ₹4,500\n`);

    // ── STEP 3: Add correct Inst #10 — 12-06-2026 ₹500 ──
    const tx10Ref  = db.collection('transactions').doc();
    const tx10Data = {
        id:          tx10Ref.id,
        accountId,
        userId,
        amount:      500,
        date:        '12-06-2026',
        timestamp:   new Date('2026-06-12T12:00:00Z').toISOString(),
        status:      'Success',
        method:      'Manual Entry',
        referenceId: generateRefId()
    };
    await tx10Ref.set(tx10Data);
    await schemeRef.update({
        monthsPaid: admin.firestore.FieldValue.increment(1),
        totalPaid:  admin.firestore.FieldValue.increment(500)
    });
    console.log(`✅ Inst #10 added  → txId: ${tx10Ref.id}  |  12-06-2026  |  ₹500`);

    // ── STEP 4: Add correct Inst #11 — 12-07-2026 ₹500 (scheme completes!) ──
    const tx11Ref  = db.collection('transactions').doc();
    const tx11Data = {
        id:          tx11Ref.id,
        accountId,
        userId,
        amount:      500,
        date:        '12-07-2026',
        timestamp:   new Date('2026-07-12T12:00:00Z').toISOString(),
        status:      'Success',
        method:      'Manual Entry',
        referenceId: generateRefId()
    };
    await tx11Ref.set(tx11Data);
    // Inst 11 = scheme complete (duration: 11), set status to completed
    await schemeRef.update({
        monthsPaid: admin.firestore.FieldValue.increment(1),
        totalPaid:  admin.firestore.FieldValue.increment(500),
        status:     'completed'
    });
    console.log(`✅ Inst #11 added  → txId: ${tx11Ref.id}  |  12-07-2026  |  ₹500  |  🎉 Scheme COMPLETED`);

    // ── SUMMARY ──
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  SIVARAMAKRISHNAN (VS1077) — Final Installment Summary');
    console.log('══════════════════════════════════════════════════════════');
    console.log('  Inst  | Date         | Amount | Status');
    console.log('  ------|--------------|--------|----------------------------');
    console.log('  1–9   | Sep25–May26  | ₹500   | ✅ Already existed in DB');
    console.log(`  10    | 12-06-2026   | ₹500   | ✅ Added (${tx10Ref.id})`);
    console.log(`  11    | 12-07-2026   | ₹500   | ✅ Added (${tx11Ref.id}) 🎉`);
    console.log('  ──────────────────────────────────────────────────────────');
    console.log('  Total Paid : ₹5,500  |  monthsPaid : 11  |  Status: COMPLETED');
    console.log('══════════════════════════════════════════════════════════\n');

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
