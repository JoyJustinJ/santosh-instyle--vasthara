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

const AuthContext = createContext<{
  user: any;
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
  setUser: (user: any) => void;
} | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(() => {
    const isAdmin = localStorage.getItem('is_admin_authenticated') === 'true';
    if (isAdmin) return { role: 'admin', firstName: 'Admin', lastName: 'User', id: 'admin' };
    
    const saved = localStorage.getItem('vasthara_user_minimal');
    return saved ? JSON.parse(saved) : null;
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
          };
          setUser(userData);
          // Store only non-sensitive data in localStorage for fast UI rendering
          const minimalData = {
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            avatar: userData.avatar,
            emailVerified: userData.emailVerified
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
            emailVerified: basicData.emailVerified
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
        avatar: userData.avatar,
        emailVerified: userData.emailVerified
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
