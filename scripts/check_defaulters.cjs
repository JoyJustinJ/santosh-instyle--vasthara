const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkDefaulters() {
    const plansRef = await db.collection('user_schemes').get();
    const now = new Date();
    
    let defaulters = 0;
    
    plansRef.forEach(doc => {
        const p = doc.data();
        if (p.status === 'completed') return;
        
        const joinDate = new Date(p.joinedAt || now);
        const monthsElapsed = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
        
        if (monthsElapsed > p.monthsPaid) {
            defaulters++;
            // console.log(`Defaulter: ${p.userId}, Joined: ${joinDate.toISOString()}, Elapsed: ${monthsElapsed}, Paid: ${p.monthsPaid}`);
        } else {
            console.log(`Not Defaulter: ${p.userId}, Joined: ${joinDate.toISOString()}, Elapsed: ${monthsElapsed}, Paid: ${p.monthsPaid}`);
        }
    });
    
    console.log(`Total defaulters found: ${defaulters}`);
}

checkDefaulters().then(() => process.exit(0));
