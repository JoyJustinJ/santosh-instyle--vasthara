const admin = require('firebase-admin');

const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function testIncentives() {
    console.log("Fetching data...");
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

    const plansSnapshot = await db.collection('user_schemes').get();
    let allPlans = [];
    plansSnapshot.forEach(doc => allPlans.push({ accountId: doc.id, ...doc.data() }));

    const schemesSnapshot = await db.collection('schemes').get();
    const schemes = [];
    schemesSnapshot.forEach(doc => schemes.push({ id: doc.id, ...doc.data() }));

    console.log(`Found ${users.length} users, ${allPlans.length} plans, ${schemes.length} schemes.`);

    // Mock a referral to test logic if none exist
    if (allPlans.length > 0) {
        allPlans[0].referralCode = "EMP001";
        allPlans[0].referralIncentive = 250;
        if (allPlans.length > 1) {
             allPlans[1].referralCode = "EMP001";
             // Missing referralIncentive, should fallback to scheme
        }
    }
    
    users.push({ id: "EMP001", firstName: "Test", lastName: "Staff", empId: "EMP001", role: "staff" });
    users[0].referralStaff = "EMP001"; // Old style account referral

    // Mock AdminDashboard logic
    const staffReferrals = {};
    
    // Filter out deleted/inactive users if necessary (simulating AdminDashboard)
    const filteredUsers = users.filter(u => u.status !== 'deleted');
    const filteredPlans = allPlans.filter(p => p.status !== 'deleted' && p.status !== 'transferred');

    // Scheme-based referrals
    filteredPlans.forEach(p => {
        if (p.referralCode) {
            const key = String(p.referralCode).trim();
            if (!staffReferrals[key]) staffReferrals[key] = { accountCreations: [], schemeJoins: [], incentive: 0, accountIncentive: 0, schemeIncentive: 0 };
            
            const user = users.find(u => u.id === p.userId || u.phone === p.userId) || { firstName: 'Customer', lastName: '', phone: p.userId };
            
            // LOGIC CHECK: what if referralIncentive is not on the plan, but on the scheme?
            const baseScheme = schemes.find(s => s.id === p.planId || s.name === p.name || s.name === p.schemeName);
            let inc = Number(p.referralIncentive);
            if (isNaN(inc) || typeof p.referralIncentive === 'undefined') {
                inc = baseScheme ? Number(baseScheme.referralIncentive) : 0;
            }
            inc = isNaN(inc) ? 0 : inc;

            staffReferrals[key].schemeJoins.push({ ...user, schemeName: p.name || p.schemeName, amount: inc });
            staffReferrals[key].schemeIncentive += inc;
            staffReferrals[key].incentive += inc;
        }
    });

    // Account-based referrals
    filteredUsers.forEach(u => {
        if (u.referralStaff) {
            const key = String(u.referralStaff).trim();
            if (!staffReferrals[key]) staffReferrals[key] = { accountCreations: [], schemeJoins: [], incentive: 0, accountIncentive: 0, schemeIncentive: 0 };
            
            const existing = staffReferrals[key].accountCreations.find(r => r.phone === u.phone);
            if (!existing) {
                staffReferrals[key].accountCreations.push({ ...u, amount: 100 });
                staffReferrals[key].accountIncentive += 100;
                staffReferrals[key].incentive += 100;
            }
        }
    });

    console.log("--- INCENTIVE REPORT ---");
    Object.keys(staffReferrals).forEach(key => {
        const data = staffReferrals[key];
        const staffName = users.find(u => u.phone === key || u.empId === key || u.id === key)?.firstName || key;
        console.log(`Staff: ${staffName} (${key})`);
        console.log(`  Account Creations: ${data.accountCreations.length} (₹${data.accountIncentive})`);
        console.log(`  Scheme Enrollments: ${data.schemeJoins.length} (₹${data.schemeIncentive})`);
        console.log(`  Total Incentive: ₹${data.incentive}`);
        console.log(`  Schemes Detailed:`);
        data.schemeJoins.forEach(sj => {
            console.log(`    - ${sj.firstName} ${sj.lastName} enrolled in ${sj.schemeName} -> ₹${sj.amount}`);
        });
        console.log("------------------------");
    });
}

testIncentives().then(() => process.exit(0)).catch(console.error);
