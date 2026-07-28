const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    const snap = await db.collection('transactions').get();
    let count = 0;
    snap.forEach(async (doc) => {
        const t = doc.data();
        if (t.date === '30-25-2026' || (t.date && t.date.includes('-25-2026'))) {
            console.log(`Fixing invalid date typo for doc ${doc.id}: ${t.date} -> 30-05-2026`);
            await db.collection('transactions').doc(doc.id).update({
                date: '30-05-2026',
                timestamp: '2026-05-30T10:00:00.000Z'
            });
            count++;
        }
        // Check any date with month > 12
        if (t.date && typeof t.date === 'string') {
            const p = t.date.split('-');
            if (p.length === 3) {
                let m = Number(p[1]);
                if (m > 12 && m !== 25) {
                    console.log(`Warning: unusual month in date ${t.date} for doc ${doc.id}`);
                }
            }
        }
    });
    // Wait slightly for async updates
    setTimeout(() => {
        console.log(`Fixed ${count} date typo documents.`);
        process.exit(0);
    }, 2000);
}

main().catch(e => { console.error(e); process.exit(1); });
