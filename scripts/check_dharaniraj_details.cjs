const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Checking Schemes and Transactions for phone 6374218894 or id uuid-dharaniraj-1234 ===\n");

    const ids = ["6374218894", "uuid-dharaniraj-1234"];
    
    const schemesSnap = await db.collection('user_schemes').get();
    schemesSnap.forEach(d => {
        const data = d.data();
        if (ids.includes(data.userId) || ids.includes(data.phone) || JSON.stringify(data).includes("6374218894")) {
            console.log("Scheme found:", d.id, JSON.stringify(data));
        }
    });

    const txSnap = await db.collection('transactions').get();
    txSnap.forEach(d => {
        const data = d.data();
        if (ids.includes(data.userId) || ids.includes(data.phone) || JSON.stringify(data).includes("6374218894")) {
            console.log("Transaction found:", d.id, JSON.stringify(data));
        }
    });

    // Also let's check what customerId would be appropriate (e.g. check highest VS number or check if any VS number is missing or assigned to 6374218894)
    const usersSnap = await db.collection('users').get();
    let foundPhone = 0;
    usersSnap.forEach(d => {
        const data = d.data();
        if (data.phone === "6374218894" && d.id !== "uuid-dharaniraj-1234") {
            console.log("Another user doc found with same phone:", d.id, data);
        }
    });

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
