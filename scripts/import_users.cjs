const admin = require('firebase-admin');
const xlsx = require('xlsx');

// Initialize Firebase Admin
const serviceAccount = require('./service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// Helper to convert Excel date serial to JS Date
function excelDateToJSDate(serial) {
    if (!serial) return new Date();
    if (typeof serial === 'string') {
        const parts = serial.split('/');
        if (parts.length === 3) {
            // Assume dd/mm/yy or dd/mm/yyyy
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            let y = parseInt(parts[2], 10);
            if (y < 100) y += 2000;
            return new Date(y, m, d);
        }
        return new Date(serial);
    }
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    return new Date(utc_value * 1000);
}

function generateRandomPhone() {
    return '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
}

async function runImport() {
    console.log("Starting Import...");
    const filePath = 'C:\\Users\\Administrator\\Downloads\\VASTRA INFO.xlsx';
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    
    // Headers are in row 0
    const headers = data[0];
    const rows = data.slice(1);
    
    // Fetch current customer counter
    const counterRef = db.collection('metadata').doc('customer_counter');
    let counterDoc = await counterRef.get();
    let currentId = 1000;
    if (counterDoc.exists && counterDoc.data().count) {
        currentId = counterDoc.data().count;
    }

    // Get active schemes to reuse
    const schemesSnap = await db.collection('schemes').where('status', '==', 'active').get();
    let schemesByAmount = {};
    schemesSnap.forEach(doc => {
        const s = doc.data();
        if (!schemesByAmount[s.monthlyAmount]) {
            schemesByAmount[s.monthlyAmount] = { id: doc.id, ...s };
        }
    });

    let importedCount = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        let phoneNo = row[1];
        if (!phoneNo || phoneNo.toString().length < 10) {
            phoneNo = generateRandomPhone();
        } else {
            phoneNo = phoneNo.toString().trim();
        }
        
        const cusName = row[2] || 'Unknown Customer';
        const doj = excelDateToJSDate(row[3]);
        const schemeAmtStr = row[4];
        if (!schemeAmtStr) continue;
        const schemeAmt = Number(schemeAmtStr);
        if (isNaN(schemeAmt) || schemeAmt <= 0) continue;

        currentId++;
        const customerId = `VS${currentId}`;

        // Create or find scheme
        let scheme = schemesByAmount[schemeAmt];
        if (!scheme) {
            const newSchemeId = `scheme_import_${schemeAmt}_${Date.now()}`;
            scheme = {
                id: newSchemeId,
                name: `${schemeAmt} Rs Scheme`,
                monthlyAmount: schemeAmt,
                duration: "11",
                maturityValue: schemeAmt * 11,
                members: 0,
                description: `Imported scheme for ${schemeAmt}`,
                category: 'Custom',
                status: 'active'
            };
            await db.collection('schemes').doc(newSchemeId).set(scheme);
            schemesByAmount[schemeAmt] = scheme;
        }

        // Create User
        await db.collection('users').doc(phoneNo).set({
            id: phoneNo,
            phone: phoneNo,
            firstName: cusName,
            lastName: '',
            role: 'customer',
            customerId: customerId,
            createdAt: doj.toISOString(),
            updatedAt: new Date().toISOString(),
            accountCreatedVia: 'import',
            balance: 0,
            savings: 0
        }, { merge: true });

        // Generate Account ID
        const accountId = `ACC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-${i}`;

        // Find Transactions
        let monthsPaid = 0;
        let totalPaid = 0;
        
        // Installment columns start at index 5 up to 15
        for (let col = 5; col <= 15; col++) {
            if (row[col]) {
                const txDate = excelDateToJSDate(row[col]);
                const txRef = db.collection('transactions').doc();
                const referenceId = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                
                await txRef.set({
                    id: txRef.id,
                    referenceId,
                    invoicePrimaryKey: txRef.id,
                    userId: phoneNo,
                    accountId: accountId,
                    amount: schemeAmt,
                    type: monthsPaid === 0 ? 'subscription_join' : 'subscription_payment',
                    status: 'Success',
                    method: 'CASH',
                    recordedBy: 'system_import',
                    date: txDate.toLocaleDateString('en-GB'),
                    timestamp: txDate.toISOString()
                });
                
                monthsPaid++;
                totalPaid += schemeAmt;
            }
        }

        // Ensure at least 1 month is recorded if "Total Paid" or "Count" says so, or if no dates were given but total paid exists
        const explicitCount = parseInt(row[16]);
        const explicitTotalPaid = parseInt(row[17]);
        if (monthsPaid === 0 && explicitCount > 0) {
            for(let j=0; j<explicitCount; j++) {
                const txRef = db.collection('transactions').doc();
                await txRef.set({
                    id: txRef.id,
                    referenceId: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                    userId: phoneNo,
                    accountId: accountId,
                    amount: schemeAmt,
                    type: j === 0 ? 'subscription_join' : 'subscription_payment',
                    status: 'Success',
                    method: 'CASH',
                    recordedBy: 'system_import',
                    date: doj.toLocaleDateString('en-GB'),
                    timestamp: doj.toISOString()
                });
                monthsPaid++;
                totalPaid += schemeAmt;
            }
        }

        // Create User Scheme
        await db.collection('user_schemes').doc(accountId).set({
            ...scheme,
            planId: scheme.id,
            userId: phoneNo,
            accountId: accountId,
            enrollmentDate: doj.toISOString(),
            monthsPaid: monthsPaid,
            totalPaid: totalPaid,
            status: 'active',
            enrolledBy: 'system_import'
        });

        importedCount++;
        console.log(`Imported: ${cusName} (${phoneNo}) - ${monthsPaid} installments`);
    }

    // Update counter
    await counterRef.set({ count: currentId }, { merge: true });
    
    console.log(`\nImport complete! Processed ${importedCount} users.`);
    process.exit(0);
}

runImport().catch(err => {
    console.error(err);
    process.exit(1);
});
