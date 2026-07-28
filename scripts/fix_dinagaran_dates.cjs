const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Fixing DINAGARAN bad date formats ===\n");

    const fixes = [
        // "31/04/26" → "30-04-2026" (April only has 30 days, so correct to 30)
        { id: 'zGQrZtRANe0gkVJVADOn', oldDate: '31/04/26',   newDate: '30-04-2026' },
        // "06/11/2026" → "06-11-2026"
        { id: 'j5DgSv9tETDJXcsbCmEH', oldDate: '06/11/2026', newDate: '06-11-2026' },
        // "07/11/2026" → "07-11-2026"
        { id: '1LBI78EYDVq7HN3IONYq', oldDate: '07/11/2026', newDate: '07-11-2026' },
    ];

    const batch = db.batch();

    for (const fix of fixes) {
        const ref = db.collection('transactions').doc(fix.id);
        console.log(`Fixing ${fix.id}: "${fix.oldDate}" → "${fix.newDate}"`);
        batch.update(ref, { date: fix.newDate });
    }

    await batch.commit();
    console.log("\n✅ All date formats corrected to DD-MM-YYYY!");
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
