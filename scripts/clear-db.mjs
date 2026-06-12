import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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

const COLLECTIONS_TO_DELETE = ["otps", "schemes", "transactions", "user_schemes", "users"];

async function deleteCollection(colName) {
  const colRef = collection(db, colName);
  const snapshot = await getDocs(colRef);
  const deletions = snapshot.docs.map((d) => deleteDoc(doc(db, colName, d.id)));
  await Promise.all(deletions);
  console.log(`✅ Deleted ${snapshot.size} documents from '${colName}'`);
}

async function main() {
  console.log("🔥 Starting Firestore cleanup (keeping 'admins')...\n");
  for (const col of COLLECTIONS_TO_DELETE) {
    try {
      await deleteCollection(col);
    } catch (e) {
      console.error(`❌ Failed to delete '${col}':`, e.message);
    }
  }
  console.log("\n✅ Done. All test data cleared. Admin collection preserved.");
  process.exit(0);
}

main();
