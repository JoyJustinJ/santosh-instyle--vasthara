const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function generateRefId() {
    return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/*
 SIVARAMAKRISHNAN — Vastra Pass Book
 ─────────────────────────────────────────────────────────
 Phone/Membership : 8838279177
 Scheme           : ₹500/month | Group 500
 Enrollment Date  : 20-09-2025
 DB Scheme DocId  : 3Mh9Wevg9l7EEjdnYPXZ
 DB Account Id    : ACC-3SAJP4I4
 ─────────────────────────────────────────────────────────
 Passbook vs DB comparison:
   Inst 1  → 20-09-2025  ₹500   ✅ Already in DB
   Inst 2  → 06-10-2025  ₹500   ✅ Already in DB
   Inst 3  → 26-11-2025  ₹500   ✅ Already in DB
   Inst 4  → 08-12-2025  ₹500   ✅ Already in DB
   Inst 5  → 16-01-2026  ₹1000  ✅ In DB as ₹500 (partial; the extra ₹500 is skipped — report)
   Inst 6  → 16-02-2026  ₹500   ✅ Already in DB
   Inst 7  → 05-03-2026  ₹500   ✅ In DB as 01-03-2026 (date close, same month)
   Inst 8  → 01-04-2026  ₹500   ✅ In DB as 05-04-2026 (date close, same month)
   Inst 9  → 18-05-2026  ₹500   ✅ In DB as 12-05-2026 (date close, same month)
   Inst 10 → June 2026   ₹?     ❌ MISSING — date/amount unclear in passbook → SKIPPING, report
   Inst 11 → 06-07-2026  ₹1000  ❌ MISSING → ADD NOW
 ─────────────────────────────────────────────────────────
*/

async function main() {
    const schemeDocId = '3Mh9Wevg9l7EEjdnYPXZ';
    const accountId   = 'ACC-3SAJP4I4';
    const userId      = '8838279177';

    console.log('=== Adding missing installments for SIVARAMAKRISHNAN ===\n');

    // ── Inst 11: 06-07-2026 ₹1000 (Gpay) ──
    const inst11Date   = '06-07-2026';
    const inst11Amount = 1000;

    const batch = db.batch();

    const tx11Ref  = db.collection('transactions').doc();
    const tx11Data = {
        id:          tx11Ref.id,
        accountId,
        userId,
        amount:      inst11Amount,
        date:        inst11Date,
        timestamp:   new Date('2026-07-06T12:00:00Z').toISOString(),
        status:      'Success',
        method:      'GPay',
        referenceId: generateRefId()
    };
    batch.set(tx11Ref, tx11Data);

    // Update scheme: monthsPaid 9 → 10, totalPaid += 1000
    // (Inst 10 is skipped as unclear; once confirmed it can be added separately)
    const schemeRef = db.collection('user_schemes').doc(schemeDocId);
    batch.update(schemeRef, {
        monthsPaid: admin.firestore.FieldValue.increment(1),
        totalPaid:  admin.firestore.FieldValue.increment(inst11Amount)
    });

    await batch.commit();

    console.log(`✅ Inst 11 added  → txId: ${tx11Ref.id}  |  Date: ${inst11Date}  |  Amount: ₹${inst11Amount}  |  Method: GPay`);

    // ── Summary ──
    console.log('\n══════════════════════════════════════════════════════');
    console.log('  SIVARAMAKRISHNAN (VS1077) — Installment Update Summary');
    console.log('══════════════════════════════════════════════════════');
    console.log('  Inst #  | Date         | Amount | Status');
    console.log('  --------|--------------| -------|-------------------');
    console.log('  1–9     | Sep25–May26  | ₹500   | Already in DB ✅');
    console.log('  5 extra | 16-01-2026   | +₹500  | ⚠️  Passbook shows ₹1000, DB has ₹500 — needs manual review');
    console.log('  10      | June 2026    | ₹?     | ⚠️  Date & amount unclear in passbook — SKIPPED, needs confirmation');
    console.log(`  11      | ${inst11Date} | ₹${inst11Amount} | ✅ Added now (${tx11Ref.id})`);
    console.log('  ──────────────────────────────────────────────────────');
    console.log('  DB after update: monthsPaid = 10, totalPaid = ₹5,500');
    console.log('══════════════════════════════════════════════════════\n');

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
