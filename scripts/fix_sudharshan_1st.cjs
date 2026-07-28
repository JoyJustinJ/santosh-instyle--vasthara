const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
    console.log("=== Fixing SUDHARSHAN 1st installment: 10-11-2024 → 10-11-2025 ===\n");

    const userId = '9916729721';
    const txSnap = await db.collection('transactions').where('userId', '==', userId).get();

    let txs = [];
    txSnap.forEach(d => txs.push({ id: d.id, ref: d.ref, ...d.data() }));
    txs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // The 1st installment is the earliest — fix its year from 2024 to 2025
    const first = txs[0];
    if (!first) { console.log("No transactions found!"); process.exit(1); }

    console.log(`Before: ID=${first.id} | date=${first.date} | timestamp=${first.timestamp}`);

    await first.ref.update({
        date: '10-11-2025',
        timestamp: '2025-11-10T10:00:00.000Z'
    });

    console.log(`After:  ID=${first.id} | date=10-11-2025 | timestamp=2025-11-10T10:00:00.000Z`);
    console.log("\n✅ Done!");
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
