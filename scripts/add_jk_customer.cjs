const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Adding customer JK ===");

    const phone = "9345578962";
    const name = "jk";
    const dateStr = "2026-06-07T12:00:00.000Z";

    // 1. Create User
    const userRef = db.collection('users').doc(phone);
    await userRef.set({
        id: phone,
        firstName: name,
        lastName: "",
        phone: phone,
        role: "customer",
        createdAt: dateStr,
        status: "active"
    });
    console.log(`✅ User created: ${phone}`);

    // 2. Find Scheme
    const schemeSnap = await db.collection('schemes').doc('scheme_import_500_1782665649735').get();
    const scheme = schemeSnap.data();

    // 3. Create user_scheme (AccountId logic from db.ts)
    const amount = 500;
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const nth = "01";
    const accountId = `${dd}${mm}${yyyy}${amount}${nth}`;

    const schemeRef = db.collection('user_schemes').doc(accountId);
    await schemeRef.set({
        ...scheme,
        planId: scheme.id,
        userId: phone,
        accountId: accountId,
        enrollmentDate: dateStr,
        monthsPaid: 1,
        totalPaid: amount,
        status: 'active',
        enrolledBy: "admin",
        referralCode: null
    });
    console.log(`✅ Scheme Enrolled: ${accountId}`);

    // 4. Create first installment transaction
    const txRef = db.collection('transactions').doc();
    await txRef.set({
        id: txRef.id,
        referenceId: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        invoicePrimaryKey: txRef.id,
        userId: phone,
        userName: name,
        accountId: accountId,
        schemeName: scheme.name,
        amount: amount,
        type: 'subscription_join',
        status: 'Success',
        method: 'CASH',
        recordedBy: "admin",
        date: "2026-06-07",
        timestamp: dateStr
    });
    console.log(`✅ Transaction Recorded: ${txRef.id}`);

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
