/**
 * cleanup_import_run1.mjs
 * Deletes the 15 orphaned transactions written in the first import run
 * (they used stale local accIds like ACC-65F2W4E0 which don't exist in live Firestore).
 * Run ONCE before re-running import_vastra_excel.mjs
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
    authDomain: "vasthara-8f0cf.firebaseapp.com",
    projectId: "vasthara-8f0cf",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// These are the stale local accIds used in the first run
const staleAccIds = [
    "ACC-65F2W4E0","ACC-G7DRIAV9","ACC-GSTHZWGI","ACC-VHWSZ4A5","ACC-KEP61DTN",
    "ACC-X1FP6V2Z","ACC-VE31Y4SN","ACC-HD3SCR5L","ACC-STQUQ6U1","ACC-90VAVUQO",
    "ACC-JA8DLZRN","ACC-7AARHOHT","ACC-0WLBJFEN"
];

async function cleanup() {
    console.log("Looking for orphaned system_import transactions...");
    const q = query(collection(db, "transactions"), where("recordedBy", "==", "system_import"));
    const snap = await getDocs(q);
    const toDelete = snap.docs.filter(d => staleAccIds.includes(d.data().accountId));
    console.log(`Found ${toDelete.length} orphaned transactions to delete.`);
    if (toDelete.length === 0) { console.log("Nothing to clean."); process.exit(0); }
    const batch = writeBatch(db);
    toDelete.forEach(d => { batch.delete(doc(db, "transactions", d.id)); console.log("  - DELETE tx", d.id, d.data().date, d.data().accountId); });
    await batch.commit();
    console.log("Done.");
    process.exit(0);
}
cleanup().catch(e => { console.error(e); process.exit(1); });
