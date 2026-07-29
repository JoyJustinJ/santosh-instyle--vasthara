const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== SEARCHING FOR CUSTOMER 'SARITHA' / PHONE '9787155489' ===\n");

    const usersSnap = await db.collection('users').get();
    let matches = [];
    usersSnap.forEach(doc => {
        const u = doc.data();
        if ((u.phone && u.phone.includes('9787155489')) || 
            (u.firstName && u.firstName.toLowerCase().includes('saritha')) ||
            (u.name && u.name.toLowerCase().includes('saritha'))) {
            matches.push({ id: doc.id, ...u });
        }
    });

    console.log(`Found ${matches.length} matching user(s):`, matches);

    const schemesSnap = await db.collection('user_schemes').get();
    let matchingSchemes = [];
    schemesSnap.forEach(doc => {
        const s = doc.data();
        if ((s.phone && s.phone.includes('9787155489')) ||
            (s.userName && s.userName.toLowerCase().includes('saritha')) ||
            matches.some(m => m.id === s.userId || m.phone === s.phone || m.phone === s.userId)) {
            matchingSchemes.push({ docId: doc.id, ...s });
        }
    });

    console.log(`\nFound ${matchingSchemes.length} scheme(s) for Saritha:`, matchingSchemes);

    for (const scheme of matchingSchemes) {
        console.log(`\nTransactions for scheme ${scheme.accountId} (${scheme.schemeName || 'Gold'}, Amt: ₹${scheme.amount || scheme.monthlyAmount}):`);
        const txSnap = await db.collection('transactions').where('accountId', '==', scheme.accountId).get();
        let txs = [];
        txSnap.forEach(tDoc => {
            const t = tDoc.data();
            txs.push({ docId: tDoc.id, ...t });
        });
        txs.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
        console.log(JSON.stringify(txs, null, 2));
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
