import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import * as fs from 'fs';

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

async function main() {
    try {
        console.log("Fetching users with phone 9047669813 or customerId VS1087...");
        const usersQ1 = query(collection(db, "users"), where("phone", "==", "9047669813"));
        const usersQ2 = query(collection(db, "users"), where("customerId", "==", "VS1087"));
        
        let userSnap = await getDocs(usersQ1);
        if (userSnap.empty) userSnap = await getDocs(usersQ2);
        
        let userId = "9047669813";
        if (!userSnap.empty) {
            userId = userSnap.docs[0].id;
            console.log("Found user doc ID:", userId);
        } else {
            console.log("User not found by query, using phone as ID.");
        }

        console.log("Fetching user_schemes...");
        const q = query(collection(db, "user_schemes"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        console.log(JSON.stringify(docs, null, 2));
    } catch (e) {
        console.error(e);
    }
}
main();
