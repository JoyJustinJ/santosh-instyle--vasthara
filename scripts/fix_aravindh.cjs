/**
 * Fix ARAVINDH (8637651579):
 *   - 1st installment TX tZd5VfvfNJ3n2748qrtH: 03-06-2026 → 06-03-2026
 *   - user_schemes enrollmentDate: 03-06-2026 → 06-03-2026
 *
 * Correct installment dates from image:
 *   1st: 06-03-2026
 *   2nd: 01-04-2026  (already correct)
 *   3rd: 31-05-2026  (already correct)
 *   4th: 01-06-2026  (already correct)
 */
const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
    console.log("=== Fixing ARAVINDH DOJ and 1st installment ===\n");

    const batch = db.batch();

    // Fix 1st installment transaction
    const txRef = db.collection('transactions').doc('tZd5VfvfNJ3n2748qrtH');
    const txSnap = await txRef.get();
    console.log(`TX tZd5VfvfNJ3n2748qrtH: date=${txSnap.data().date} → 06-03-2026`);
    batch.update(txRef, {
        date: '06-03-2026',
        timestamp: '2026-03-06T10:00:00.000Z'
    });

    // Fix user_schemes enrollmentDate
    const schemeRef = db.collection('user_schemes').doc('mykuwPAoCX0NgxoAssOt');
    const schemeSnap = await schemeRef.get();
    console.log(`user_schemes enrollmentDate: ${schemeSnap.data().enrollmentDate} → 06-03-2026`);
    batch.update(schemeRef, {
        enrollmentDate: '06-03-2026'
    });

    await batch.commit();
    console.log("\n✅ Done! ARAVINDH DOJ and 1st installment corrected to 06-03-2026.");
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
