import React, { createContext, useContext, useState, useEffect } from 'react';
import { recordTransactionInDB } from '../services/db';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const ProgramContext = createContext<any>(null);

export const ProgramProvider = ({ children }: { children: React.ReactNode }) => {
  const [userSchemes, setUserSchemes] = useState<any[]>([]);
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
    const q = query(collection(db, "user_schemes"), where("userId", "==", currentUserId));
    const unsub = onSnapshot(q, async (snapshot) => {
      const schemes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch all transactions for this user to compute real totals
      try {
        const { getDocs, query: fq, collection: fcol, where: fwhere } = await import('firebase/firestore');
        const txSnap = await getDocs(fq(fcol(db, "transactions"), fwhere("userId", "==", currentUserId)));
        const allTxs: any[] = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Enrich each scheme with computed totalPaid & monthsPaid from real transactions
        const enriched = schemes.map((s: any) => {
          const schemeTxs = allTxs.filter(tx => tx.accountId === s.accountId);
          const computedTotalPaid = schemeTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
          const computedMonthsPaid = schemeTxs.length;
          return {
            ...s,
            totalPaid: computedTotalPaid > 0 ? computedTotalPaid : (s.totalPaid || 0),
            monthsPaid: computedMonthsPaid > 0 ? computedMonthsPaid : (s.monthsPaid || 0),
          };
        });

        setUserSchemes(enriched);
      } catch {
        // Fallback to raw DB values if transaction fetch fails
        setUserSchemes(schemes);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [currentUserId]);


  const JoinProgram = async (scheme: any, planId: string, userId: string, accountId: string, paymentMeta: any = {}) => {
    // The backend `api/verify-payment.ts` now securely creates the scheme and transaction
    // after verifying the Razorpay payment.
    const newEntry = {
      ...scheme,
      userId,
      accountId,
      enrollmentDate: new Date().toISOString(),
      monthsPaid: 1,
      totalPaid: scheme.monthlyAmount,
      status: 'active',
      branch: 'Hosur',
      group: 'Batch-A'
    };

    showNotification(`Successfully joined ${scheme.name}!`, 'success');
    return newEntry;
  };

  const payEMI = async (payments: { accountId: string, amount: number }[], userId: string, paymentMeta: any = {}): Promise<string[]> => {
    // The backend `api/verify-payment.ts` now securely records the transactions 
    // and updates the user_schemes collection after verifying the payment.
    
    // We just return a mock transaction ID for the UI to display success, 
    // since the real one is generated on the backend.
    const transactionIds = payments.map(p => `TX-${paymentMeta.razorpayPaymentId || Date.now()}`);
    
    showNotification('Payments successful!', 'success');
    return transactionIds;
  };

  return (
    <ProgramContext.Provider value={{ userSchemes, JoinProgram, payEMI, loading }}>
      {children}
    </ProgramContext.Provider>
  );
};

export const usePrograms = () => useContext(ProgramContext);
