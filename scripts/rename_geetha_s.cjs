const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    const targetPhone = '9442779733';
    const newName = 'GEETHA.S';

    console.log(`=== Updating user profile and schemes for ${targetPhone} (VS1017) to "${newName}" ===\n`);

    // 1. Update user profile
    const userRef = db.collection('users').doc(targetPhone);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
        console.log("Old user data:", userSnap.data());
        await userRef.update({
            firstName: newName,
            lastName: "",
            name: newName
        });
        console.log(`✅ User profile (${targetPhone}) updated to "${newName}".`);
    } else {
        console.log(`⚠️ User doc ${targetPhone} not found directly by ID, querying by phone...`);
        const q = await db.collection('users').where('phone', '==', targetPhone).get();
        for (const doc of q.docs) {
            await doc.ref.update({
                firstName: newName,
                lastName: "",
                name: newName
            });
            console.log(`✅ User doc (${doc.id}) updated to "${newName}".`);
        }
    }

    // 2. Update user_schemes
    const schemesSnap = await db.collection('user_schemes').where('userId', '==', targetPhone).get();
    schemesSnap.forEach(async doc => {
        const data = doc.data();
        if (data.name !== newName || data.userName !== newName) {
            await doc.ref.update({ name: newName, userName: newName });
            console.log(`✅ Scheme (${doc.id}) updated to name: "${newName}".`);
        }
    });

    // Also check if any schemes use phone field
    const schemesByPhone = await db.collection('user_schemes').where('phone', '==', targetPhone).get();
    for (const doc of schemesByPhone.docs) {
        await doc.ref.update({ name: newName, userName: newName });
        console.log(`✅ Scheme by phone (${doc.id}) updated to name: "${newName}".`);
    }

    console.log("Update completed successfully!");
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
