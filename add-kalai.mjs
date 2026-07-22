import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

async function addKalai() {
    try {
        console.log("Adding Kalai Mam to DB...");
        
        const phone = "9751500007";
        const userId = phone;

        await setDoc(doc(db, "users", userId), {
            id: userId,
            firstName: "Kalai",
            lastName: "Mam",
            phone: phone,
            role: "customer",
            createdAt: new Date().toISOString(),
            status: "active"
        });

        console.log("User profile created!");

        // Add scheme
        const schemeId = "kalai_scheme_1";
        await setDoc(doc(db, "user_schemes", schemeId), {
            accountId: schemeId,
            userId: userId,
            schemeName: "1st installment",
            amount: 1, 
            monthlyAmount: 1,
            duration: 11,
            monthsPaid: 0,
            totalPaid: 0,
            status: "active",
            enrollmentDate: "2026-06-25T00:00:00.000Z",
            createdAt: new Date().toISOString(),
            paymentMethod: "CASH"
        });

        console.log("Scheme added successfully!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

addKalai();
