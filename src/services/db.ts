import { collection, doc, getDocs, setDoc, deleteDoc, addDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SCHEMES } from '../constants';

// ================= SCHEMES =================
export const getSchemesFromDB = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "schemes"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (data.length === 0) {
            console.log("Empty DB, seeding initial schemes...");
            for (let s of SCHEMES) {
                // Remove hardcoded members count when seeding real DB
                const seedScheme = { ...s, members: 0 };
                await setDoc(doc(db, "schemes", s.id), seedScheme);
                data.push(seedScheme);
            }
        }
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

export const getTransactionsFromDB = async (userId?: string) => {
    try {
        let q = collection(db, "transactions");
        const querySnapshot = await getDocs(q);
        let results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (userId) {
            results = results.filter((t: any) => t.userId === userId);
        }
        return results;
    } catch (e) {
        console.error("Error fetching transactions:", e);
        return [];
    }
};

// ================= USERS =================
export const createUserProfile = async (userData: any) => {
    try {
        await setDoc(doc(db, "users", userData.phone), {
            ...userData,
            createdAt: new Date().toISOString(),
            balance: 0,
            savings: 0
        });
    } catch (e) {
        console.error("Error creating user profile:", e);
    }
};

export const getUserFromDB = async (phone: string) => {
    try {
        const docRef = doc(db, "users", phone);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (e) {
        console.error("Error getting user:", e);
        return null;
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
        const defaultSettings = { adminId: 'admin', password: 'admin123', securityPin: '0000' };
        await setDoc(doc(db, "admins", "main_admin"), defaultSettings);
        return defaultSettings;
    } catch (e) {
        console.error("Error getting admin settings:", e);
        return { adminId: 'admin', password: 'admin123', securityPin: '0000' };
    }
};

export const updateAdminSettings = async (settings: any) => {
    try {
        await setDoc(doc(db, "admins", "main_admin"), settings, { merge: true });
    } catch (e) {
        console.error("Error updating admin settings:", e);
    }
};

