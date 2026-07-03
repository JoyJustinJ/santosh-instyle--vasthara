import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
    apiKey: "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
    authDomain: "vastra-8f0cf.firebaseapp.com",
    projectId: "vastra-8f0cf",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    const plansSnap = await getDocs(collection(db, "user_plans"));
    const plans = plansSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));
    
    fs.writeFileSync("plans.json", JSON.stringify(plans, null, 2));
    console.log("Wrote", plans.length, "plans to plans.json");
}

check().catch(console.error);
