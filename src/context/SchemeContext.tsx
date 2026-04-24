import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTransactionsFromDB, recordTransactionInDB } from '../services/db';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const SchemeContext = createContext();

export const SchemeProvider = ({ children }) => {
  const [userSchemes, setUserSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth() as any;
  const { showNotification } = useNotification();
  const currentUserId = user?.id || user?.phone;

  // Sync user_schemes filtered to only the logged-in user
  useEffect(() => {
    if (!currentUserId) {
      setUserSchemes([]);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(collection(db, "user_schemes"), (snapshot) => {
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((s: any) => s.userId === user?.id || s.userId === user?.phone);
      setUserSchemes(data);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUserId]);

  const joinScheme = async (scheme: any, planId: string, userId: string) => {
    const newEntry = {
      ...scheme,
      userId,
      accountId: `ACC-2024-${Math.floor(1000 + Math.random() * 9000)}`,
      enrollmentDate: new Date().toISOString(),
      monthsPaid: 1,
      totalPaid: scheme.monthlyAmount,
      status: 'active',
      branch: 'Krishnagiri',
      group: 'Batch-A'
    };
    await setDoc(doc(db, "user_schemes", newEntry.accountId), newEntry);
    // Record first month payment as part of joining
    await recordTransactionInDB({
      userId,
      schemeName: scheme.name,
      accountId: newEntry.accountId,
      amount: scheme.monthlyAmount,
      type: 'deposit',
      status: 'Success',
      method: 'UPI'
    });
    showNotification(`Successfully joined ${scheme.name}!`, 'success');
    return newEntry;
  };

  const payEMI = async (payments: { accountId: string, amount: number }[], userId: string) => {
    for (const payment of payments) {
      const schemeRef = doc(db, "user_schemes", payment.accountId);
      const current = userSchemes.find(s => s.accountId === payment.accountId);
      if (current) {
        await updateDoc(schemeRef, {
          monthsPaid: (current.monthsPaid || 0) + 1,
          totalPaid: (current.totalPaid || 0) + payment.amount,
        });
        await recordTransactionInDB({
          userId,
          schemeName: current.name || current.schemeName || 'Purchase Plan',
          accountId: payment.accountId,
          amount: payment.amount,
          type: 'deposit',
          status: 'Success',
          method: 'UPI'
        });
      }
    }
    showNotification('Payments successful!', 'success');
  };

  return (
    <SchemeContext.Provider value={{ userSchemes, joinScheme, payEMI, loading }}>
      {children}
    </SchemeContext.Provider>
  );
};

export const useSchemes = () => useContext(SchemeContext);
