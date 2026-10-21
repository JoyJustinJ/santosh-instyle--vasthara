import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, writeBatch } from "firebase/firestore";

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

const APPLY = process.argv.includes("--apply");

function makeRefId() {
    return "REF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

const UPDATES = [
    // 1. Rakshitha
    {
        name: "RAKSHITHA",
        phone: "9952718984",
        schemeDocId: "B3TXIv39MkqfULW4lxeW",
        accountId: "ACC-X1FP6V2Z",
        schemeName: "Purchase Plan",
        txs: [
            { date: "30/09/2026", amount: 2000, method: "CARD", timestamp: "2026-09-30T10:00:00.000Z", month: "September" }
        ]
    },
    // 2. Pujith
    {
        name: "PUJITH",
        phone: "7708956941",
        schemeDocId: "2U7YndqBdqjMWhFfkjf3",
        accountId: "ACC-HD3SCR5L",
        schemeName: "Purchase Plan",
        txs: [
            { date: "30/09/2026", amount: 1500, method: "UPI", timestamp: "2026-09-30T10:00:00.000Z", month: "September" }
        ]
    },
    // 3. Rohith. S
    {
        name: "ROHITH",
        phone: "9943888337",
        schemeDocId: "2408202620001",
        accountId: "2408202620001",
        schemeName: "₹200 Scheme",
        txs: [
            { date: "30/09/2026", amount: 200, method: "UPI", timestamp: "2026-09-30T10:00:00.000Z", month: "September" }
        ]
    },
    // 4. Pavithra (Combined payment separated into 2 installments)
    {
        name: "PAVITHRA",
        phone: "9566471802",
        schemeDocId: "07102026500001",
        accountId: "07102026500001",
        schemeName: "₹500 Scheme",
        txs: [
            { date: "03/10/2026", amount: 500, method: "CASH", timestamp: "2026-10-03T10:00:00.000Z", month: "September" },
            { date: "03/10/2026", amount: 500, method: "CASH", timestamp: "2026-10-03T10:01:00.000Z", month: "October" }
        ]
    },
    // 5. Ananya
    {
        name: "ANANYA",
        phone: "7708354594",
        schemeDocId: "V1kH2hlqxMZynd6K99Ny",
        accountId: "ACC-VHWSZ4A5",
        schemeName: "Purchase Plan",
        txs: [
            { date: "07/10/2026", amount: 1000, method: "CASH", timestamp: "2026-10-07T10:00:00.000Z", month: "September" }
        ]
    },
    // 6. Christina (Combined payments separated into 4 installments)
    {
        name: "CHRISTINA",
        phone: "9944488760",
        schemeDocId: "aFOYMx5hZwuKg8G0Od80",
        accountId: "ACC-GT4W6B7T",
        schemeName: "Purchase Plan",
        txs: [
            { date: "21/08/2026", amount: 500, method: "CASH", timestamp: "2026-08-21T10:00:00.000Z", month: "July" },
            { date: "21/08/2026", amount: 500, method: "CASH", timestamp: "2026-08-21T10:01:00.000Z", month: "August" },
            { date: "16/10/2026", amount: 500, method: "CASH", timestamp: "2026-10-16T10:00:00.000Z", month: "September" },
            { date: "16/10/2026", amount: 500, method: "CASH", timestamp: "2026-10-16T10:01:00.000Z", month: "October" }
        ]
    },
    // 7. GOPI. V
    {
        name: "GOPU.V",
        phone: "8147947277",
        schemeDocId: "15092026100001",
        accountId: "15092026100001",
        schemeName: "₹1000 Scheme",
        txs: [
            { date: "16/10/2026", amount: 1000, method: "CASH", timestamp: "2026-10-16T10:00:00.000Z", month: "October" }
        ]
    },
    // 8. Dharani Raj
    {
        name: "DHARANIRAJ",
        phone: "6374218894",
        schemeDocId: "TKRmGK2ODGsImzVHfrA3",
        accountId: "ACC-CEXNB1EQ",
        schemeName: "Purchase Plan",
        txs: [
            { date: "30/09/2026", amount: 2000, method: "CASH", timestamp: "2026-09-30T10:00:00.000Z", month: "September" }
        ]
    },
    // 9. Latha
    {
        name: "LATHA",
        phone: "9345295934",
        schemeDocId: "jyVlFn29vrFSh5I3UA2n",
        accountId: "ACC-9345295934-2000",
        schemeName: "Purchase Plan",
        txs: [
            { date: "30/09/2026", amount: 2000, method: "CASH", timestamp: "2026-09-30T10:00:00.000Z", month: "September" }
        ]
    }
];

async function execute() {
    console.log(`=== OFFLINE PAYMENTS IMPORT: MODE = ${APPLY ? "APPLY TO DATABASE" : "DRY RUN (NO WRITES)"} ===\n`);

    const batch = writeBatch(db);
    let totalNewTx = 0;
    let totalAmtAdded = 0;

    for (const item of UPDATES) {
        console.log(`\n------------------------------------------------------------`);
        console.log(`Customer: ${item.name} (${item.phone}) | SchemeDoc: ${item.schemeDocId} | AccID: ${item.accountId}`);

        const schemeRef = doc(db, "user_schemes", item.schemeDocId);
        const sSnap = await getDoc(schemeRef);
        if (!sSnap.exists()) {
            console.error(`ERROR: Scheme document ${item.schemeDocId} does not exist!`);
            process.exit(1);
        }
        const sData = sSnap.data();
        const curMonths = Number(sData.monthsPaid || 0);
        const curTotal = Number(sData.totalPaid || 0);
        const duration = Number(sData.duration || 11);

        let addMonths = 0;
        let addTotal = 0;

        for (const t of item.txs) {
            totalNewTx++;
            addMonths++;
            addTotal += t.amount;
            totalAmtAdded += t.amount;

            const txRef = doc(collection(db, "transactions"));
            const refId = makeRefId();

            const txData = {
                id: txRef.id,
                referenceId: refId,
                invoicePrimaryKey: txRef.id,
                userId: item.phone,
                userName: item.name,
                userPhone: item.phone,
                accountId: item.accountId,
                schemeName: item.schemeName,
                amount: t.amount,
                type: "subscription_payment",
                status: "Success",
                method: t.method,
                recordedBy: "staff_passbook_sync",
                date: t.date,
                timestamp: t.timestamp
            };

            console.log(`  + TX [${refId}]: Date ${t.date} (${t.month}) | ₹${t.amount} | Method: ${t.method}`);

            if (APPLY) {
                batch.set(txRef, txData);
            }
        }

        const newMonths = curMonths + addMonths;
        const newTotal = curTotal + addTotal;
        const newStatus = newMonths >= duration ? "completed" : "active";

        console.log(`  ↑ Scheme Update: monthsPaid: ${curMonths} ➔ ${newMonths}/${duration} | totalPaid: ₹${curTotal} ➔ ₹${newTotal} | status: ${newStatus}`);

        if (APPLY) {
            batch.update(schemeRef, {
                monthsPaid: newMonths,
                totalPaid: newTotal,
                status: newStatus
            });
        }
    }

    console.log(`\n============================================================`);
    console.log(`Summary: ${totalNewTx} new transactions to create | Total amount: ₹${totalAmtAdded}`);
    console.log(`Schemes to update: ${UPDATES.length}`);

    if (APPLY) {
        console.log(`\nCommitting changes to Firestore...`);
        await batch.commit();
        console.log(`✅ All changes committed successfully to Firestore!`);
    } else {
        console.log(`\n[DRY RUN ONLY] No changes were written. Run with --apply to commit.`);
    }

    process.exit(0);
}

execute().catch(err => {
    console.error("Execution failed:", err);
    process.exit(1);
});
