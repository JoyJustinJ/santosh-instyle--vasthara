import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

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

const TARGETS = [
    { key: "Rakshitha", phone: "9952718984" },
    { key: "Pujith", phone: "7708956941" },
    { key: "Rohith. S", phone: "9943888337" },
    { key: "Pavithra", phone: "9566471802" },
    { key: "Ananya", phone: "7708354594" },
    { key: "Christina", phone: "9944488760" },
    { key: "LAXMI (PRANAYA)", phone: "6380351879" },
    { key: "GOPI. V", phone: "8147947277" },
    { key: "Dharani Raj", phone: "6374218894" },
    { key: "Latha", phone: "9345295934" }
];

async function printSummary() {
    for (const t of TARGETS) {
        const uDoc = await getDoc(doc(db, "users", t.phone));
        const u = uDoc.data();
        
        const sSnap = await getDocs(query(collection(db, "user_schemes"), where("userId", "==", t.phone)));
        const s = sSnap.docs[0]?.data();
        const sId = sSnap.docs[0]?.id;

        const tSnap = await getDocs(query(collection(db, "transactions"), where("userId", "==", t.phone)));
        const txList = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        txList.sort((a,b) => (a.timestamp || a.date || "").localeCompare(b.timestamp || b.date || ""));

        console.log(`\n========================================`);
        console.log(`CUSTOMER: ${t.key} | Phone: ${t.phone} | CustID: ${u?.customerId || "N/A"}`);
        console.log(`SCHEME DOC ID: ${sId} | AccID: ${s?.accountId} | Amt: ₹${s?.amount || s?.monthlyAmount} | monthsPaid: ${s?.monthsPaid} | totalPaid: ₹${s?.totalPaid} | status: ${s?.status}`);
        console.log(`CURRENT FIRESTORE TXS (${txList.length}):`);
        txList.forEach((tx, idx) => {
            console.log(`  [${idx+1}] Date: ${tx.date} | ₹${tx.amount} | Type: ${tx.type} | Method: ${tx.method} | Ref: ${tx.referenceId}`);
        });
    }
    process.exit(0);
}

printSummary().catch(console.error);
