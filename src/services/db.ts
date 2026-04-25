import { collection, doc, getDocs, setDoc, deleteDoc, addDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
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
    } catch (e) {
        console.error("Error saving scheme to DB:", e);
    }
};

export const deleteSchemeFromDB = async (schemeId: string) => {
    try {
        await deleteDoc(doc(db, "schemes", schemeId));
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

export const deleteStaffRequestFromDB = async (requestId: string) => {
    try {
        await deleteDoc(doc(db, "staff_requests", requestId));
    } catch (e) {
        console.error("Error deleting staff request:", e);
    }
};

// ================= TRANSACTIONS =================
export const recordTransactionInDB = async (transaction: any) => {
    try {
        await addDoc(collection(db, "transactions"), {
            ...transaction,
            date: new Date().toLocaleDateString('en-GB'), // 10-04-2024 format
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("Error recording transaction:", e);
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
        const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return results;
    } catch (e) {
        console.error("Error fetching transactions:", e);
        return [];
    }
};

// ================= USERS =================
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

        await setDoc(doc(db, "users", uid), {
            ...data,
            id: uid,
            createdAt: data.createdAt || new Date().toISOString(),
            balance: data.balance !== undefined ? data.balance : 0,
            savings: data.savings !== undefined ? data.savings : 0
        });
    } catch (e) {
        console.error("Error creating user profile:", e);
    }
};

export const getUserFromDB = async (uidOrPhone: string) => {
    try {
        // 1. Try UID (Doc ID)
        const docRef = doc(db, "users", uidOrPhone);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }

        // 2. Try Phone field
        const q = query(collection(db, "users"), where("phone", "==", uidOrPhone));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0];
            return { id: docData.id, ...docData.data() };
        }
        return null;
    } catch (e) {
        console.error("Error getting user:", e);
        return null;
    }
};

export const getUserByPhone = async (phone: string) => {
    try {
        const q = query(collection(db, "users"), where("phone", "==", phone));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (e) {
        console.error("Error getting user by phone:", e);
        return null;
    }
};

export const updateUserPIN = async (uid: string, pin: string) => {
    try {
        const docRef = doc(db, "users", uid);
        await setDoc(docRef, { pin }, { merge: true });
    } catch (e) {
        console.error("Error updating user PIN:", e);
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

// ================= ADMIN SETTINGS =================
export const getAdminSettings = async () => {
    try {
        const docSnap = await getDoc(doc(db, "admins", "main_admin"));
        if (docSnap.exists()) {
            return docSnap.data();
        }
        // Default seed if not exists
        const defaultSettings = { adminId: '9345578962', password: 'benin123', securityPin: '4444' };
        await setDoc(doc(db, "admins", "main_admin"), defaultSettings);
        return defaultSettings;
    } catch (e) {
        console.error("Error getting admin settings:", e);
        return { adminId: '9345578962', password: 'benin123', securityPin: '4444' };
    }
};

export const updateAdminSettings = async (settings: any) => {
    try {
        await setDoc(doc(db, "admins", "main_admin"), settings, { merge: true });
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


const HARDCODED_ADMIN = { adminId: '9345578962', password: 'benin123', securityPin: '4444' };

export const checkIsAdmin = async (adminId: string) => {
    // Always match hardcoded admin credentials first (works even if Firestore is offline/stale)
    if (adminId === HARDCODED_ADMIN.adminId) {
        // Also update Firestore in background to keep it in sync
        setDoc(doc(db, "admins", "main_admin"), HARDCODED_ADMIN).catch(() => { });
        return HARDCODED_ADMIN;
    }
    try {
        const q = query(collection(db, "admins"), where("adminId", "==", adminId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data();
        }
        return null;
    } catch (e) {
        console.error("Error checking admin:", e);
        return null;
    }
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
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
        console.error("Error fetching notifications:", e);
        return [];
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
