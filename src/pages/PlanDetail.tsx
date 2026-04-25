import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Download,
  CreditCard,
  History,
  Info,
  TrendingUp,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useSchemes } from '../context/SchemeContext';
import { Card, Badge, ProgressBar } from '../components/UI';
import { Button } from '../components/UI/Button';
import { formatCurrency, formatDate, cn } from '../utils';
import { getTransactionsFromDB } from '../services/db';

const PlanDetail = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const { userSchemes } = useSchemes();
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const plan = userSchemes.find((s: any) => s.accountId === accountId);

  React.useEffect(() => {
    if (accountId) {
      getTransactionsFromDB(undefined, accountId).then(data => {
        setTransactions(data);
        setLoading(false);
      });
    }
  }, [accountId]);

  if (!plan) return <div className="p-8 text-center text-primary font-bold">Plan not found</div>;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper pb-24"
    >
      {/* Header */}
      <div className="bg-surface p-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-primary tracking-tight">Plan Details</h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center text-text-muted hover:text-accent transition-colors">
          <Download size={18} />
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Status Card */}
        <Card className="p-6 space-y-6 border-none shadow-card bg-gradient-to-br from-white to-surface">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-2xl font-display font-bold text-primary">{plan.name}</h2>
              <div className="flex gap-2">
                <Badge variant="success">ACTIVE</Badge>
                <Badge variant="default">{plan.duration} MONTHS</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Saved Amount</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(plan.totalPaid)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-text-muted">Payment Progress</span>
              <span className="text-primary">{plan.monthsPaid} of {plan.duration} Months</span>
            </div>
            <ProgressBar current={plan.monthsPaid} total={plan.duration} />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-white rounded-2xl border border-border/50 space-y-1">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Current Dues</p>
              <p className="text-lg font-bold text-primary">₹0</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-border/50 space-y-1">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Next Due</p>
              <p className="text-lg font-bold text-warning">Flexible</p>
            </div>
          </div>
        </Card>

        {/* Quick Info */}
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border/50">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-text-muted">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Enrollment Date</p>
              <p className="text-sm font-bold text-primary">{formatDate(plan.enrollmentDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border/50">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-text-muted">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Branch</p>
              <p className="text-sm font-bold text-primary">{plan.branch}</p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-display font-bold text-primary tracking-tight">Payment History</h3>
            <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline flex items-center gap-1">
              <History size={12} /> View All
            </button>
          </div>

          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-xs text-text-muted p-4 text-center">No transactions recorded yet.</p>
            ) : transactions.map((tx) => (
              <Card key={tx.id} className="p-4 border-none bg-surface/50 flex items-center justify-between hover:bg-surface transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-success-light text-success flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{formatCurrency(tx.amount)}</p>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      {tx.timestamp ? (typeof tx.timestamp === 'string' ? tx.timestamp : tx.timestamp.toDate().toLocaleDateString()) : 'N/A'} • {tx.method || 'Online'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-success uppercase tracking-widest">Success</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-24 left-6 right-6 z-30">
        <Button
          fullWidth
          size="lg"
          onClick={() => navigate('/pay-emi')}
          className="h-16 shadow-card text-base flex gap-3"
        >
          <CreditCard size={20} /> PAY NEXT INSTALLMENT
        </Button>
      </div>
    </motion.div>
  );
};

export default PlanDetail;
