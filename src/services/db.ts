import { collection, doc, getDocs, setDoc, deleteDoc, addDoc, query, where, getDoc, runTransaction, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { safeDate } from '../utils';
import { SCHEMES } from '../constants';

// ================= SCHEMES =================
export const getSchemesFromDB = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "schemes"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return data;
    } catch (e) {
        console.warn("Firebase fetching failed, returning constants.", e);
        return SCHEMES;
    }
};

export const saveSchemeToDB = async (scheme: any) => {
    try {
        await setDoc(doc(db, "schemes", scheme.id), scheme);
        await addAuditLog('SCHEME_SAVE', '', { schemeId: scheme.id, schemeName: scheme.name });
    } catch (e) {
        console.error("Error saving scheme to DB:", e);
    }
};

export const deleteSchemeFromDB = async (schemeId: string) => {
    try {
        await deleteDoc(doc(db, "schemes", schemeId));
        await addAuditLog('SCHEME_DELETE', '', { schemeId });
    } catch (e) {
        console.error("Error deleting scheme from DB:", e);
    }
};

// ================= STAFF REQUESTS =================
export const getStaffRequestsFromDB = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "staff_requests"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        throw e;
    }
};

export const saveStaffRequestToDB = async (request: any) => {
    try {
        await setDoc(doc(db, "staff_requests", request.id), request);
    } catch (e) {
        console.error("Error saving staff request:", e);
    }
};

export const getStaffRequestByPhone = async (phone: string) => {
    try {
        const q = query(collection(db, "staff_requests"), where("phone", "==", phone));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const staffRequest = querySnapshot.docs[0];
            return { id: staffRequest.id, ...staffRequest.data() };
        }
        return null;
    } catch (e) {
        console.error("Error getting staff request by phone:", e);
        return null;
    }
};

export const deleteStaffRequestFromDB = async (requestId: string) => {
    try {
        await deleteDoc(doc(db, "staff_requests", requestId));
    } catch (e) {
        console.error("Error deleting staff request:", e);
    }
};

// ================= TRANSACTIONS =================
export const recordTransactionInDB = async (transaction: any): Promise<string | null> => {
    try {
        const referenceId = transaction.referenceId || `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const docRef = doc(collection(db, "transactions"));
        await setDoc(docRef, {
            ...transaction,
            id: docRef.id,
            referenceId,
            invoicePrimaryKey: docRef.id,
            date: new Date().toLocaleDateString('en-GB'), // 10-04-2024 format
            timestamp: new Date().toISOString()
        });
        return docRef.id; // Return the real Firestore document ID
    } catch (e) {
        console.error("Error recording transaction:", e);
        return null;
    }
};

export const getTransactionsFromDB = async (userId?: string, accountId?: string) => {
    try {
        if (userId === "" || accountId === "") return [];

        let q = query(collection(db, "transactions"));

        if (userId) {
            q = query(q, where("userId", "==", userId));
        }

        if (accountId) {
            q = query(q, where("accountId", "==", accountId));
        }

        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => safeDate(a.timestamp || a.date).getTime() - safeDate(b.timestamp || b.date).getTime());
        return results;
    } catch (e) {
        console.error("Error fetching transactions:", e);
        return [];
    }
};

// ================= USERS =================
export const generateCustomerId = async (): Promise<string> => {
    try {
        const counterRef = doc(db, 'metadata', 'customer_counter');
        const newIdNumber = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let nextId = 1000;
            if (counterDoc.exists() && counterDoc.data().count) {
                nextId = counterDoc.data().count + 1;
            }
            transaction.set(counterRef, { count: nextId }, { merge: true });
            return nextId;
        });
        return `VS${newIdNumber}`;
    } catch (e) {
        console.error("Error generating customer ID:", e);
        return `VS${Math.floor(1000 + Math.random() * 9000)}`;
    }
};

export const generateEmployeeId = async (): Promise<string> => {
    try {
        const counterRef = doc(db, 'metadata', 'staff_counter');
        const newIdNumber = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let nextId = 100;
            if (counterDoc.exists() && counterDoc.data().count) {
                nextId = counterDoc.data().count + 1;
            }
            transaction.set(counterRef, { count: nextId }, { merge: true });
            return nextId;
        });
        return `EMP${newIdNumber}`;
    } catch (e) {
        console.error("Error generating employee ID:", e);
        return `EMP${Math.floor(100 + Math.random() * 900)}`;
    }
};

export const createUserProfile = async (uidOrData: any, userData?: any) => {
    try {
        let uid: string;
        let data: any;

        if (typeof uidOrData === 'string' && userData) {
            uid = uidOrData;
            data = userData;
        } else {
            data = uidOrData;
            uid = data.id || data.uid || data.phone;
        }

        if (!uid) throw new Error("No UID or ID provided for user profile");

        let customerId = data.customerId;
        if (!customerId) {
            const existingSnap = await getDoc(doc(db, "users", uid));
            if (existingSnap.exists() && existingSnap.data().customerId) {
                customerId = existingSnap.data().customerId;
            } else {
                customerId = await generateCustomerId();
            }
        }

        let empId = data.empId;
        if ((data.role === 'staff' || data.role === 'admin') && !empId) {
            const existingSnap = await getDoc(doc(db, "users", uid));
            if (existingSnap.exists() && existingSnap.data().empId) {
                empId = existingSnap.data().empId;
            } else {
                // Remove auto-generated empId logic as per user request
                empId = undefined;
            }
        }

        await setDoc(doc(db, "users", uid), {
            ...data,
            id: uid,
            customerId: customerId,
            ...(empId ? { empId } : {}),
            role: data.role || 'customer',
            emailVerified: data.emailVerified === true,
            phoneVerified: data.phoneVerified === true,
            accountCreatedVia: data.accountCreatedVia || 'phone',
            createdAt: data.createdAt || new Date().toISOString(),
            referralEmpId: data.referralEmpId || null,
            updatedAt: new Date().toISOString(),
            balance: data.balance !== undefined ? data.balance : 0,
            savings: data.savings !== undefined ? data.savings : 0
        }, { merge: true });
        
        await addAuditLog('USER_CREATE_OR_UPDATE', '', { 
            userId: uid, 
            role: data.role || 'customer',
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() 
        });
    } catch (e) {
        console.error("Error creating user profile:", e);
    }
};

export const getUserFromDB = async (uidOrPhoneOrId: string) => {
    try {
        // 1. Try UID (Doc ID)
        const docRef = doc(db, "users", uidOrPhoneOrId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }

        // 2. Try Phone field (exact and with/without +91 prefix)
        const phoneVariants = [
            uidOrPhoneOrId,
            uidOrPhoneOrId.startsWith('+91') ? uidOrPhoneOrId.substring(3) : `+91${uidOrPhoneOrId}`,
            uidOrPhoneOrId.startsWith('+91') ? uidOrPhoneOrId.substring(3).trim() : `+91${uidOrPhoneOrId.trim()}`,
            uidOrPhoneOrId.trim()
        ];
        
        for (const phoneVariant of phoneVariants) {
            const qPhone = query(collection(db, "users"), where("phone", "==", phoneVariant));
            const querySnapPhone = await getDocs(qPhone);
            if (!querySnapPhone.empty) {
                const docData = querySnapPhone.docs[0];
                return { id: docData.id, ...docData.data() };
            }
        }

        // 3. Try Customer ID field
        const qCustId = query(collection(db, "users"), where("customerId", "==", uidOrPhoneOrId));
        const querySnapCustId = await getDocs(qCustId);
        if (!querySnapCustId.empty) {
            const docData = querySnapCustId.docs[0];
            return { id: docData.id, ...docData.data() };
        }

        return null;
    } catch (e) {
        console.error("Error getting user:", e);
        return null;
    }
};

export const getUserByPhone = async (phoneOrId: string) => {
    try {
        // Try Phone field (exact and with/without +91 prefix)
        const phoneVariants = [
            phoneOrId,
            phoneOrId.startsWith('+91') ? phoneOrId.substring(3) : `+91${phoneOrId}`,
            phoneOrId.startsWith('+91') ? phoneOrId.substring(3).trim() : `+91${phoneOrId.trim()}`,
            phoneOrId.trim()
        ];
        
        for (const phoneVariant of phoneVariants) {
            const qPhone = query(collection(db, "users"), where("phone", "==", phoneVariant));
            const querySnapPhone = await getDocs(qPhone);
            if (!querySnapPhone.empty) {
                const docData = querySnapPhone.docs[0];
                return { id: docData.id, ...docData.data() };
            }
        }

        // Try Customer ID field
        const qCustId = query(collection(db, "users"), where("customerId", "==", phoneOrId));
        const querySnapCustId = await getDocs(qCustId);
        if (!querySnapCustId.empty) {
            const docData = querySnapCustId.docs[0];
            return { id: docData.id, ...docData.data() };
        }

        return null;
    } catch (e) {
        console.error("Error getting user by phone or customerId:", e);
        return null;
    }
};

export const updateUserPIN = async (uid: string, pin: string) => {
    try {
        const docRef = doc(db, "users", uid);
        await setDoc(docRef, { pin }, { merge: true });
        await addAuditLog('USER_PIN_UPDATE', '', { userId: uid });
    } catch (e) {
        console.error("Error updating user PIN:", e);
    }
};

export const updateUserPassword = async (uid: string, password: string) => {
    try {
        const docRef = doc(db, "users", uid);
        await setDoc(docRef, { password }, { merge: true });
        await addAuditLog('USER_PASSWORD_UPDATE', '', { userId: uid });
    } catch (e) {
        console.error("Error updating user password:", e);
    }
};

export const updateUserProfile = async (uid: string, updates: any) => {
    try {
        const docRef = doc(db, "users", uid);
        await setDoc(docRef, updates, { merge: true });
        await addAuditLog('USER_PROFILE_UPDATE', '', { userId: uid, keysUpdated: Object.keys(updates) });
    } catch (e) {
        console.error("Error updating user profile:", e);
        throw e;
    }
};

export const getAllUsersFromDB = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching all users:", e);
        return [];
    }
};

export const deleteUserFromDB = async (uid: string) => {
    try {
        await deleteDoc(doc(db, "users", uid));
        await addAuditLog('USER_DELETE', '', { userId: uid });
    } catch (e) {
        console.error("Error deleting user:", e);
        throw e;
    }
};


// ================= ADMIN SETTINGS =================
export const getAdminSettings = async () => {
    try {
        const docSnap = await getDoc(doc(db, "admins", "main_admin"));
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (e) {
        console.error("Error getting admin settings:", e);
        return null;
    }
};

export const updateAdminSettings = async (settings: any) => {
    try {
        await setDoc(doc(db, "admins", "main_admin"), settings, { merge: true });
        await addAuditLog('ADMIN_SETTINGS_UPDATE', '', { adminId: settings.adminId || 'main_admin' });
    } catch (e) {
        console.error("Error updating admin settings:", e);
    }
};

export const getUserPlansFromDB = async (userId: string) => {
    try {
        const q = query(collection(db, "user_schemes"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching user plans:", e);
        return [];
    }
};

export const getAllUserPlansFromDB = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "user_schemes"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching all user plans:", e);
        return [];
    }
};

export const enrollUserInScheme = async (userId: string, scheme: any, staffId: string, referralEmpId?: string) => {
    try {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        const amount = Number(scheme.amount || scheme.monthlyAmount || 0);
        const prefix = `${dd}${mm}${yy}${amount}`;
        
        const counterRef = doc(db, 'metadata', 'scheme_counters');
        const newCount = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let nextId = 1;
            if (counterDoc.exists() && counterDoc.data()[prefix]) {
                nextId = counterDoc.data()[prefix] + 1;
            }
            transaction.set(counterRef, { [prefix]: nextId }, { merge: true });
            return nextId;
        });
        const accountId = `${prefix}${newCount}`;
        
        // 1. Record the Scheme
        const schemeRef = doc(db, "user_schemes", accountId);
        await setDoc(schemeRef, {
            ...scheme,
            planId: scheme.id,
            userId,
            accountId,
            enrollmentDate: new Date().toISOString(),
            monthsPaid: 1,
            totalPaid: amount,
            status: 'active',
            enrolledBy: staffId,
            referralCode: referralEmpId || null
        });

        // 2. Record the Cash Transaction
        const transaction = {
            userId,
            accountId,
            amount: Number(scheme.amount || scheme.monthlyAmount || 0),
            type: 'subscription_join',
            status: 'Success',
            method: 'CASH',
            recordedBy: staffId,
            timestamp: new Date().toISOString()
        };
        const transactionId = await recordTransactionInDB(transaction);
        
        await addAuditLog('SCHEME_ENROLL', staffId, {
            userId,
            accountId,
            schemeId: scheme.id,
            schemeName: scheme.name,
            amount: transaction.amount,
            transactionId
        });

        return accountId;
    } catch (e) {
        console.error("Error enrolling user in scheme:", e);
        throw e;
    }
};

export const checkIsAdmin = async (adminId: string) => {
    try {
        const q = query(collection(db, "admins"), where("adminId", "==", adminId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data();
        }
    } catch (e) {
        console.error("Error checking admin:", e);
    }
    return null;
};

// ================= ADMIN MANAGEMENT =================
export const getAllAdminsFromDB = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "admins"));
        return querySnapshot.docs.map(d => ({ docId: d.id, ...d.data() }));
    } catch (e) {
        console.error("Error fetching admins:", e);
        return [];
    }
};

export const deleteAdminFromDB = async (adminDocId: string) => {
    // Safety: never allow deleting the primary admin document
    if (adminDocId === 'main_admin') {
        console.error("Cannot delete the primary admin document.");
        return;
    }
    try {
        await deleteDoc(doc(db, "admins", adminDocId));
        await addAuditLog('ADMIN_DELETE', '', { adminDocId });
    } catch (e) {
        console.error("Error deleting admin:", e);
    }
};
// ================= NOTIFICATIONS =================
export const getNotificationsFromDB = async (userId: string) => {
    try {
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => safeDate(b.timestamp).getTime() - safeDate(a.timestamp).getTime());
    } catch (e) {
        console.error("Error fetching notifications:", e);
        return [];
    }
};

export const addNotificationToDB = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'broadcast' = 'info') => {
    try {
        await addDoc(collection(db, "notifications"), {
            userId,
            title,
            message,
            type,
            read: false,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("Error adding notification:", e);
    }
};

export const deleteNotificationFromDB = async (notificationId: string) => {
    try {
        await deleteDoc(doc(db, "notifications", notificationId));
    } catch (e) {
        console.error("Error deleting notification:", e);
    }
};

export const clearAllNotificationsFromDB = async (userId: string) => {
    try {
        const q = query(collection(db, "notifications"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, "notifications", d.id)));
        await Promise.all(deletePromises);
    } catch (e) {
        console.error("Error clearing notifications:", e);
    }
};

export const markNotificationAsRead = async (notificationId: string) => {
    try {
        await setDoc(doc(db, "notifications", notificationId), { read: true }, { merge: true });
    } catch (e) {
        console.error("Error marking notification as read:", e);
    }
};

// ================= AUDIT LOGS =================
export const addAuditLog = async (action: string, performedBy: string, details: any) => {
    try {
        const actor = performedBy || auth.currentUser?.phoneNumber || auth.currentUser?.uid || 'system';
        await addDoc(collection(db, "audit_logs"), {
            action,
            performedBy: actor,
            details,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("Error adding audit log:", e);
    }
};

export const getAuditLogsFromDB = async () => {
    try {
        const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching audit logs:", e);
        return [];
    }
};

// ================= REDEMPTIONS & INCENTIVES =================
export const markSchemeAsRedeemed = async (accountId: string, staffId: string) => {
    try {
        await updateDoc(doc(db, "user_schemes", accountId), {
            status: 'closed',
            closedAt: new Date().toISOString(),
            redeemedBy: staffId
        });
        await addAuditLog('SCHEME_REDEEMED', staffId, { accountId });
        return true;
    } catch (e) {
        console.error("Error redeeming scheme:", e);
        return false;
    }
};

export const preCloseScheme = async (accountId: string) => {
    try {
        await updateDoc(doc(db, "user_schemes", accountId), {
            status: 'closed',
            closedAt: new Date().toISOString(),
            isPreClosed: true
        });
        await addAuditLog('SCHEME_PRE_CLOSED', '', { accountId });
        return true;
    } catch (e) {
        console.error("Error pre-closing scheme:", e);
        return false;
    }
};

export const payStaffIncentives = async (staffId: string, amount: number, adminId: string) => {
    try {
        await addDoc(collection(db, "transactions"), {
            userId: staffId,
            amount: amount,
            type: 'incentive_payout',
            status: 'Success',
            method: 'CASH',
            recordedBy: adminId,
            timestamp: new Date().toISOString()
        });
        await addAuditLog('INCENTIVE_PAYOUT', adminId, { staffId, amount });
        return true;
    } catch (e) {
        console.error("Error paying incentives:", e);
        return false;
    }
};

// ================= SYSTEM MANAGEMENT =================
export const resetApplicationData = async () => {
    try {
        const collectionsToClear = [
            "schemes", "staff_requests", "transactions", "user_schemes", 
            "notifications", "audit_logs"
        ];
        
        // 1. Clear simple collections completely
        for (const collName of collectionsToClear) {
            const querySnapshot = await getDocs(collection(db, collName));
            const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, collName, d.id)));
            await Promise.all(deletePromises);
        }

        // Reset customer ID sequence
        await setDoc(doc(db, "metadata", "customer_counter"), { count: 1000 });

        // 2. Clear Admins collection, EXCEPT 'main_admin'
        const adminsSnapshot = await getDocs(collection(db, "admins"));
        let primaryAdminId = '';
        const adminDeletePromises = adminsSnapshot.docs.map(d => {
            if (d.id === 'main_admin') {
                primaryAdminId = d.data().adminId;
                return Promise.resolve(); // Keep main admin
            }
            return deleteDoc(doc(db, "admins", d.id));
        });
        await Promise.all(adminDeletePromises);

        // 3. Clear Users collection, EXCEPT the primary admin's user doc
        const usersSnapshot = await getDocs(collection(db, "users"));
        const userDeletePromises = usersSnapshot.docs.map(d => {
            const userData = d.data();
            if (userData.id === primaryAdminId || userData.phone === primaryAdminId || d.id === primaryAdminId) {
                return Promise.resolve(); // Keep main admin user doc
            }
            return deleteDoc(doc(db, "users", d.id));
        });
        await Promise.all(userDeletePromises);
        
        // Add an initial audit log
        await addDoc(collection(db, "audit_logs"), {
            action: 'SYSTEM_RESET',
            performedBy: 'main_admin',
            details: { message: 'All application data was wiped.' },
            timestamp: new Date().toISOString()
        });

        return true;
    } catch (e) {
        console.error("Error resetting application data:", e);
        return false;
    }
};

export const purgeOldOTPsFromDB = async (): Promise<number> => {
    try {
        const otpsRef = collection(db, "otps");
        const querySnapshot = await getDocs(otpsRef);
        const now = Date.now();
        
        let batch = writeBatch(db);
        let count = 0;
        let batchCount = 0;

        for (const d of querySnapshot.docs) {
            const data = d.data();
            if (data.used === true || (data.expiresAt && data.expiresAt < now)) {
                batch.delete(d.ref);
                count++;
                batchCount++;
                
                if (batchCount === 500) {
                    await batch.commit();
                    batch = writeBatch(db);
                    batchCount = 0;
                }
            }
        }
        
        if (batchCount > 0) {
            await batch.commit();
        }
        
        return count;
    } catch (error) {
        console.error("Error purging OTPs:", error);
        return -1;
    }
};
