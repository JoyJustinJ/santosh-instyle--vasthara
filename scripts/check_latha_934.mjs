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

async function checkLathaFull() {
    const phone = "9345295934";
    console.log("Checking Latha with phone:", phone);
    const uDoc = await getDoc(doc(db, "users", phone));
    console.log("User:", uDoc.data());

    const sq = query(collection(db, "user_schemes"), where("userId", "==", phone));
    const sSnap = await getDocs(sq);
    console.log("Schemes found:", sSnap.size);
    sSnap.docs.forEach(d => console.log("Scheme:", d.id, d.data()));

    const tq = query(collection(db, "transactions"), where("userId", "==", phone));
    const tSnap = await getDocs(tq);
    console.log("Transactions found:", tSnap.size);
    tSnap.docs.forEach(d => console.log("TX:", d.id, d.data()));

    process.exit(0);
}

checkLathaFull().catch(console.error);
