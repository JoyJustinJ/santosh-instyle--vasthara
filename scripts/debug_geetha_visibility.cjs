const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Listing all root collections in Firestore ===");
    const collections = await db.listCollections();
    for (const col of collections) {
        console.log("Collection:", col.id);
        // if it's not users, user_schemes, or transactions, check if it has GEETHA / 9585137199 / 9442779733 / 3112202550002
        if (!['users', 'user_schemes', 'transactions', 'otp_store', 'notifications'].includes(col.id)) {
            const snap = await col.get();
            console.log(`  Size of ${col.id}: ${snap.size} docs`);
            snap.forEach(doc => {
                const str = JSON.stringify(doc.data());
                if (str.includes('9585137199') || str.includes('9442779733') || str.includes('GEET') || str.includes('3112202550002') || str.includes('VS1016') || str.includes('VS1017')) {
                    console.log(`  Match in ${col.id} (${doc.id}):`, str);
                }
            });
        }
    }

    console.log("\n=== Checking full doc data for 9585137199 and 9442779733 in users ===");
    const u1 = await db.collection('users').doc('9442779733').get();
    console.log("9442779733:", u1.data());
    const u2 = await db.collection('users').doc('9585137199').get();
    console.log("9585137199:", u2.data());

    console.log("\n=== Checking full doc data for user_schemes ===");
    const s1 = await db.collection('user_schemes').doc('3Q0Wtln5E4fnA9NWSsPd').get();
    console.log("3Q0Wtln5E4fnA9NWSsPd (ZCV7DTUI):", s1.data());
    const s2 = await db.collection('user_schemes').doc('RD3CdbFJKQhfs8fjGYM8').get();
    console.log("RD3CdbFJKQhfs8fjGYM8 (331CO3UK):", s2.data());

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
