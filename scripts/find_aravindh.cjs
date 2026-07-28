const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
    const phone = '8637651579';
    console.log(`=== Finding ARAVINDH (${phone}) ===\n`);

    // Search in users
    const userSnap = await db.collection('users').where('phone', '==', phone).get();
    console.log(`users: ${userSnap.size}`);
    let userId = null;
    userSnap.forEach(d => {
        console.log('  User:', JSON.stringify({ id: d.id, ...d.data() }, null, 2));
        userId = d.id;
    });

    // Search transactions by userId (phone or doc id)
    const txSnap1 = await db.collection('transactions').where('userId', '==', phone).get();
    const txSnap2 = userId ? await db.collection('transactions').where('userId', '==', userId).get() : { size: 0, forEach: () => {} };
    
    let txs = [];
    txSnap1.forEach(d => txs.push({ id: d.id, ref: d.ref, ...d.data() }));
    txSnap2.forEach(d => {
        if (!txs.find(t => t.id === d.id)) txs.push({ id: d.id, ref: d.ref, ...d.data() });
    });

    txs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    console.log(`\nTransactions found: ${txs.length}`);
    txs.forEach((t, i) => console.log(`  [${i+1}] ID: ${t.id} | date: ${t.date} | timestamp: ${t.timestamp} | userId: ${t.userId}`));

    // Also check user_schemes
    const schemeSnap1 = await db.collection('user_schemes').where('userId', '==', phone).get();
    const schemeSnap2 = userId ? await db.collection('user_schemes').where('userId', '==', userId).get() : { size: 0, forEach: () => {} };
    console.log(`\nuser_schemes (by phone): ${schemeSnap1.size}`);
    schemeSnap1.forEach(d => console.log('  Scheme:', JSON.stringify({ id: d.id, ...d.data() })));
    console.log(`user_schemes (by userId): ${schemeSnap2.size}`);
    schemeSnap2.forEach(d => console.log('  Scheme:', JSON.stringify({ id: d.id, ...d.data() })));

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
