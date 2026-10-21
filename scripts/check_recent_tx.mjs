import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
    authDomain: "vasthara-8f0cf.firebaseapp.com",
    projectId: "vasthara-8f0cf",
    storageBucket: "vasthara-8f0cf.firebasestorage.app",
    messagingSenderId: "909051366907",
    appId: "1:909051366907:web:c2d36286f7e05177ec8f5e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRecentTx() {
    const snap = await getDocs(collection(db, "transactions"));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const recent = all.filter(t => {
        const dStr = String(t.date || "");
        const tsStr = typeof t.timestamp === 'string' ? t.timestamp : (t.timestamp?.toDate ? t.timestamp.toDate().toISOString() : "");
        return dStr.includes("2026-10") || dStr.includes("/10/") || tsStr.includes("2026-10");
    });
    console.log(`Found ${recent.length} October transactions:`);
    recent.forEach(r => {
        console.log(`ID: ${r.id} | User: ${r.userId} (${r.userName}) | Date: ${r.date} | ₹${r.amount} | By: ${r.recordedBy} | Ref: ${r.referenceId}`);
    });
    process.exit(0);
}

checkRecentTx().catch(console.error);
