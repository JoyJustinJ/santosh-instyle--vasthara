import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
    authDomain: "vasthara-8f0cf.firebaseapp.com",
    projectId: "vasthara-8f0cf",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const uidOrPhoneOrId = "9751500007";

async function test() {
    console.log("Looking up:", uidOrPhoneOrId);
    
    const docRef = doc(db, "users", uidOrPhoneOrId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        console.log("Found by doc ID:", docSnap.data());
    } else {
        console.log("Not found by doc ID");
    }

    const q = query(collection(db, "user_schemes"), where("userId", "==", uidOrPhoneOrId));
    const schemeSnap = await getDocs(q);
    console.log("Schemes found:", schemeSnap.docs.length);
    schemeSnap.docs.forEach(d => console.log(d.data()));

    process.exit(0);
}
test();
