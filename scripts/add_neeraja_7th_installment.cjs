/**
 * Add Neeraja's (9677911244) 7th installment — ₹500 scheme — on 27-07-2026
 *
 * Step 1: Look up the user & scheme to confirm IDs
 * Step 2: Add the transaction and update scheme counters
 */
const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function generateRefId() {
    return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function main() {
    const PHONE = '9677911244';
    const TARGET_AMOUNT = 500;
    const INSTALL_DATE = '27-07-2026';
    const INSTALL_NO = 7;

    console.log(`\n=== Looking up Neeraja (${PHONE}) ===\n`);

    // ── 1. Find user_schemes for this phone / ₹500 scheme ──────────────────
    const snap = await db.collection('user_schemes')
        .where('userId', '==', PHONE)
        .get();

    if (snap.empty) {
        console.error(`❌ No user_schemes found for phone ${PHONE}`);
        process.exit(1);
    }

    console.log(`Found ${snap.size} scheme(s):\n`);
    let targetScheme = null;
    snap.forEach(doc => {
        const d = doc.data();
        console.log(`  Doc ID : ${doc.id}`);
        console.log(`  Amount : ₹${d.amount}`);
        console.log(`  AccountId: ${d.accountId}`);
        console.log(`  monthsPaid: ${d.monthsPaid}  |  totalPaid: ₹${d.totalPaid}`);
        console.log(`  enrollmentDate: ${d.enrollmentDate}`);
        console.log('');

        if (Number(d.amount) === TARGET_AMOUNT && !targetScheme) {
            targetScheme = { id: doc.id, ...d };
        }
    });

    if (!targetScheme) {
        console.error(`❌ No ₹${TARGET_AMOUNT} scheme found for ${PHONE}`);
        process.exit(1);
    }

    console.log(`\n✅ Target scheme: ${targetScheme.id}  (accountId: ${targetScheme.accountId})`);
    console.log(`   Current monthsPaid: ${targetScheme.monthsPaid} → will become ${targetScheme.monthsPaid + 1}`);
    console.log(`   Current totalPaid:  ₹${targetScheme.totalPaid}  → will become ₹${targetScheme.totalPaid + TARGET_AMOUNT}\n`);

    // ── 2. Verify we're adding the right installment number ────────────────
    if (targetScheme.monthsPaid + 1 !== INSTALL_NO) {
        console.warn(`⚠️  WARNING: monthsPaid is ${targetScheme.monthsPaid}, so next should be installment #${targetScheme.monthsPaid + 1}, not #${INSTALL_NO}`);
        console.warn(`   Proceeding anyway as requested…\n`);
    }

    // ── 3. Write transaction + update scheme ───────────────────────────────
    const batch = db.batch();

    const txRef = db.collection('transactions').doc();
    const txData = {
        id: txRef.id,
        accountId: targetScheme.accountId,
        userId: PHONE,
        amount: TARGET_AMOUNT,
        date: INSTALL_DATE,
        timestamp: new Date('2026-07-27T10:00:00.000Z').toISOString(),
        status: 'Success',
        method: 'Manual Entry',
        referenceId: generateRefId()
    };
    batch.set(txRef, txData);
    console.log(`  Adding TX doc: ${txRef.id}`);
    console.log(`  Data:`, JSON.stringify(txData, null, 4));

    const schemeRef = db.collection('user_schemes').doc(targetScheme.id);
    batch.update(schemeRef, {
        monthsPaid: admin.firestore.FieldValue.increment(1),
        totalPaid: admin.firestore.FieldValue.increment(TARGET_AMOUNT)
    });

    await batch.commit();

    console.log(`\n✅ Done! Neeraja's ${INSTALL_NO}th installment (₹${TARGET_AMOUNT}) added on ${INSTALL_DATE}`);
    console.log(`   TX ID: ${txRef.id}`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
