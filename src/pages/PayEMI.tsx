import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { useSchemes } from '../context/SchemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getTransactionsFromDB } from '../services/db';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { formatCurrency, cn } from '../utils';

declare global {
  interface Window {
    Razorpay?: new (options: any) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const getApiErrorMessage = (error: unknown) => {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Payment server is unreachable. Please check the deployed API URL and try again.';
  }

  return error instanceof Error ? error.message : 'Payment failed. Please try again.';
};

const PayEMI = () => {
  const navigate = useNavigate();
  const { userSchemes, payEMI } = useSchemes() as any;
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paidPlanIds, setPaidPlanIds] = useState<string[]>([]);
  const [realTransactionIds, setRealTransactionIds] = useState<string[]>([]);

  React.useEffect(() => {
    const checkPaidPlans = async () => {
      if (!userSchemes || userSchemes.length === 0) return;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const alreadyPaid: string[] = [];

      for (const scheme of userSchemes) {
        const txs = await getTransactionsFromDB(undefined, scheme.accountId);
        const hasPaidThisMonth = txs.some((tx: any) => {
          const date = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        if (hasPaidThisMonth) {
          alreadyPaid.push(scheme.accountId);
        }
      }
      setPaidPlanIds(alreadyPaid);
    };

    checkPaidPlans();
  }, [userSchemes]);

  const togglePlan = (id: string) => {
    setSelectedPlans(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const totalAmount = selectedPlans.reduce((sum, id) => {
    const plan = userSchemes.find((s: any) => s.accountId === id);
    return sum + (plan?.monthlyAmount || 0);
  }, 0);

  const handlePayment = async () => {
    if (selectedPlans.length === 0 || !paymentMethod) return;

    if (!window.Razorpay) {
      showNotification("Payment checkout could not load. Please try again.", "error");
      return;
    }

    const payments = selectedPlans.map(id => {
      const plan = userSchemes.find((s: any) => s.accountId === id);
      return { accountId: id, amount: plan?.monthlyAmount || 0 };
    });

    const amountInPaise = Math.round(totalAmount * 100);

    if (amountInPaise < 100) {
      showNotification("Minimum payment amount is ₹1.", "error");
      return;
    }

    setLoading(true);

    try {
      const orderResponse = await fetch(`${API_BASE_URL}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `vasthara_${Date.now()}`,
        }),
      });

      const order = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(order?.error || 'Unable to create payment order');
      }

      const razorpayKeyId = RAZORPAY_KEY_ID || order.key_id;

      if (!razorpayKeyId) {
        throw new Error('Razorpay key is not configured');
      }

      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Vasthara',
        description: 'Installment payment',
        order_id: order.order_id,
        prefill: {
          name: user?.name || '',
          contact: user?.phone || '',
          email: user?.email || '',
        },
        theme: {
          color: '#8A5A44',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            showNotification("Payment cancelled.", "error");
          },
        },
        handler: async (response: any) => {
          setLoading(true);

          try {
            const verifyResponse = await fetch(`${API_BASE_URL}/api/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verification = await verifyResponse.json();

            if (!verifyResponse.ok || !verification.success) {
              throw new Error(verification?.error || 'Payment verification failed');
            }

            const txIds = await payEMI(payments, user?.id || user?.phone);
            setRealTransactionIds(txIds);
            showNotification("Payment successful! Your plans have been updated.", "success");
            setSuccess(true);
          } catch (err: any) {
            console.error(err);
            showNotification(err?.message || "Payment verification failed.", "error");
          } finally {
            setLoading(false);
          }
        },
      });

      razorpay.on('payment.failed', (response: any) => {
        setLoading(false);
        const message = response?.error?.description || "Payment failed. Please try again.";
        showNotification(message, "error");
      });

      razorpay.open();
    } catch (err) {
      console.error(err);
      showNotification(getApiErrorMessage(err), "error");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="page-transition-wrapper p-8 flex flex-col items-center justify-center min-h-screen text-center space-y-8"
      >
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="w-24 h-24 bg-success rounded-full flex items-center justify-center text-white shadow-card z-10 relative"
          >
            <CheckCircle2 size={48} />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-success rounded-full"
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-display font-bold text-primary tracking-tight">
            Payment Successful!
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Your combined installments have been recorded.
          </p>
        </div>

        <Card className="w-full bg-surface border-none p-6 space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Transaction ID</p>
            <p className="text-[10px] font-bold text-text-muted font-mono">{realTransactionIds[0] || '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Amount Paid</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Plans Updated</p>
              <p className="text-lg font-bold text-accent">{selectedPlans.length}</p>
            </div>
          </div>
        </Card>

        <div className="w-full space-y-4 pt-4">
          <Button fullWidth size="lg" onClick={() => navigate('/my-schemes')}>
            View My Plans
          </Button>
          <button
            onClick={() => navigate('/home')}
            className="text-xs font-black text-text-muted uppercase tracking-widest hover:text-primary transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper p-6 pb-12 space-y-8"
    >
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Pay Installments</h1>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] ml-2">Select Plans to Pay</h3>
          <div className="space-y-3">
            {userSchemes.filter((s: any) => s.status !== 'completed' && (s.monthsPaid || 0) < (s.duration || 0)).length === 0 ? (
              <p className="text-sm text-text-muted px-2">You don't have any active plans yet.</p>
            ) : userSchemes
              .filter((s: any) => s.status !== 'completed' && (s.monthsPaid || 0) < (s.duration || 0))
              .map((s: any) => {
              const isPaid = paidPlanIds.includes(s.accountId);
              return (
                <Card
                  key={s.accountId}
                  onClick={() => !isPaid && togglePlan(s.accountId)}
                  className={cn(
                    "p-4 border-2 transition-all cursor-pointer relative",
                    selectedPlans.includes(s.accountId) ? "border-accent bg-accent-light/30" : "border-border/50",
                    isPaid && "opacity-60 cursor-not-allowed bg-surface grayscale-[0.5]"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        selectedPlans.includes(s.accountId) ? "border-accent bg-accent" : "border-border",
                        isPaid && "border-success bg-success"
                      )}>
                        {selectedPlans.includes(s.accountId) && !isPaid && <CheckCircle2 size={14} className="text-white" />}
                        {isPaid && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-primary text-sm">{s.name}</h4>
                        {isPaid && <p className="text-[10px] text-success font-bold uppercase tracking-wider">Already Paid This Month</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatCurrency(s.monthlyAmount)}</p>
                      <p className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        isPaid ? "text-success" : "text-accent"
                      )}>{isPaid ? "Paid" : "Due"}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] ml-2">Payment Method</h3>
          <div className="space-y-3">
            {[
              { id: 'upi', label: 'UPI (GPay, PhonePe, Paytm)', icon: Smartphone }
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  "w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all",
                  paymentMethod === method.id ? "border-accent bg-accent-light/30" : "border-border/50 bg-white"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    paymentMethod === method.id ? "bg-accent text-white" : "bg-surface text-text-muted"
                  )}>
                    <method.icon size={20} />
                  </div>
                  <span className="text-sm font-bold text-primary">{method.label}</span>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  paymentMethod === method.id ? "border-accent bg-accent" : "border-border"
                )}>
                  {paymentMethod === method.id && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-text-secondary">Total Amount to Pay</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <Button
          fullWidth
          size="lg"
          disabled={selectedPlans.length === 0 || !paymentMethod}
          loading={loading}
          onClick={handlePayment}
          className="h-16 shadow-card"
        >
          PROCEED TO PAY {formatCurrency(totalAmount)}
        </Button>
      </div>
    </motion.div>
  );
};

export default PayEMI;
