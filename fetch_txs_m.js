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
        const q = query(collection(db, "transactions"), where("userId", "==", "6380351879"));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        fs.writeFileSync('c:/Users/Administrator/Downloads/santosh-instyle--vasthara-main/santosh-instyle--vasthara-main/debug_txs.json', JSON.stringify(docs, null, 2));
        console.log("Wrote", docs.length, "transactions");
    } catch (e) {
        console.error(e);
    }
}
main();
