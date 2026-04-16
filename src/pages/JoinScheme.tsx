import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, ShieldCheck, Info, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSchemes } from '../context/SchemeContext';
import { getSchemesFromDB } from '../services/db';
import { Card, Badge } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { formatCurrency } from '../utils';

const JoinScheme = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const { user } = useAuth();
  const { joinScheme } = useSchemes() as any;

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newAccount, setNewAccount] = useState(null);

  const [scheme, setScheme] = useState<any>(null);
  const [loadingScheme, setLoadingScheme] = useState(true);

  React.useEffect(() => {
    getSchemesFromDB().then(data => {
      const found = data.find((s: any) => s.id === planId && s.status === 'active');
      if (found) {
        setScheme(found);
      } else {
        // Redirect if scheme is inactive or not found
        navigate('/schemes');
      }
      setLoadingScheme(false);
    });
  }, [planId]);

  if (loadingScheme || !scheme) return <div className="p-12 text-center text-text-muted">Verifying plan...</div>;

  const handleJoin = async () => {
    if (!agreed) return;
    setLoading(true);

    // Call Firebase join event
    try {
      const account = await joinScheme(scheme, planId, user?.id || user?.phone);
      setNewAccount(account);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to join scheme. Please try again.");
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
            Successfully Enrolled!
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Welcome to the {scheme.name} family.
          </p>
        </div>

        <Card className="w-full bg-surface border-none p-6 space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Account Details</p>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Account No</p>
              <p className="text-sm font-bold text-primary">{newAccount?.accountId}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Start Date</p>
              <p className="text-sm font-bold text-primary">13-04-2024</p>
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
        <h1 className="text-2xl font-display font-bold text-primary tracking-tight">
          Join Purchase Plan
        </h1>
      </div>

      <div className="space-y-6">
        <Card className="p-0 overflow-hidden border-2 border-[#D4AF37]/20">
          <div className="bg-surface p-4 border-b border-border/50 flex justify-between items-center">
            <h3 className="font-display font-bold text-primary">{scheme.name}</h3>
            <Badge variant="warning" className="bg-amber-50 text-amber-600">11 MONTHS</Badge>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Monthly Payable</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(scheme.monthlyAmount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Payable</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(scheme.maturityValue)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-accent-light rounded-xl text-accent">
              <ShieldCheck size={18} />
              <p className="text-[10px] font-bold uppercase tracking-wider">Secured by Vasthara Trust</p>
            </div>
          </div>
        </Card>

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
                I agree to the <button className="text-accent font-bold hover:underline">Terms & Conditions</button> of the Swarna Dharaa Plus scheme.
              </label>
            </div>

            <div className="bg-surface rounded-2xl p-4 flex items-start gap-3">
              <Info size={16} className="text-text-muted mt-0.5 shrink-0" />
              <p className="text-[10px] text-text-muted leading-relaxed">
                By joining this plan, you authorize Vasthara to create a new savings account in your name. Installments must be paid before the 10th of every month.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <Button
          fullWidth
          size="lg"
          disabled={!agreed}
          loading={loading}
          onClick={handleJoin}
          className="h-16 shadow-card"
        >
          JOIN PLAN
        </Button>
      </div>
    </motion.div>
  );
};

export default JoinScheme;
