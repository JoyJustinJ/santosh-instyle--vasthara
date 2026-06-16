import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, ShieldCheck, Info, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSchemes } from '../context/SchemeContext';
import { useNotification } from '../context/NotificationContext';
import { getSchemesFromDB } from '../services/db';
import { payWithRazorpay } from '../services/razorpay';
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
  const [showTerms, setShowTerms] = useState(false);

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

  // ── Step 2: Razorpay Payment screen ─────────────────────────────────────────
  const handleJoinAfterPayment = async () => {
    setLoading(true);
    try {
      const userId = user?.id || user?.phone;
      const accountId = `ACC-2024-${Math.floor(1000 + Math.random() * 9000)}`;
      const payment = await payWithRazorpay({
        amount: scheme.monthlyAmount,
        receipt: `vasthara_sub_join_${planId || 'plan'}_${Date.now()}`,
        description: `${scheme.name} Membership Fee`,
        user,
        notes: {
          purpose: 'subscription_join',
          userId: userId || '',
          planId: planId || '',
          programId: planId || '',
          schemeName: scheme.name,
          programName: scheme.name,
          accountId: accountId,
        },
      });
      const account = await joinScheme(scheme, planId, userId, accountId, {
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpayOrderId: payment.razorpay_order_id,
        razorpaySignature: payment.razorpay_signature,
        gatewayReceipt: payment.receipt,
        gatewayAmount: payment.amount,
        gatewayCurrency: payment.currency,
        referenceId: payment.razorpay_payment_id,
      });
      setNewAccount(account);
      showNotification(`Successfully joined ${scheme.name}!`, "success");
      setStep('success');
    } catch (err) {
      console.error(err);
      showNotification("Failed to join program. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'payment') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="page-transition-wrapper p-8 flex flex-col items-center justify-center min-h-screen text-center space-y-6"
      >
        <div className="space-y-2">
          <p className="text-xs font-black text-accent uppercase tracking-[0.2em]">First Month Subscription Fee</p>
          <h2 className="text-2xl font-display font-bold text-primary tracking-tight">
            Pay {formatCurrency(scheme.monthlyAmount)}
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Complete the secure Razorpay checkout to pay your first subscription fee and activate the membership.
          </p>
        </div>

        <Card className="bg-white p-8 border border-border shadow-subtle rounded-3xl w-full">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-accent-light text-accent flex items-center justify-center">
            <CreditCard size={44} strokeWidth={1.5} />
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-xs font-black text-text-muted uppercase tracking-widest">Payment Gateway</p>
            <p className="text-lg font-display font-bold text-primary">Razorpay Secure Checkout</p>
            <p className="text-xs font-medium text-text-secondary">
              Cards, wallets, net banking, and supported checkout options are handled by Razorpay.
            </p>
          </div>
        </Card>

        <div className="space-y-4 pt-4 w-full">
          <Button
            fullWidth
            size="lg"
            loading={loading}
            onClick={handleJoinAfterPayment}
            className="shadow-card"
          >
            <CreditCard size={20} className="mr-2" /> Pay with Razorpay
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
            Membership Activated!
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Your first subscription fee has been recorded. Welcome to {scheme.name}!
          </p>
        </div>

        <Card className="w-full bg-surface border-none p-6 space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Account Details</p>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Program Name</p>
              <p className="text-sm font-bold text-primary">{scheme.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Subscription Dues Paid</p>
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
            Your first month is recorded. Your next subscription payment can be paid at your convenience within the next monthly cycle.
          </p>
        </div>

        <div className="w-full space-y-4 pt-4">
          <Button fullWidth size="lg" onClick={() => navigate('/my-schemes')}>
            View My Subscriptions
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
          Join Membership Program
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
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Monthly Subscription</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(scheme.monthlyAmount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Subscription</p>
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
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">First Month Subscription Required</p>
            <p className="text-xs text-amber-600 leading-relaxed">
              To activate this membership you must pay <strong>{formatCurrency(scheme.monthlyAmount)}</strong> now as your first subscription fee. Future subscription payments can be paid monthly at your convenience.
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
                I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-accent font-bold hover:underline">Terms & Conditions</button> of the {scheme.name} membership program and authorise the first month subscription fee payment of {formatCurrency(scheme.monthlyAmount)}.
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

      <AnimatePresence>
        {showTerms && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-surface rounded-3xl shadow-card overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-border/50 flex justify-between items-center bg-surface">
                <h3 className="font-display font-bold text-primary">Terms & Conditions</h3>
                <button onClick={() => setShowTerms(false)} className="p-1 text-text-muted hover:text-primary transition-colors rounded-full hover:bg-black/5">
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-sm text-text-secondary space-y-4 flex-1">
                <p><strong>1. Membership Term:</strong> Members must pay their monthly subscription fees consistently for the chosen membership duration.</p>
                <p><strong>2. Membership Rewards:</strong> Redemption rewards are redeemable only for products and loyalty benefits. No cash refunds or monetary returns are provided. Gifts and promotional rewards are solely at the discretion of the management.</p>
                <p><strong>3. Late Payments:</strong> There is no fixed due date within the month, but skipping a month may delay your membership completion and gift eligibility.</p>
                <p><strong>4. Redemption:</strong> Membership rewards must be redeemed for apparel/products at the Santosh Instyle store in Hosur. Cash refunds are not permitted under any circumstances.</p>
                <p><strong>5. Cancellation:</strong> Premature cancellation may result in loss of loyalty benefits. The management reserves the right to alter program rules as necessary.</p>
                <p className="text-xs text-text-muted italic border-t pt-2 mt-2">Disclaimer: We do not accept deposits, investments, or public funds. This is a promotional customer loyalty membership subscription program.</p>
              </div>
              <div className="p-4 border-t border-border/50 bg-surface">
                <Button fullWidth onClick={() => { setShowTerms(false); setAgreed(true); }}>I Agree</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default JoinScheme;
