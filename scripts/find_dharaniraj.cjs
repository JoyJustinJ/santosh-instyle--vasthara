const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Searching for DHARANIRAJ across all Firestore collections ===\n");

    const usersSnap = await db.collection('users').get();
    console.log("Matching Users:");
    usersSnap.forEach(d => {
        const data = d.data();
        const str = JSON.stringify(data).toLowerCase();
        if (str.includes('dharani') || str.includes('raj') || d.id.includes('dharani')) {
            console.log(`  User Doc ID (${d.id}):`, JSON.stringify(data));
        }
    });

    const schemesSnap = await db.collection('user_schemes').get();
    console.log("\nMatching Schemes:");
    schemesSnap.forEach(d => {
        const data = d.data();
        const str = JSON.stringify(data).toLowerCase();
        if (str.includes('dharani') || str.includes('raj')) {
            console.log(`  Scheme Doc ID (${d.id}):`, JSON.stringify(data));
        }
    });

    const txSnap = await db.collection('transactions').get();
    console.log("\nMatching Transactions:");
    txSnap.forEach(d => {
        const data = d.data();
        const str = JSON.stringify(data).toLowerCase();
        if (str.includes('dharani') || str.includes('raj')) {
            console.log(`  Tx Doc ID (${d.id}):`, JSON.stringify(data));
        }
    });

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
