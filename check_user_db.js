import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
    authDomain: "vastra-8f0cf.firebaseapp.com",
    projectId: "vastra-8f0cf",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check(phone) {
    const q = query(collection(db, "users"), where("phone", "==", phone));
    const snap = await getDocs(q);
    if (snap.empty) {
        console.log("User not found with phone:", phone);
    } else {
        snap.forEach(doc => {
            console.log("User found:", doc.id, doc.data());
        });
    }
}

check("9345578962").catch(console.error);
check("+919345578962").catch(console.error);
