const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
    // Search users for PUJITH
    console.log("=== Searching users for PUJITH ===");
    const usersSnap = await db.collection('users').get();
    let pujithUser = null;
    usersSnap.forEach(d => {
        const data = d.data();
        const name = ((data.name || '') + ' ' + (data.firstName || '') + ' ' + (data.lastName || '')).toUpperCase();
        if (name.includes('PUJITH')) {
            pujithUser = { id: d.id, ...data };
            console.log('Found user:', JSON.stringify(pujithUser, null, 2));
        }
    });

    if (pujithUser) {
        // get their transactions
        const txSnap = await db.collection('transactions').where('userId', '==', pujithUser.id).get();
        console.log(`\nTransactions by user id (${pujithUser.id}): ${txSnap.size}`);
        let txs = [];
        txSnap.forEach(d => txs.push({ id: d.id, ...d.data() }));
        txs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        txs.forEach((t, i) => console.log(`  [${i+1}] ID: ${t.id} | date: ${t.date} | timestamp: ${t.timestamp}`));

        // get their user_schemes
        const schemeSnap = await db.collection('user_schemes').where('userId', '==', pujithUser.id).get();
        console.log(`\nuser_schemes: ${schemeSnap.size}`);
        schemeSnap.forEach(d => {
            const data = d.data();
            console.log(`  ID: ${d.id} | accountId: ${data.accountId} | name: ${data.name}`);
        });
    }

    // Also search user_schemes by name field
    console.log("\n=== Searching user_schemes directly ===");
    const schemeSnap = await db.collection('user_schemes').get();
    schemeSnap.forEach(d => {
        const data = d.data();
        const name = (data.name || '').toUpperCase();
        if (name.includes('PUJITH')) {
            console.log(`Found scheme: ${d.id}`, JSON.stringify(data, null, 2));
        }
    });

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
