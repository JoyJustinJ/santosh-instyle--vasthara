import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function checkLatha() {
    const snap = await getDocs(collection(db, "users"));
    console.log("Total users in Firestore:", snap.size);
    snap.docs.forEach(d => {
        const u = d.data();
        const fullName = `${u.firstName || ""} ${u.lastName || ""} ${u.name || ""}`.toLowerCase();
        if (fullName.includes("latha") || d.id.includes("9565295934") || (u.phone && u.phone.includes("9565295934"))) {
            console.log("Matched user:", d.id, u);
        }
    });

    // Check transactions for Rakshitha in full detail to see all 8 txs
    console.log("\n--- Checking Rakshitha transactions in detail ---");
    const rtxSnap = await getDocs(query(collection(db, "transactions"), where("userId", "==", "9952718984")));
    rtxSnap.docs.forEach(d => {
        const t = d.data();
        console.log(`ID: ${d.id} | Date: ${t.date} | Amount: ₹${t.amount} | Type: ${t.type} | Method: ${t.method} | Acc: ${t.accountId}`);
    });

    process.exit(0);
}

checkLatha().catch(console.error);
