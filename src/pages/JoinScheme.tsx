import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, ShieldCheck, Info, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSchemes } from '../context/SchemeContext';
import { useNotification } from '../context/NotificationContext';
import { getSchemesFromDB } from '../services/db';
import { Card, Badge } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { formatCurrency } from '../utils';

// Steps: 'details' → 'payment' → 'success'
type Step = 'details' | 'payment' | 'success';

const JoinScheme = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const { user } = useAuth();
  const { joinScheme } = useSchemes() as any;
  const { showNotification } = useNotification();

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('details');
  const [newAccount, setNewAccount] = useState<any>(null);

  const [scheme, setScheme] = useState<any>(null);
  const [loadingScheme, setLoadingScheme] = useState(true);

  React.useEffect(() => {
    getSchemesFromDB().then(data => {
      const found = data.find((s: any) => s.id === planId && s.status === 'active');
      if (found) {
        setScheme(found);
      } else {
        navigate('/schemes');
      }
      setLoadingScheme(false);
    });
  }, [planId]);

  if (loadingScheme || !scheme) return <div className="p-12 text-center text-text-muted">Verifying plan...</div>;

  // ── Step 2: UPI Payment screen ──────────────────────────────────────────────
  const handleJoinAfterPayment = async () => {
    setLoading(true);
    try {
      const account = await joinScheme(scheme, planId, user?.phone || user?.id);
      setNewAccount(account);
      showNotification(`Successfully joined ${scheme.name}!`, "success");
      setStep('success');
    } catch (err) {
      console.error(err);
      showNotification("Failed to join scheme. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'payment') {
    const upiLink = `upi://pay?pa=jkjustin1805-2@oksbi&pn=Vasthara&am=${scheme.monthlyAmount}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(upiLink)}`;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="page-transition-wrapper p-8 flex flex-col items-center justify-center min-h-screen text-center space-y-6"
      >
        <div className="space-y-2">
          <p className="text-xs font-black text-accent uppercase tracking-[0.2em]">First Month Payment</p>
          <h2 className="text-2xl font-display font-bold text-primary tracking-tight">
            Pay {formatCurrency(scheme.monthlyAmount)}
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Scan the QR or tap Open UPI App to pay your first instalment and activate the scheme.
          </p>
        </div>

        <Card className="bg-white p-6 inline-block border border-border shadow-subtle rounded-3xl relative overflow-hidden">
          <img
            src={qrUrl}
            className="w-64 h-64 object-contain rounded-xl"
            alt="Payment QR Code"
          />
          <div className="absolute inset-0 border-4 border-transparent border-t-accent rounded-3xl animate-spin" style={{ animationDuration: '3s' }} />
        </Card>

        <div className="space-y-4 pt-4 w-full">
          <a href={upiLink} className="w-full block">
            <Button fullWidth size="lg" className="bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-card">
              <Smartphone size={20} className="mr-2" /> Open UPI App
            </Button>
          </a>

          <Button
            fullWidth
            size="lg"
            loading={loading}
            onClick={handleJoinAfterPayment}
            className="bg-success hover:bg-green-700 shadow-card"
          >
            <CheckCircle2 size={20} className="mr-2" /> I Have Paid — Activate Scheme
          </Button>

          <button
            onClick={() => setStep('details')}
            className="text-xs font-black text-text-muted uppercase tracking-widest hover:text-primary transition-colors mt-2"
          >
            Go Back
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Step 3: Success ──────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="page-transition-wrapper p-8 flex flex-col items-center justify-center min-h-screen text-center space-y-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="w-24 h-24 bg-success rounded-full flex items-center justify-center text-white shadow-card"
        >
          <CheckCircle2 size={48} />
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-3xl font-display font-bold text-primary tracking-tight">
            Scheme Activated!
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Your first instalment has been recorded. Welcome to {scheme.name}!
          </p>
        </div>

        <Card className="w-full bg-surface border-none p-6 space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Account Details</p>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Plan Name</p>
              <p className="text-sm font-bold text-primary">{scheme.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Months Paid</p>
              <p className="text-sm font-bold text-primary">1 / {scheme.duration}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Amount Paid</p>
              <p className="text-sm font-bold text-success">{formatCurrency(scheme.monthlyAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Next Due</p>
              <p className="text-sm font-bold text-accent">Flexible</p>
            </div>
          </div>
        </Card>

        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 w-full">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p className="text-xs font-medium leading-relaxed text-left">
            Your first month is recorded. Your next instalment can be paid at your convenience within the next monthly cycle.
          </p>
        </div>

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

  // ── Step 1: Details & Agreement ─────────────────────────────────────────────
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
        <h1 className="text-2xl font-display font-bold text-primary tracking-tight">
          Join Purchase Plan
        </h1>
      </div>

      <div className="space-y-6">
        <Card className="p-0 overflow-hidden border-2 border-accent/20">
          <div className="bg-surface p-4 border-b border-border/50 flex justify-between items-center">
            <h3 className="font-display font-bold text-primary">{scheme.name}</h3>
            <Badge variant="warning" className="bg-amber-50 text-amber-600">{scheme.duration} MONTHS</Badge>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Monthly Payable</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(scheme.monthlyAmount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Payable</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(scheme.monthlyAmount * scheme.duration)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-accent-light rounded-xl text-accent">
              <ShieldCheck size={18} />
              <p className="text-[10px] font-bold uppercase tracking-wider">Secured by Vasthara Trust</p>
            </div>
          </div>
        </Card>

        {/* First payment notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">First Month Payment Required</p>
            <p className="text-xs text-amber-600 leading-relaxed">
              To activate this scheme you must pay <strong>{formatCurrency(scheme.monthlyAmount)}</strong> now as your first instalment. Future instalments can be paid monthly at your convenience.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Input
            label="Account Name"
            value={`${user?.firstName} ${user?.lastName}`}
            readOnly
            className="bg-surface-alt opacity-70"
          />

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <label htmlFor="terms" className="text-xs font-medium text-text-secondary leading-relaxed">
                I agree to the <button className="text-accent font-bold hover:underline">Terms & Conditions</button> of the {scheme.name} scheme and authorise the first month payment of {formatCurrency(scheme.monthlyAmount)}.
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <Button
          fullWidth
          size="lg"
          disabled={!agreed}
          onClick={() => setStep('payment')}
          className="h-16 shadow-card"
        >
          PROCEED TO PAY &amp; JOIN
        </Button>
      </div>
    </motion.div>
  );
};

export default JoinScheme;
