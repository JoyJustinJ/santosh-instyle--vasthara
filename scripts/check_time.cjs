const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkChronological() {
    const plansSnap = await db.collection('user_schemes').get();
    const plans = plansSnap.docs.map(d => d.data());
    
    const now = new Date();
    
    plans.forEach(p => {
        const joinDate = new Date(p.joinedAt || p.enrollmentDate || p.createdAt || now);
        const monthsElapsed = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
        
        const requiredDuration = Number(p.duration) || 11;
        
        // Chronologically completed?
        if (monthsElapsed >= requiredDuration) {
            console.log(`Time Elapsed: ${p.userId}, monthsElapsed=${monthsElapsed}, paid=${p.monthsPaid}, required=${requiredDuration}`);
        }
    });
}

checkChronological().then(() => process.exit(0));
