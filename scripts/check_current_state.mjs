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

const PHONES = [
    { phone: "9952718984", name: "Rakshitha" },
    { phone: "7708956941", name: "Pujith" },
    { phone: "9943888337", name: "Rohith. S" },
    { phone: "9566471802", name: "Pavithra" },
    { phone: "7708354594", name: "Ananya" },
    { phone: "9944488760", name: "Christina" },
    { phone: "6380351879", name: "LAXMI (PRANAYA)" },
    { phone: "8147947277", name: "GOPI. V" },
    { phone: "6374218894", name: "Dharani Raj" },
    { phone: "9345295934", name: "Latha" },
];

async function check() {
    console.log("=== Checking current Firestore status for all 10 users ===\n");

    for (const item of PHONES) {
        console.log(`------------------------------------------------------------`);
        console.log(`Checking ${item.name} (${item.phone}):`);

        // 1. User doc
        const userDoc = await getDoc(doc(db, "users", item.phone));
        if (userDoc.exists()) {
            const u = userDoc.data();
            console.log(`  User: EXISTS | Name: ${u.firstName || u.name || ""} ${u.lastName || ""} | CustID: ${u.customerId || "N/A"} | Role: ${u.role}`);
        } else {
            console.log(`  User: NOT FOUND in users collection`);
        }

        // 2. Schemes
        const sq = query(collection(db, "user_schemes"), where("userId", "==", item.phone));
        const sSnap = await getDocs(sq);
        if (sSnap.empty) {
            console.log(`  Schemes: NONE FOUND`);
        } else {
            sSnap.docs.forEach(sd => {
                const s = sd.data();
                console.log(`  Scheme [${sd.id}]: Amt: ₹${s.amount || s.monthlyAmount} | monthsPaid: ${s.monthsPaid} | totalPaid: ₹${s.totalPaid} | status: ${s.status} | doj: ${s.enrollmentDate}`);
            });
        }

        // 3. Transactions
        const tq = query(collection(db, "transactions"), where("userId", "==", item.phone));
        const tSnap = await getDocs(tq);
        console.log(`  Transactions count: ${tSnap.docs.length}`);
        const txs = tSnap.docs.map(td => ({ id: td.id, ...td.data() }));
        // Sort by date or timestamp
        txs.sort((a,b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
        txs.forEach((t, i) => {
            console.log(`    #${i+1}: Date: ${t.date} | Amt: ₹${t.amount} | Type: ${t.type} | Method: ${t.method || "N/A"} | AccId: ${t.accountId}`);
        });
    }

    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
