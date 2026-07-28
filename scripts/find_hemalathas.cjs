const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Finding HEMALATHAS ===\n");

    // Search users by name
    const snap1 = await db.collection('users').where('firstName', '==', 'HEMALATHAS').get();
    const snap2 = await db.collection('users').where('firstName', '==', 'HEMALATHA.S').get();
    const snap3 = await db.collection('users').where('firstName', '==', 'HEMALATHA').get();
    
    let userId = null;
    [snap1, snap2, snap3].forEach(snap => {
        snap.forEach(d => {
            console.log('User:', JSON.stringify({ id: d.id, ...d.data() }));
            userId = d.id;
        });
    });

    if (!userId) {
        console.log("Not found by name. Trying phone search...");
    }

    // Transactions
    const txSnaps = userId ? await db.collection('transactions').where('userId', '==', userId).get() : { size: 0, forEach: () => {} };
    let txs = [];
    txSnaps.forEach(d => txs.push({ id: d.id, ...d.data() }));
    txs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    console.log(`\nTransactions (${txs.length}):`);
    txs.forEach((t, i) => console.log(`  [${i+1}] ID: ${t.id} | date: ${t.date} | ts: ${t.timestamp}`));

    // user_schemes
    const schemeSnap = userId ? await db.collection('user_schemes').where('userId', '==', userId).get() : { size: 0, forEach: () => {} };
    console.log(`\nuser_schemes:`);
    schemeSnap.forEach(d => console.log('  ', JSON.stringify({ id: d.id, ...d.data() })));

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
