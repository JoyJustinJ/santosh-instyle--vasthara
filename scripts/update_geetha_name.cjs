const admin = require('firebase-admin');
const sa = require('C:/Users/Administrator/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-e003ddaf21.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
    console.log("=== Updating customer name to GEETHA for mobile 9585137199 (VS1016) ===\n");

    const userId = "9585137199";
    const userRef = db.collection('users').doc(userId);
    
    await userRef.update({
        firstName: "GEETHA"
    });

    // Also check if any scheme has a user Name stored on it
    const schemesSnap = await db.collection('user_schemes').where("userId", "==", userId).get();
    const batch = db.batch();
    schemesSnap.forEach(d => {
        const data = d.data();
        if (data.userName || data.customerName || data.name === "GEETA") {
            const updates = {};
            if (data.userName) updates.userName = "GEETHA";
            if (data.customerName) updates.customerName = "GEETHA";
            if (data.name === "GEETA") updates.name = "GEETHA";
            batch.update(d.ref, updates);
        }
    });
    await batch.commit();

    const checkSnap = await userRef.get();
    console.log("✅ Updated user profile successfully:");
    console.log(checkSnap.data());

    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
