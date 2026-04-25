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
    const saved = localStorage.getItem('vasthara_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return localStorage.getItem('vasthara_unlocked_session') === 'true';
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
          localStorage.setItem('vasthara_user', JSON.stringify(userData));
        } else {
          // New user from Google/Phone/Email - missing profile info
          const basicData = {
            id: firebaseUser.uid,
            firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
            lastName: firebaseUser.displayName?.split(' ')[1] || '',
            email: firebaseUser.email || '',
            phone: firebaseUser.phoneNumber || '',
            role: 'customer',
            emailVerified: firebaseUser.emailVerified
          };
          setUser(basicData);
        }
      } else {
        // Only clear if there's no manual user stored (don't wipe out manual logins!)
        if (!localStorage.getItem('vasthara_user')) {
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
    localStorage.removeItem('vasthara_unlocked_session');

    // Clear user state and manual login session
    setUser(null);
    localStorage.removeItem('vasthara_user');
    localStorage.removeItem('vasthara_pin'); // Optional: usually mobile number login resets PIN or implies full re-auth
  };

  const unlockApp = () => {
    setIsUnlocked(true);
    localStorage.setItem('vasthara_unlocked_session', 'true');
  };

  const setBiometricEnabled = (enabled: boolean) => {
    setBiometricEnabledState(enabled);
    localStorage.setItem('vasthara_biometric_enabled', enabled ? 'true' : 'false');
  };

  const handleSetUser = (userData: any) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('vasthara_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('vasthara_user');
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
