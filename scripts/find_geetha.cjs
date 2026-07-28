const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Searching for GEETHA / account 3112202550002 / phones ===\n");

    const usersSnap = await db.collection('users').get();
    console.log("Users matching GEETHA or phones:");
    usersSnap.forEach(d => {
        const data = d.data();
        if ((data.firstName && data.firstName.toUpperCase().includes('GEE')) || 
            data.phone === '9442779733' || data.phone === '9585137199' || d.id === '9442779733' || d.id === '9585137199') {
            console.log(`  User Doc ID: ${d.id} | Name: ${data.firstName} ${data.lastName || ''} | Phone: ${data.phone} | CustID: ${data.customerId}`);
        }
    });

    const schemesSnap = await db.collection('user_schemes').get();
    console.log("\nSchemes matching GEETHA / account 3112202550002 / phone 9442779733:");
    const matchedSchemes = [];
    schemesSnap.forEach(d => {
        const data = d.data();
        if (data.accountId === '3112202550002' || data.userId === '9442779733' || data.userId === '9585137199' || (data.name && data.name.toUpperCase().includes('GEE'))) {
            console.log(`  Scheme Doc ID: ${d.id} | AccountID: ${data.accountId} | UserID: ${data.userId} | Name: ${data.name} | Enrollment: ${data.enrollmentDate} | TotalPaid: ${data.totalPaid} | MonthsPaid: ${data.monthsPaid}`);
            matchedSchemes.push({ docId: d.id, ...data });
        }
    });

    for (const scheme of matchedSchemes) {
        console.log(`\nTransactions for Account ID: ${scheme.accountId} (Scheme Doc: ${scheme.docId}):`);
        const txSnap = await db.collection('transactions').where('accountId', '==', scheme.accountId).get();
        let txs = [];
        txSnap.forEach(t => txs.push({ id: t.id, ...t.data() }));
        txs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        txs.forEach((t, idx) => {
            console.log(`    [${idx + 1}] ID: ${t.id} | Date: "${t.date}" | Amount: ${t.amount} | UserID: ${t.userId} | Timestamp: ${t.timestamp}`);
        });
    }

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
