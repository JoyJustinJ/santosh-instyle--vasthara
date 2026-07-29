const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function generateRefId() {
    return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function main() {
    const schemeDocId = 'IFPIswjyLShXIZw2oLcs';
    const accountId = 'ACC-YSKL27TR';
    const userId = '9787155489';
    const date = '06-07-2026';
    const amount = 200;

    const batch = db.batch();

    // 1. Add new transaction
    const txRef = db.collection('transactions').doc();
    const txData = {
        id: txRef.id,
        accountId: accountId,
        userId: userId,
        amount: amount,
        date: date,
        timestamp: new Date().toISOString(),
        status: 'Success',
        method: 'Manual Entry',
        referenceId: generateRefId()
    };
    
    batch.set(txRef, txData);
    console.log("New transaction prepared:", txData);

    // 2. Update scheme
    const schemeRef = db.collection('user_schemes').doc(schemeDocId);
    batch.update(schemeRef, {
        monthsPaid: admin.firestore.FieldValue.increment(1),
        totalPaid: admin.firestore.FieldValue.increment(amount)
    });
    console.log("Scheme update prepared: increment monthsPaid by 1, totalPaid by 200");

    await batch.commit();
    console.log("=== SUCCESSFULLY ADDED 6TH INSTALLMENT AND UPDATED SCHEME ===");
    
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
