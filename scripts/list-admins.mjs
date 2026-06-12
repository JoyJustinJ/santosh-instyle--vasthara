import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
  authDomain: "vasthara-8f0cf.firebaseapp.com",
  projectId: "vasthara-8f0cf",
  storageBucket: "vasthara-8f0cf.firebasestorage.app",
  messagingSenderId: "909051366907",
  appId: "1:909051366907:web:c2d36286f7e05177ec8f5e",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const colRef = collection(db, "admins");
  const snapshot = await getDocs(colRef);
  console.log(`Admins collection has ${snapshot.size} documents.`);
  snapshot.forEach(doc => console.log(doc.id, "=>", doc.data()));
  process.exit(0);
}
main();
