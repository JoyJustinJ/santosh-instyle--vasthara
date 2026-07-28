const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
    // List all root-level collections
    const cols = await db.listCollections();
    console.log("All Firestore collections:");
    for (const col of cols) {
        const snap = await col.limit(1).get();
        console.log(` - ${col.id}  (${snap.size} sampled doc)`);
        snap.forEach(d => {
            const keys = Object.keys(d.data());
            console.log(`    Sample keys: ${keys.join(', ')}`);
        });
    }
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
