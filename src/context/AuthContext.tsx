import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  reload,
  signInWithRedirect,
  signInWithCredential
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role: 'customer' | 'admin' | 'staff';
  pin?: string;
  password?: string;
  status?: string;
  accessLevel?: string;
  avatar?: string;
  emailVerified?: boolean;
  branch?: string;
  balance?: number;
  savings?: number;
  createdAt?: string;
  updatedAt?: string;
  accountCreatedVia?: 'phone' | 'email' | 'google' | 'staff' | 'admin';
  phoneVerified?: boolean;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  referralStaff?: string;
  empId?: string;
}

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  isUnlocked: boolean;
  isBiometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phoneNumber: string, appVerifier: any) => Promise<ConfirmationResult>;
  signupWithEmail: (email: string, pass: string) => Promise<any>;
  sendVerificationEmail: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  logout: () => Promise<void>;
  unlockApp: () => void;
  setUser: (user: User | null) => void;
  getToken: () => Promise<string | null>;
} | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const isAdmin = localStorage.getItem('is_admin_authenticated') === 'true';
    if (isAdmin) return { role: 'admin', firstName: 'Admin', lastName: 'User', id: 'admin', pin: 'ADMIN_BYPASS' };
    
    const saved = localStorage.getItem('vasthara_user_minimal');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('vasthara_user_minimal');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('vasthara_unlocked_session') === 'true';
  });
  const [isBiometricEnabled, setBiometricEnabledState] = useState(() => {
    return localStorage.getItem('vasthara_biometric_enabled') === 'true';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync with Firestore user profile
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = {
            id: firebaseUser.uid,
            ...userDoc.data(),
            emailVerified: firebaseUser.emailVerified
          } as User;
          
          // Clear any leftover admin mock sessions since this is a real user
          localStorage.removeItem('is_admin_authenticated');
          
          setUser(userData);
          // Store only non-sensitive data in localStorage for fast UI rendering
          const minimalData = {
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            pin: userData.pin,
            avatar: userData.avatar,
            emailVerified: userData.emailVerified,
            branch: userData.branch,
            status: userData.status,
            accessLevel: userData.accessLevel,
            accountCreatedVia: userData.accountCreatedVia,
            phoneVerified: userData.phoneVerified,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
            address: userData.address,
            country: userData.country,
            state: userData.state,
            city: userData.city,
            pincode: userData.pincode,
            referralStaff: userData.referralStaff,
            empId: userData.empId
          };
          localStorage.setItem('vasthara_user_minimal', JSON.stringify(minimalData));
        } else {
          // New Google/Email user — create a basic profile in Firestore automatically
          const basicData: any = {
            id: firebaseUser.uid,
            firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
            lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            email: firebaseUser.email || '',
            phone: firebaseUser.phoneNumber || '',
            role: 'customer',
            emailVerified: firebaseUser.emailVerified,
            accountCreatedVia: firebaseUser.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'email',
            phoneVerified: !!firebaseUser.phoneNumber,
            createdAt: new Date().toISOString(),
            balance: 0,
            savings: 0
          };
          
          // Clear any leftover admin mock sessions since this is a real user
          localStorage.removeItem('is_admin_authenticated');
          
          // Only auto-create profile for Google sign-in or if there's no pending signup
          const isGoogle = firebaseUser.providerData.some((p) => p.providerId === 'google.com');
          const hasPendingSignup = !!localStorage.getItem('pending_signup');
          
          if (isGoogle || !hasPendingSignup) {
            try {
              await setDoc(doc(db, "users", firebaseUser.uid), basicData);
            } catch (e) {
              console.error('Failed to auto-create Google user profile:', e);
            }
            // Mark as unlocked since Google login is a fresh auth
            setIsUnlocked(true);
            sessionStorage.setItem('vasthara_unlocked_session', 'true');
            
            setUser(basicData);
            const minimalBasic = {
              id: basicData.id,
              firstName: basicData.firstName,
              lastName: basicData.lastName,
              email: basicData.email,
              phone: basicData.phone,
              role: basicData.role,
              pin: basicData.pin,
              emailVerified: basicData.emailVerified,
              branch: basicData.branch,
              status: basicData.status,
              accessLevel: basicData.accessLevel,
              accountCreatedVia: basicData.accountCreatedVia,
              phoneVerified: basicData.phoneVerified,
              createdAt: basicData.createdAt,
              empId: basicData.empId
            };
            localStorage.setItem('vasthara_user_minimal', JSON.stringify(minimalBasic));
          } else {
            // Do NOT call setUser. The user is in the middle of signup.
            // When OTPVerify successfully completes, it will set the user and local storage.
            // If they close the app, they start from scratch and are not partially logged in.
            setUser(null);
            localStorage.removeItem('vasthara_user_minimal');
          }
        }
      } else {
        // Firebase is logged out.
        // If they have a valid local session (e.g. from manual PIN/Phone login), DO NOT clear it.
        // We rely on the PIN system for session security anyway.
        const savedUser = localStorage.getItem('vasthara_user_minimal');
        if (!savedUser && localStorage.getItem('is_admin_authenticated') !== 'true') {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
      // 1. Native OS Google Sign-In via Capacitor Firebase Auth
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (result.credential?.idToken) {
        // Build Firebase credential with the Google ID token
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        // Sign in with credential into the Firebase web JS SDK to sync state
        await signInWithCredential(auth, credential);
      }
    } else {
      // 2. Web browser fallback (PWA / standard website)
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    }
  };

  const loginWithPhone = async (phoneNumber: string, appVerifier: any) => {
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  };

  const signupWithEmail = async (email: string, pass: string) => {
    return await createUserWithEmailAndPassword(auth, email, pass);
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const checkEmailVerification = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      return auth.currentUser.emailVerified;
    }
    return false;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase signOut threw an error. Clearing local session anyway.", e);
    } finally {
      setIsUnlocked(false);
      sessionStorage.removeItem('vasthara_unlocked_session');

      // Clear user state and manual login session
      setUser(null);
      localStorage.removeItem('vasthara_user_minimal');
      localStorage.removeItem('vasthara_pin');
      localStorage.removeItem('vasthara_last_phone');
      localStorage.removeItem('is_admin_authenticated');
      localStorage.removeItem('is_primary_admin');
    }
  };

  const unlockApp = () => {
    setIsUnlocked(true);
    sessionStorage.setItem('vasthara_unlocked_session', 'true');
  };

  const setBiometricEnabled = (enabled: boolean) => {
    setBiometricEnabledState(enabled);
    localStorage.setItem('vasthara_biometric_enabled', enabled ? 'true' : 'false');
  };

  const handleSetUser = (userData: any) => {
    setUser(userData);
    if (userData) {
      const minimal = {
        id: userData.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        pin: userData.pin,
        password: userData.password,
        avatar: userData.avatar,
        emailVerified: userData.emailVerified,
        branch: userData.branch,
        status: userData.status,
        accessLevel: userData.accessLevel,
        accountCreatedVia: userData.accountCreatedVia,
        phoneVerified: userData.phoneVerified,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        address: userData.address,
        country: userData.country,
        state: userData.state,
        city: userData.city,
        pincode: userData.pincode,
        referralStaff: userData.referralStaff,
        empId: userData.empId
      };
      localStorage.setItem('vasthara_user_minimal', JSON.stringify(minimal));
    } else {
      localStorage.removeItem('vasthara_user_minimal');
    }
  };

  const getToken = async () => {
    // 1. If real Firebase Auth exists (Google/Email users)
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) return idToken;
    }

    // 2. If no Firebase Auth but local React state says user is logged in
    // This happens for Pay4SMS (Phone OTP) users because Firebase is bypassed.
    if (user && user.phone) {
      // We encode the phone and pin as a custom token for the backend to verify manually
      let rawPin = user.password || user.pin || localStorage.getItem('vasthara_pin') || '';
      
      // If we somehow lost the pin locally (due to previous bug), fetch it dynamically
      if (!rawPin) {
        try {
          const qPhone = query(collection(db, "users"), where("phone", "==", user.phone));
          const snap = await getDocs(qPhone);
          if (!snap.empty) {
             const data = snap.docs[0].data();
             rawPin = data.password || data.pin || '';
             if (rawPin) localStorage.setItem('vasthara_pin', rawPin);
          }
        } catch (e) {
          console.error("Failed to dynamically fetch pin for token", e);
        }
      }
      
      return `PHONEAUTH_${user.phone}_${rawPin}`;
    }

    if (localStorage.getItem('is_admin_authenticated') === 'true') {
      return 'ADMIN_BYPASS';
    }

    throw new Error('User is completely logged out. Please log in again.');
  };

  const value = useMemo(() => ({
    user,
    loading,
    isUnlocked,
    isBiometricEnabled,
    setBiometricEnabled,
    loginWithGoogle,
    loginWithPhone,
    signupWithEmail,
    sendVerificationEmail,
    checkEmailVerification,
    logout,
    unlockApp,
    setUser: handleSetUser,
    getToken
  }), [user, loading, isUnlocked, isBiometricEnabled]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
