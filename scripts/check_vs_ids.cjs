const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Checking VS Customer IDs around VS1017 and searching for 9585137199 in all collections ===\n");

    const usersSnap = await db.collection('users').get();
    const vsList = [];
    usersSnap.forEach(d => {
        const data = d.data();
        if (data.customerId && String(data.customerId).startsWith('VS')) {
            vsList.push({ id: d.id, ...data });
        }
        // check if 9585137199 exists anywhere in user data
        if (JSON.stringify(data).includes('9585137199') || d.id.includes('9585137199')) {
            console.log("Found 9585137199 in user:", d.id, data);
        }
    });

    vsList.sort((a, b) => {
        const numA = parseInt(a.customerId.replace('VS', '') || '0', 10);
        const numB = parseInt(b.customerId.replace('VS', '') || '0', 10);
        return numA - numB;
    });

    console.log("VS IDs around VS1017:");
    vsList.filter(u => {
        const num = parseInt(u.customerId.replace('VS', '') || '0', 10);
        return num >= 1010 && num <= 1025;
    }).forEach(u => {
        console.log(`  CustID: ${u.customerId} | Doc ID (Phone): ${u.id} | Name: ${u.firstName} ${u.lastName || ''}`);
    });

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
