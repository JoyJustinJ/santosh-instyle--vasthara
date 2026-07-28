const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== SEARCHING FOR CUSTOMER 'AMUDHA' / PHONE '9663270945' IN FIRESTORE ===\n");

    const usersSnap = await db.collection('users').get();
    let matches = [];
    usersSnap.forEach(doc => {
        const u = doc.data();
        if ((u.phone && (u.phone.includes('9663270945') || u.phone.includes('70945'))) || 
            (u.firstName && u.firstName.toLowerCase().includes('amudha')) ||
            (u.name && u.name.toLowerCase().includes('amudha'))) {
            matches.push({ id: doc.id, ...u });
        }
    });

    console.log(`Found ${matches.length} matching user(s):`, matches);

    // Also check schemes by phone or amount
    const schemesSnap = await db.collection('user_schemes').get();
    let matchingSchemes = [];
    schemesSnap.forEach(doc => {
        const s = doc.data();
        if ((s.phone && (s.phone.includes('9663270945') || s.phone.includes('70945'))) ||
            (s.userName && s.userName.toLowerCase().includes('amudha')) ||
            matches.some(m => m.id === s.userId || m.phone === s.phone || m.phone === s.userId)) {
            matchingSchemes.push({ docId: doc.id, ...s });
        }
    });

    console.log(`\nFound ${matchingSchemes.length} scheme(s) for Amudha:`, matchingSchemes);

    for (const scheme of matchingSchemes) {
        console.log(`\nTransactions for scheme ${scheme.accountId} (${scheme.schemeName || 'Gold'}, Amt: ₹${scheme.amount || scheme.monthlyAmount}):`);
        const txSnap = await db.collection('transactions').where('accountId', '==', scheme.accountId).get();
        let txs = [];
        txSnap.forEach(tDoc => {
            const t = tDoc.data();
            txs.push({ docId: tDoc.id, status: t.status, amount: t.amount, date: t.date, timestamp: t.timestamp });
        });
        txs.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
        console.log(JSON.stringify(txs, null, 2));
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
