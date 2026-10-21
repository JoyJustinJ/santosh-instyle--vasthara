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

async function inspectRakshitha() {
    const q = query(collection(db, "transactions"), where("userId", "==", "9952718984"));
    const snap = await getDocs(q);
    console.log("All Rakshitha transactions full content:");
    snap.docs.forEach(d => {
        console.log("------------------");
        console.log("DOC ID:", d.id);
        console.log(JSON.stringify(d.data(), null, 2));
    });
    process.exit(0);
}

inspectRakshitha().catch(console.error);
