const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkLogic() {
    const plansSnap = await db.collection('user_schemes').get();
    const plans = plansSnap.docs.map(d => d.data());
    
    const schemesSnap = await db.collection('schemes').get();
    const schemes = schemesSnap.docs.map(d => d.data());
    
    plans.forEach(p => {
        const baseScheme = schemes.find(s => s.id === p.planId || s.name === p.name || s.name === p.schemeName);
        const requiredDuration = baseScheme?.duration ? Number(baseScheme.duration) : (Number(p.duration) || 11);
        
        // Did they meet the required duration from their own plan?
        const ownRequired = Number(p.duration) || 11;
        
        if (p.monthsPaid >= ownRequired) {
            console.log(`[PAID OWN] ${p.userId} | monthsPaid=${p.monthsPaid} | ownRequired=${ownRequired} | baseRequired=${requiredDuration} | status=${p.status}`);
        }
        
        if (p.monthsPaid >= requiredDuration) {
             console.log(`[PAID BASE] ${p.userId} | monthsPaid=${p.monthsPaid} | baseRequired=${requiredDuration} | status=${p.status}`);
        }
    });
}

checkLogic().then(() => process.exit(0));
