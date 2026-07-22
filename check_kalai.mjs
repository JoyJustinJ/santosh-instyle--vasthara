import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkAll() {
    console.log("Downloading all users...");
    const snap = await getDocs(collection(db, "users"));
    console.log(`Found ${snap.size} users total.`);
    
    let found = false;
    snap.forEach(doc => {
        const data = doc.data();
        const jsonStr = JSON.stringify(data);
        if (jsonStr.includes("9751500007") || jsonStr.toLowerCase().includes("kalai")) {
            console.log("MATCH FOUND:", doc.id, data);
            found = true;
        }
    });

    if (!found) {
        console.log("Kalai Mam (9751500007) is DEFINITELY NOT in the 'users' collection!");
    }
    process.exit(0);
}

checkAll().catch(console.error);
