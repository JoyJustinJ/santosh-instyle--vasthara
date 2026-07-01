const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function addPreExistingCustomer() {
  try {
    const phone = '9894848405';
    
    // Check if user already exists
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone', '==', phone).get();
    
    let userId;
    let authUser;

    if (!snapshot.empty) {
      console.log('User with phone 9894848405 already exists in Firestore.');
      userId = snapshot.docs[0].id;
    } else {
      // 1. Create in Firebase Auth
      try {
         authUser = await admin.auth().getUserByPhoneNumber('+91' + phone);
         console.log('Auth user already exists', authUser.uid);
         userId = authUser.uid;
      } catch (error) {
         if (error.code === 'auth/user-not-found') {
             authUser = await admin.auth().createUser({
                 phoneNumber: '+91' + phone,
                 displayName: 'Saroja.c'
             });
             userId = authUser.uid;
             console.log('Created Auth user', userId);
         } else {
             throw error;
         }
      }

      // 2. Create in Firestore
      await db.collection('users').doc(userId).set({
        id: userId,
        firstName: 'Saroja.c',
        lastName: '',
        phone: phone,
        role: 'customer',
        customerId: `VS${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        address: '',
        city: '',
        state: '',
        pincode: '',
        status: 'active'
      });
      console.log('Created Firestore user document.');
    }

    console.log("Cleaning up any existing schemes and transactions to avoid duplicates...");
    const oldSchemes = await db.collection('user_schemes').where('userId', '==', userId).get();
    for (const doc of oldSchemes.docs) {
        await doc.ref.delete();
    }
    const oldTx = await db.collection('transactions').where('userId', '==', userId).get();
    for (const doc of oldTx.docs) {
        await doc.ref.delete();
    }
    console.log("Cleanup complete.");

    // 3. Create the enrollment
    // Find an active scheme of 500Rs
    const schemeQuery = await db.collection('schemes')
        .where('monthlyAmount', '==', 500)
        .where('status', '==', 'active')
        .get();
        
    let schemeId, schemeData;
    if (schemeQuery.empty) {
        schemeId = `scheme_import_500_${Date.now()}`;
        schemeData = {
            id: schemeId,
            name: "500 Rs Scheme",
            monthlyAmount: 500,
            duration: "11",
            maturityValue: 5500,
            members: 1,
            description: "Imported scheme",
            category: "Custom",
            status: "active"
        };
        await db.collection('schemes').doc(schemeId).set(schemeData);
    } else {
        schemeId = schemeQuery.docs[0].id;
        schemeData = schemeQuery.docs[0].data();
    }
    
    const accountId = `ACC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);

    const enrollmentData = {
        userId: userId,
        accountId: accountId,
        schemeId: schemeId,
        planId: schemeId,
        schemeName: schemeData.name,
        monthlyAmount: schemeData.monthlyAmount,
        totalAmount: schemeData.monthlyAmount * 11,
        totalPaid: schemeData.monthlyAmount * 11, // 11 months already paid
        paidAmount: schemeData.monthlyAmount * 11,
        enrollmentDate: startDate.toISOString(),
        startDate: startDate.toISOString(),
        status: 'active',
        monthsPaid: 11,
        totalDuration: parseInt(schemeData.duration, 10) || 11,
        referralEmployeeId: 'VS-4040',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nextDueDate: null,
    };

    await db.collection('user_schemes').doc(accountId).set(enrollmentData);
    console.log(`Successfully enrolled user into scheme. Account ID: ${accountId}`);

    // Increment scheme members
    await db.collection('schemes').doc(schemeId).update({
        members: admin.firestore.FieldValue.increment(1)
    });
    console.log('Incremented scheme members count.');

    // 4. Create 11 transactions
    console.log('Creating 11 transactions for the installments...');
    for (let i = 0; i < 11; i++) {
        const txDate = new Date(startDate);
        txDate.setMonth(txDate.getMonth() + i);
        
        const txRef = db.collection('transactions').doc();
        const referenceId = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        await txRef.set({
            id: txRef.id,
            referenceId: referenceId,
            invoicePrimaryKey: txRef.id,
            userId: userId,
            accountId: accountId,
            amount: 500,
            type: i === 0 ? 'subscription_join' : 'subscription_payment',
            status: 'Success',
            method: 'CASH',
            recordedBy: 'system_import',
            date: txDate.toLocaleDateString('en-GB'),
            timestamp: txDate.toISOString()
        });
    }
    console.log('Created 11 transactions successfully.');

  } catch (error) {
    console.error('Error adding pre-existing customer:', error);
  } finally {
    process.exit();
  }
}

addPreExistingCustomer();
