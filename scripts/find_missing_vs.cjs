const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Finding existing VS Customer IDs and analyzing gaps ===\n");

    const usersSnap = await db.collection('users').get();
    const vsNumbers = [];
    const withoutVs = [];

    usersSnap.forEach(d => {
        const data = d.data();
        if (data.customerId && String(data.customerId).startsWith('VS')) {
            const num = parseInt(data.customerId.replace('VS', ''), 10);
            if (!isNaN(num)) vsNumbers.push({ num, custId: data.customerId, id: d.id, name: data.firstName || data.name, phone: data.phone });
        } else {
            withoutVs.push({ id: d.id, ...data });
        }
    });

    vsNumbers.sort((a, b) => a.num - b.num);

    console.log("Users without VS customerId:", withoutVs);

    console.log("\nChecking for missing numbers in sequence:");
    const nums = vsNumbers.map(v => v.num);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    console.log(`VS ID range: VS${min} to VS${max}`);

    const missing = [];
    for (let i = min; i <= max; i++) {
        if (!nums.includes(i)) {
            missing.push(`VS${i}`);
        }
    }
    console.log("Missing VS IDs in range:", missing);

    // print a few IDs around VS1001 - VS1020
    vsNumbers.filter(v => v.num >= 1001 && v.num <= 1015).forEach(v => {
        console.log(`  ${v.custId}: ${v.name} (Phone: ${v.phone})`);
    });

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
