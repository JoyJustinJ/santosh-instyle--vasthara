const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Checking Schemes and Transactions for HEMALATHA.S (7619658080) ===\n");
    const ids = ["7619658080", "HEMALATHA.S", "VS1020"];
    
    const userSnap = await db.collection('users').get();
    userSnap.forEach(d => {
        const data = d.data();
        if (data.phone === "7619658080" || d.id === "7619658080" || data.name?.toUpperCase().includes("HEMA")) {
            console.log("User found:", d.id, JSON.stringify(data));
        }
    });

    const schemesSnap = await db.collection('user_schemes').get();
    schemesSnap.forEach(d => {
        const data = d.data();
        if (ids.includes(data.userId) || ids.includes(data.phone) || JSON.stringify(data).includes("7619658080")) {
            console.log("Scheme found:", d.id, JSON.stringify(data));
        }
    });

    const txSnap = await db.collection('transactions').get();
    const txs = [];
    txSnap.forEach(d => {
        const data = d.data();
        if (ids.includes(data.userId) || ids.includes(data.phone) || JSON.stringify(data).includes("7619658080")) {
            txs.push({ id: d.id, ...data });
        }
    });
    txs.sort((a,b) => (a.date || '').localeCompare(b.date || ''));
    console.log(`\nFound ${txs.length} transactions:`);
    txs.forEach(t => console.log(JSON.stringify(t)));

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
