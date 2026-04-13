import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  CreditCard,
  Smartphone,
  Landmark,
  CheckCircle2,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useSchemes } from '../context/SchemeContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { formatCurrency, cn } from '../utils';

const PayEMI = () => {
  const navigate = useNavigate();
  const { userSchemes, payEMI } = useSchemes() as any;
  const { user } = useAuth();

  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [staffReferral, setStaffReferral] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
    setLoading(true);

    const payments = selectedPlans.map(id => {
      const plan = userSchemes.find((s: any) => s.accountId === id);
      return { accountId: id, amount: plan?.monthlyAmount || 0 };
    });

    try {
      await payEMI(payments, user?.id || user?.phone);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Payment failed. Please try again.");
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
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Transaction</p>
            <p className="text-[10px] font-bold text-text-muted">TXN-{Math.floor(10000000 + Math.random() * 90000000)}</p>
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
            {userSchemes.length === 0 ? (
              <p className="text-sm text-text-muted px-2">You don't have any active plans yet.</p>
            ) : userSchemes.map((s: any) => (
              <Card
                key={s.accountId}
                onClick={() => togglePlan(s.accountId)}
                className={cn(
                  "p-4 border-2 transition-all cursor-pointer",
                  selectedPlans.includes(s.accountId) ? "border-accent bg-accent-light/30" : "border-border/50"
                )}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                      selectedPlans.includes(s.accountId) ? "border-accent bg-accent" : "border-border"
                    )}>
                      {selectedPlans.includes(s.accountId) && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-primary text-sm">{s.name}</h4>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{s.accountId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{formatCurrency(s.monthlyAmount)}</p>
                    <p className="text-[9px] font-black text-accent uppercase tracking-widest">Due</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] ml-2">Staff Recommendation</h3>
          <Input
            placeholder="Staff ID (Optional)"
            icon={Users}
            value={staffReferral}
            onChange={(e) => setStaffReferral(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] ml-2">Payment Method</h3>
          <div className="space-y-3">
            {[
              { id: 'upi', label: 'UPI (GPay, PhonePe, Paytm)', icon: Smartphone },
              { id: 'card', label: 'Debit / Credit Card', icon: CreditCard },
              { id: 'net', label: 'Net Banking', icon: Landmark },
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
