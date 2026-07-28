const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== UPDATING SUDHARSHAN.B (9916729721) PASSBOOK RECORD ===\n");
    const batch = db.batch();

    // 1. Delete the duplicate transaction that had the scheme doc ID as its accountId
    const badTxRef = db.collection('transactions').doc('caVQPsH2C6DEE7xRekUd');
    console.log("Deleting bogus duplicate transaction caVQPsH2C6DEE7xRekUd (which had accountId = scheme ID)");
    batch.delete(badTxRef);

    // 2. Update Scheme DOJ to match 1st Installment (10-11-2025)
    const schemeRef = db.collection('user_schemes').doc('jv7ZcHi2DeoUVQ9k8AUJ');
    batch.update(schemeRef, {
        enrollmentDate: '10-11-2025',
        createdAt: '2025-11-10T10:00:00.000Z',
        totalPaid: 12000,
        monthsPaid: 8
    });
    console.log("Updated Scheme jv7ZcHi2DeoUVQ9k8AUJ enrollmentDate -> 10-11-2025 (matching 1st installment)\n");

    // 3. Update all 8 valid transactions chronologically as shown on the passbook card
    const corrections = [
        { id: 'PqxxuHVEMXrhfHFjjN6J', date: '10-11-2025', timestamp: '2025-11-10T10:00:00.000Z', month: 'Nov 2025 (Inst #1)' },
        { id: 'Jdlm6iw4ICAflw6NTxh0', date: '02-12-2025', timestamp: '2025-12-02T10:00:00.000Z', month: 'Dec 2025 (Inst #2)' },
        { id: 'WfSx2EwKhyvFyxJZhkTX', date: '02-01-2026', timestamp: '2026-01-02T10:00:00.000Z', month: 'Jan 2026 (Inst #3)' },
        { id: 'CvSUcjFyUfladNDof0jg', date: '03-02-2026', timestamp: '2026-02-03T10:00:00.000Z', month: 'Feb 2026 (Inst #4)' },
        { id: 'QvFKYee1RGOBMb75yF2H', date: '02-03-2026', timestamp: '2026-03-02T10:00:00.000Z', month: 'March 2026 (Inst #5)' },
        { id: 'YHGrVbtBAxkNijZ5Hah6', date: '02-05-2026', timestamp: '2026-05-02T10:00:00.000Z', month: 'May 2026 (Inst #6)' },
        { id: 'eaKdvRCXh1PiuOy9zoGZ', date: '02-06-2026', timestamp: '2026-06-02T10:00:00.000Z', month: 'June 2026 (Inst #7)' },
        { id: 'FYUACXHb9ejyLxgDdS9z', date: '01-07-2026', timestamp: '2026-07-01T10:00:00.000Z', month: 'July 2026 (Inst #8)' },
    ];

    console.log("Applying passbook installment dates:");
    for (const item of corrections) {
        const ref = db.collection('transactions').doc(item.id);
        batch.update(ref, {
            date: item.date,
            timestamp: item.timestamp,
            status: 'Success'
        });
        console.log(`  -> ${item.id}: set date = ${item.date} [${item.month}]`);
    }

    console.log("\nCommitting changes to Firestore...");
    await batch.commit();
    console.log("✅ All updates successfully committed!\n");

    // Verification
    console.log("=== VERIFYING CLEAN RECORD AFTER UPDATE ===");
    const updatedScheme = await db.collection('user_schemes').doc('jv7ZcHi2DeoUVQ9k8AUJ').get();
    console.log(`Scheme DOJ: ${updatedScheme.data().enrollmentDate} | Months Paid: ${updatedScheme.data().monthsPaid} | Total Paid: ₹${updatedScheme.data().totalPaid}`);

    const txSnap = await db.collection('transactions').where('userId', '==', '9916729721').get();
    const finalTxs = [];
    txSnap.forEach(doc => finalTxs.push({ id: doc.id, ...doc.data() }));
    finalTxs.sort((a,b) => (a.timestamp || a.date).localeCompare(b.timestamp || b.date));
    
    console.log(`\nFinal Transaction History (${finalTxs.length} records found):`);
    finalTxs.forEach((t, i) => {
        console.log(`  [${i + 1}] Date: ${t.date} (${t.id}) | Amount: ₹${t.amount} | Account: ${t.accountId}`);
    });

    process.exit(0);
}

main().catch(e => { console.error("Error:", e); process.exit(1); });
