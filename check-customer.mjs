import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

let serviceAccount;
try {
    serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
} catch (e) {
    serviceAccount = JSON.parse(process.env.VERCEL_FIREBASE_SERVICE_ACCOUNT || '{}');
}

if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function check() {
    console.log("Checking customer 9751500007...");
    
    // Check users collection by phone
    const snap = await db.collection('users').where('phone', '==', '9751500007').get();
    if (snap.empty) {
        console.log("Customer not found by phone.");
    } else {
        snap.forEach(doc => console.log("Found in users:", doc.id, doc.data()));
    }
    
    // Check if doc ID is 9751500007
    const docRef = await db.collection('users').doc('9751500007').get();
    if (docRef.exists) {
        console.log("Found by doc ID:", docRef.data());
    }
}
check().catch(console.error);
