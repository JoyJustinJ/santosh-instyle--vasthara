const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// Customers from the image
const customers = [
    { name: 'Krishnaveni', phone: '9751168633',   installment: 8,  date: '02-08-2026' },
    { name: 'Sivarama Krishnan', phone: '8838279147', installment: 11, date: '12-07-2026' },
    { name: 'Latha',       phone: '9345295934',   installment: 8,  date: '31-07-2026' },
    { name: 'Dharaniraj',  phone: '6374218894',   installment: 8,  date: '31-07-2026' },
    { name: 'Christina',   phone: '9944488760',   installment: null, date: '21-07-2026' }, // installment number unclear in image
];

async function main() {
    const usersSnap   = await db.collection('users').get();
    const schemesSnap = await db.collection('user_schemes').get();

    for (const cust of customers) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`CUSTOMER: ${cust.name}  |  Phone: ${cust.phone}`);
        console.log(`Expected installment #${cust.installment ?? '?'}  |  Date: ${cust.date}`);
        console.log('='.repeat(60));

        // Find users
        let matchedUsers = [];
        usersSnap.forEach(doc => {
            const u = doc.data();
            if ((u.phone && u.phone.includes(cust.phone)) ||
                (u.firstName && u.firstName.toLowerCase().includes(cust.name.toLowerCase())) ||
                (u.name && u.name.toLowerCase().includes(cust.name.toLowerCase()))) {
                matchedUsers.push({ id: doc.id, ...u });
            }
        });
        console.log(`Users found (${matchedUsers.length}):`, matchedUsers.map(u => `${u.id} | ${u.phone} | ${u.name || u.firstName || ''}`));

        // Find schemes
        let matchedSchemes = [];
        schemesSnap.forEach(doc => {
            const s = doc.data();
            if ((s.phone && s.phone.includes(cust.phone)) ||
                (s.userName && s.userName.toLowerCase().includes(cust.name.toLowerCase())) ||
                matchedUsers.some(m => m.id === s.userId || m.phone === s.phone || m.phone === s.userId || cust.phone === s.userId)) {
                matchedSchemes.push({ docId: doc.id, ...s });
            }
        });
        console.log(`\nSchemes found (${matchedSchemes.length}):`);
        for (const scheme of matchedSchemes) {
            console.log(`  DocID: ${scheme.docId}  AccountId: ${scheme.accountId}  Name: ${scheme.schemeName || 'Gold'}  Amt: ₹${scheme.amount || scheme.monthlyAmount}  monthsPaid: ${scheme.monthsPaid}  totalPaid: ${scheme.totalPaid}`);
            const txSnap = await db.collection('transactions').where('accountId', '==', scheme.accountId).get();
            let txs = [];
            txSnap.forEach(tDoc => {
                const t = tDoc.data();
                txs.push({ docId: tDoc.id, amount: t.amount, date: t.date, status: t.status });
            });
            txs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            console.log(`  Transactions (${txs.length}):`, JSON.stringify(txs));
        }
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
