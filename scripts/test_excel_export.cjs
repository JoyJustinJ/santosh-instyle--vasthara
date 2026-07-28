const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function safeDate(val) {
    if (!val) return new Date(NaN);
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    if (val._seconds !== undefined) return new Date(val._seconds * 1000);
    return new Date(val);
}

function formatDateToText(dateString) {
    if (!dateString) return 'N/A';
    if (typeof dateString === 'string') {
        const cleaned = dateString.replace(/"/g, '').trim();
        if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(cleaned)) {
            return cleaned.replace(/-/g, '/');
        }
    }
    const d = safeDate(dateString);
    if (isNaN(d.getTime())) return dateString;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

async function main() {
    console.log("=== Testing Excel Export logic for GEETHA / 9585137199 / 9442779733 ===\n");

    const usersSnap = await db.collection('users').get();
    const usersList = [];
    usersSnap.forEach(d => usersList.push({ id: d.id, ...d.data() }));

    const schemesSnap = await db.collection('user_schemes').get();
    const allPlans = [];
    schemesSnap.forEach(d => allPlans.push({ id: d.id, ...d.data() }));

    const txSnap = await db.collection('transactions').get();
    const allTransactions = [];
    txSnap.forEach(d => allTransactions.push({ id: d.id, ...d.data() }));

    console.log(`Loaded ${usersList.length} users, ${allPlans.length} plans, ${allTransactions.length} txs.`);

    const maxInstallments = Math.max(...allPlans.map(p => Number(p.duration) || 11), 11);

    const customersOnly = usersList.filter(u => u.role !== 'admin' && u.role !== 'staff');

    // Build a canonical user map: merge legacy users with same name+phone.
    const canonicalUserMap = new Map();
    customersOnly.forEach(u => {
        const firstName = (u.firstName || '').trim().toLowerCase();
        const lastName = (u.lastName || '').trim().toLowerCase();
        const phone = (u.phone || '').replace(/\D/g, '').slice(-10);
        const key = `${firstName}|${lastName}|${phone}`;
        if (!canonicalUserMap.has(key)) {
            canonicalUserMap.set(key, { user: u, allIds: new Set([u.id, u.phone].filter(Boolean)) });
        } else {
            const entry = canonicalUserMap.get(key);
            if (u.id) entry.allIds.add(u.id);
            if (u.phone) entry.allIds.add(u.phone);
        }
    });

    const idToCanonical = new Map();
    canonicalUserMap.forEach(entry => {
        entry.allIds.forEach(id => idToCanonical.set(id, entry));
    });

    const plansWithUsers = [];
    const processedPlans = new Set();

    canonicalUserMap.forEach(({ user, allIds }) => {
        const userPlans = allPlans.filter(p => allIds.has(p.userId));
        if (userPlans.length > 0) {
            userPlans.forEach(plan => {
                processedPlans.add(plan.id);
                plansWithUsers.push({ plan, user, allIds });
            });
        } else {
            plansWithUsers.push({ plan: null, user, allIds });
        }
    });

    allPlans.forEach(plan => {
        if (!processedPlans.has(plan.id)) {
            const canonical = idToCanonical.get(plan.userId);
            const user = canonical ? canonical.user : (usersList.find(u => u.id === plan.userId || u.phone === plan.userId) || { phone: plan.userId, firstName: 'Unknown', lastName: '' });
            const allIds = canonical ? canonical.allIds : new Set([plan.userId].filter(Boolean));
            plansWithUsers.push({ plan, user, allIds });
        }
    });

    plansWithUsers.sort((a, b) => {
        const nameA = `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.user.firstName || ''} ${b.user.lastName || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
    });

    console.log("\n--- Checking generated rows for GEETHA or 9585137199 or 9442779733 ---");

    let sNo = 1;
    plansWithUsers.forEach(({ plan, user, allIds }) => {
        const isGeetha = JSON.stringify({ plan, user }).toLowerCase().includes('geet') || JSON.stringify({ plan, user }).includes('9585137199') || JSON.stringify({ plan, user }).includes('9442779733');
        
        if (!plan) {
            if (isGeetha) console.log("USER WITH NO PLAN:", user);
            sNo++;
            return;
        }

        const txs = allTransactions.filter(tx => tx.accountId === plan.accountId && (tx.status === 'Success' || tx.status === 'success' || tx.status === 'SUCCESS'));
        txs.sort((a, b) => safeDate(a.timestamp).getTime() - safeDate(b.timestamp).getTime());

        // Also check txs with EXACT filter from AdminDashboard line 1513: tx.status === 'Success'
        const strictTxs = allTransactions.filter(tx => tx.accountId === plan.accountId && tx.status === 'Success');

        if (isGeetha) {
            console.log(`\nFound GEETHA Record [S.No: ${sNo}]:`);
            console.log("  User:", user.customerId, user.phone, `${user.firstName} ${user.lastName}`);
            console.log("  Plan:", plan.accountId, plan.enrollmentDate, `MonthsPaid stored: ${plan.monthsPaid}, TotalPaid stored: ${plan.totalPaid}`);
            console.log(`  Transactions matching ANY status success: ${txs.length}`);
            console.log(`  Transactions matching STRICT 'Success' (as in code!): ${strictTxs.length}`);
            if (strictTxs.length !== txs.length) {
                console.log("  ⚠️ WARNING: Some transactions have status != 'Success' (case mismatch!)");
                txs.forEach(t => console.log("     tx:", t.id, t.date, t.amount, `status='${t.status}'`));
            }
        }
        sNo++;
    });

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
