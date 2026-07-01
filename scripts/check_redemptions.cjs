const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkRedemptions() {
    const plansSnap = await db.collection('user_schemes').get();
    const plans = plansSnap.docs.map(d => d.data());
    
    const schemesSnap = await db.collection('schemes').get();
    const schemes = schemesSnap.docs.map(d => d.data());
    
    let completedCount = 0;
    
    plans.forEach(p => {
        const baseScheme = schemes.find(s => s.id === p.planId || s.name === p.name || s.name === p.schemeName);
        const requiredDuration = baseScheme?.duration ? Number(baseScheme.duration) : (Number(p.duration) || 11);
        
        const isCompleted = p.status === 'completed' || (p.status === 'active' && p.monthsPaid >= requiredDuration);
        
        if (p.monthsPaid >= requiredDuration && !isCompleted) {
            console.log(`WEIRD: Paid >= required but not completed: ${p.userId}, paid: ${p.monthsPaid}, required: ${requiredDuration}`);
        }
        
        if (p.monthsPaid >= (Number(p.duration) || 11)) {
            if (!isCompleted) {
               console.log(`Failed condition for ${p.userId}: status=${p.status}, paid=${p.monthsPaid}, requiredBase=${requiredDuration}, originalDuration=${p.duration}`);
            }
        }
        
        if (isCompleted) {
            completedCount++;
        }
    });
    
    console.log(`Total completed schemes logic identified: ${completedCount}`);
}

checkRedemptions().then(() => process.exit(0));
