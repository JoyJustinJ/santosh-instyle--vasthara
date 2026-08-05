const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Finding 500 Rs Scheme ===");
    const schemesSnap = await db.collection('schemes').get();
    
    schemesSnap.forEach(doc => {
        const s = doc.data();
        if (s.amount === 500 || s.amount === '500' || s.monthlyAmount === 500 || s.monthlyAmount === '500') {
            console.log(doc.id, s);
        }
    });

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
