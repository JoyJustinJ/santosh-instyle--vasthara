const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('/Users/rishvantha/Downloads/vasthara-8f0cf-firebase-adminsdk-fbsvc-49ec9824b9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function parseSmartDate(dateStr, prevDateObj) {
    if (!dateStr) return null;
    let parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return null;
    
    let p0 = parseInt(parts[0], 10);
    let p1 = parseInt(parts[1], 10);
    let yy = parts[2];
    if (yy.length === 2) yy = "20" + yy;
    let yyInt = parseInt(yy, 10);
    
    let d1 = p0, m1 = p1, y1 = yyInt;
    let m2 = p0, d2 = p1, y2 = yyInt;
    
    function isValidDate(y, m, d) {
        let date = new Date(y, m - 1, d);
        return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }
    
    let valid1 = isValidDate(y1, m1, d1);
    let valid2 = isValidDate(y2, m2, d2);
    
    let date1 = valid1 ? new Date(y1, m1 - 1, d1) : null;
    let date2 = valid2 ? new Date(y2, m2 - 1, d2) : null;
    
    if (valid1 && !valid2) return { dd: d1, mm: m1, yy: y1, date: date1 };
    if (!valid1 && valid2) return { dd: d2, mm: m2, yy: y2, date: date2 };
    
    if (valid1 && valid2) {
        if (prevDateObj) {
            let diff1 = date1.getTime() - prevDateObj.getTime();
            let diff2 = date2.getTime() - prevDateObj.getTime();
            
            let isAfter1 = diff1 >= 0;
            let isAfter2 = diff2 >= 0;
            
            if (isAfter1 && !isAfter2) return { dd: d1, mm: m1, yy: y1, date: date1 };
            if (!isAfter1 && isAfter2) return { dd: d2, mm: m2, yy: y2, date: date2 };
            
            if (isAfter1 && isAfter2) {
                if (diff1 < diff2) return { dd: d1, mm: m1, yy: y1, date: date1 };
                else return { dd: d2, mm: m2, yy: y2, date: date2 };
            }
        }
        return { dd: d1, mm: m1, yy: y1, date: date1 };
    }
    
    return null;
}

function formatSmartDateObj(obj, originalStr) {
    if (!obj) return originalStr || "";
    let dd = String(obj.dd).padStart(2, '0');
    let mm = String(obj.mm).padStart(2, '0');
    return `${dd}-${mm}-${obj.yy}`;
}

function parseAndFormatDate(dateStr) {
    let obj = parseSmartDate(dateStr, null);
    return formatSmartDateObj(obj, dateStr);
}

async function deleteCollection(collectionPath) {
    console.log(`Fetching documents in ${collectionPath}...`);
    const snap = await db.collection(collectionPath).get();
    let count = 0;
    for (const doc of snap.docs) {
        if (collectionPath === 'users' && doc.data().role === 'admin') continue;
        await doc.ref.delete();
        count++;
    }
    console.log(`Deleted ${count} documents from ${collectionPath}`);
}

async function run() {
    try {
        await deleteCollection('user_schemes');
        await deleteCollection('transactions');
        await deleteCollection('users');

        const csvPath = "/Users/rishvantha/Downloads/Tally Vastra Cus list(overall (2)) (2).csv";
        console.log(`Reading CSV from ${csvPath}...`);
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n');
        
        let customerIdCounter = 1000;
        let usersCreated = 0;
        let plansCreated = 0;
        let txsCreated = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Simple split assuming no commas inside values
            const cols = line.split(',');
            
            let phone = cols[1]?.trim();
            const name = cols[2]?.trim();
            let doj = cols[3]?.trim();
            const amount = cols[4]?.trim();
            
            // Manual overrides
            if (name === 'HEMALATHA.S') {
                doj = '02-12-2025';
            }

            const count = parseInt(cols[16]?.trim() || "0", 10);
            const totalPaid = parseInt(cols[17]?.trim() || "0", 10);
            
            if (cols[0]?.trim() === 'Total') continue; // Skip total row
            
            if (!phone) {
                // Generate a fake phone if missing
                phone = `NO-PHONE-${Math.random().toString().substring(2, 8)}`;
            }
            
            const userId = phone;
            
            // Upsert User (in case a user has multiple plans)
            await db.collection('users').doc(userId).set({
                id: userId,
                firstName: name,
                lastName: "",
                phone: phone,
                customerId: `VS${customerIdCounter++}`,
                role: 'user',
                createdAt: new Date().toISOString()
            }, { merge: true });
            
            usersCreated++;
            
            // Create Plan
            const accountId = `ACC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
            const planRef = db.collection('user_schemes').doc();
            
            let dojObj = parseSmartDate(doj, null);
            const enrollmentDate = formatSmartDateObj(dojObj, doj);
            let prevDateObj = dojObj ? dojObj.date : null;
            
            await planRef.set({
                id: planRef.id,
                userId: userId,
                accountId: accountId,
                amount: Number(amount),
                monthlyAmount: Number(amount),
                duration: 11,
                monthsPaid: count,
                totalPaid: totalPaid,
                status: count >= 11 ? 'completed' : 'active',
                enrollmentDate: enrollmentDate,
                createdAt: new Date().toISOString()
            });
            
            plansCreated++;
            
            // Create Transactions
            for (let j = 0; j < 11; j++) {
                let instDateStr = cols[5 + j]?.trim();
                
                // Specific manual corrections
                if (name === 'HEMALATHA.S' && j === 1) { // 2nd installment
                    instDateStr = '05-01-2026';
                }
                if (name === 'DINAGARAN' && j === 3) { // 4th installment
                    instDateStr = '02-02-2026';
                }

                if (instDateStr) {
                    let instObj = parseSmartDate(instDateStr, prevDateObj);
                    const formattedDate = formatSmartDateObj(instObj, instDateStr);
                    if (instObj && instObj.date) prevDateObj = instObj.date;
                    const txRef = db.collection('transactions').doc();
                    await txRef.set({
                        id: txRef.id,
                        accountId: accountId,
                        userId: userId,
                        amount: Number(amount),
                        date: formattedDate, // exact DD-MM-YYYY required
                        timestamp: new Date().toISOString(), 
                        status: 'Success',
                        method: 'Legacy Import',
                        referenceId: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
                    });
                    txsCreated++;
                }
            }
        }
        
        console.log(`Import successful!`);
        console.log(`Users updated/created: ${usersCreated}`);
        console.log(`Plans created: ${plansCreated}`);
        console.log(`Transactions created: ${txsCreated}`);
    } catch (e) {
        console.error("Error during import:", e);
    }
}

run();
