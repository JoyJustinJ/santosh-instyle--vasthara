import React, { createContext, useContext, useState, useEffect } from 'react';
import { SCHEMES } from '../constants';
import { getTransactionsFromDB, recordTransactionInDB } from '../services/db';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';

const SchemeContext = createContext();

export const SchemeProvider = ({ children }) => {
  const [userSchemes, setUserSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync with Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "user_schemes"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter by user ID if needed, but for now we'll filter in the component or keep simple
      setUserSchemes(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const joinScheme = async (scheme: any, planId: string, userId: string) => {
    const newEntry = {
      ...scheme,
      userId,
      accountId: `ACC-2024-${Math.floor(1000 + Math.random() * 9000)}`,
      enrollmentDate: new Date().toISOString(),
      monthsPaid: 0,
      totalPaid: 0,
      bonusPoints: 0,
      status: 'Active',
      branch: 'Krishnagiri',
      group: 'Batch-A'
    };
    await setDoc(doc(db, "user_schemes", newEntry.accountId), newEntry);
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
          bonusPoints: (current.bonusPoints || 0) + 15
        });
        await recordTransactionInDB({
          userId,
          accountId: payment.accountId,
          amount: payment.amount,
          type: 'deposit',
          status: 'Success',
          method: 'UPI'
        });
      }
    }
  };

  return (
    <SchemeContext.Provider value={{ userSchemes, joinScheme, payEMI, loading }}>
      {children}
    </SchemeContext.Provider>
  );
};

export const useSchemes = () => useContext(SchemeContext);
