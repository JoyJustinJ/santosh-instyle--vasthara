import React, { createContext, useContext, useState, useEffect } from 'react';
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
  reload
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
            referralStaff: userData.referralStaff
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
          // Only auto-create profile for Google sign-in (has displayName or email but no pending_signup)
          // For email+OTP flow, OTPVerify will handle profile creation from pending_signup
          const hasPendingSignup = !!localStorage.getItem('pending_signup');
          if (!hasPendingSignup) {
            try {
              await setDoc(doc(db, "users", firebaseUser.uid), basicData);
            } catch (e) {
              console.error('Failed to auto-create Google user profile:', e);
            }
            // Mark as unlocked since Google login is a fresh auth
            setIsUnlocked(true);
            sessionStorage.setItem('vasthara_unlocked_session', 'true');
          }
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
            createdAt: basicData.createdAt
          };
          localStorage.setItem('vasthara_user_minimal', JSON.stringify(minimalBasic));
        }
      } else {
        // Only clear if there's no manual user or admin session stored
        if (!localStorage.getItem('vasthara_user_minimal') && localStorage.getItem('is_admin_authenticated') !== 'true') {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
    await signOut(auth);
    setIsUnlocked(false);
    sessionStorage.removeItem('vasthara_unlocked_session');

    // Clear user state and manual login session
    setUser(null);
    localStorage.removeItem('vasthara_user_minimal');
    localStorage.removeItem('vasthara_pin');
    localStorage.removeItem('vasthara_last_phone');
    localStorage.removeItem('is_admin_authenticated');
    localStorage.removeItem('is_primary_admin');
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
        referralStaff: userData.referralStaff
      };
      localStorage.setItem('vasthara_user_minimal', JSON.stringify(minimal));
    } else {
      localStorage.removeItem('vasthara_user_minimal');
    }
  };

  return (
    <AuthContext.Provider value={{
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
      setUser: handleSetUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
