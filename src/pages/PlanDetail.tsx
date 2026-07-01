import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { usePrograms } from '../context/ProgramContext';
import { Card, Badge, ProgressBar } from '../components/UI';
import { Button } from '../components/UI/Button';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { Input } from '../components/UI/Input';
import { formatCurrency, formatDate, cn } from '../utils';
import { getTransactionsFromDB, preCloseScheme } from '../services/db';
import { sendOTP, verifyOTP } from '../services/sms';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const PlanDetail = () => {
  const { user } = useAuth()!;
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { accountId } = useParams();
  const { userSchemes } = usePrograms();
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const [preCloseModalOpen, setPreCloseModalOpen] = React.useState(false);
  const [otpModalOpen, setOtpModalOpen] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [processing, setProcessing] = React.useState(false);

  const plan = userSchemes.find((s: any) => s.accountId === accountId);

  React.useEffect(() => {
    if (accountId) {
      getTransactionsFromDB(undefined, accountId).then(data => {
        setTransactions(data);
        setLoading(false);
      });
    }
  }, [accountId]);

  if (!plan) return <div className="p-8 text-center text-primary font-bold">{t('plan_detail.not_found')}</div>;

  const duration = plan.duration || 0;
  const paidMonths = duration > 0 ? Math.min(plan.monthsPaid || 0, duration) : (plan.monthsPaid || 0);
  const isCompleted = plan.status === 'completed' || plan.status === 'closed' || (duration > 0 && paidMonths >= duration);

  const handleSendPreCloseOTP = async () => {
    setProcessing(true);
    try {
      const result = await sendOTP(user.phone);
      if (result.success) {
        showNotification(`OTP sent to ${user.phone}`, 'success');
        setPreCloseModalOpen(false);
        setOtpModalOpen(true);
      } else {
        showNotification(result.error || 'Failed to send OTP', 'error');
      }
    } catch (error) {
      showNotification('Failed to prepare pre-close.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyPreClose = async () => {
    if (!otp || otp.length < 6) {
      showNotification('Please enter a valid 6-digit OTP', 'error');
      return;
    }
    setProcessing(true);
    try {
      const result = await verifyOTP(user.phone, otp);
      if (result.success) {
        const success = await preCloseScheme(plan.accountId);
        if (success) {
           showNotification(`Scheme ${plan.name} pre-closed successfully.`, 'success');
           setOtpModalOpen(false);
           navigate(-1);
        } else {
           showNotification('Failed to update scheme status.', 'error');
        }
      } else {
        showNotification(result.error || 'Invalid OTP', 'error');
      }
    } catch (error) {
      showNotification('Error verifying OTP.', 'error');
    } finally {
      setProcessing(false);
    }
  };

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
            <h1 className="text-xl font-display font-bold text-primary tracking-tight">{t('plan_detail.title')}</h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-muted hover:text-accent transition-colors">
          <Download size={18} />
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Status Card */}
        <Card className="p-6 space-y-6 border-none shadow-card bg-surface">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-2xl font-display font-bold text-primary">{plan.name}</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant={isCompleted ? 'primary' : 'success'}>
                  {isCompleted ? t('plan_detail.completed') : t('plan_detail.active')}
                </Badge>
                <Badge variant="default">{duration} {t('plan_detail.months')}</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('plan_detail.total_paid')}</p>
              <p className="text-2xl font-bold text-accent">{formatCurrency(plan.totalPaid)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-text-muted">{t('plan_detail.payment_progress')}</span>
              <span className="text-primary">{t('plan_detail.months_progress', { paid: paidMonths, total: duration })}</span>
            </div>
            <ProgressBar current={paidMonths} total={duration} />
          </div>

          {isCompleted && (
            <div className="rounded-2xl border border-success/30 bg-success-light/40 p-4 flex gap-3">
              <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-success">{t('plan_detail.subscription_completed')}</p>
                <p className="text-xs leading-5 text-text-secondary">
                  {t('plan_detail.redemption_desc')}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-surface rounded-2xl border border-border/50 space-y-1">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('plan_detail.current_dues')}</p>
              <p className="text-lg font-bold text-primary">₹0</p>
            </div>
            <div className="p-4 bg-surface rounded-2xl border border-border/50 space-y-1">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{isCompleted ? t('plan_detail.redemption') : t('plan_detail.next_due')}</p>
              <p className="text-lg font-bold text-warning">{isCompleted ? t('plan_detail.main_branch') : t('plan_detail.flexible')}</p>
            </div>
          </div>
        </Card>

        {/* Quick Info */}
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border/50">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border/50 flex items-center justify-center text-text-muted">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('plan_detail.enrollment_date')}</p>
              <p className="text-sm font-bold text-primary">{formatDate(plan.enrollmentDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border/50">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border/50 flex items-center justify-center text-text-muted">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('plan_detail.branch')}</p>
              <p className="text-sm font-bold text-primary">{plan.branch}</p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-display font-bold text-primary tracking-tight">{t('plan_detail.payment_history')}</h3>
            <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline flex items-center gap-1">
              <History size={12} /> {t('plan_detail.view_all')}
            </button>
          </div>

          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-xs text-text-muted p-4 text-center">{t('plan_detail.no_transactions')}</p>
            ) : transactions.map((tx) => (
              <Card key={tx.id} className="p-4 border-none bg-surface/50 flex items-center justify-between hover:bg-surface transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-success-light text-success flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{formatCurrency(tx.amount)}</p>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      {tx.timestamp ? formatDate(tx.timestamp) : 'N/A'} • {tx.method || t('plan_detail.online')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-success uppercase tracking-widest">{t('plan_detail.success')}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {!isCompleted && (
        <div className="fixed bottom-24 left-6 right-6 z-30 flex gap-4">
          <Button
            variant="outline"
            fullWidth
            onClick={() => setPreCloseModalOpen(true)}
            className="h-16 shadow-card text-base flex gap-2 border-danger text-danger hover:bg-danger/10"
          >
            Pre-Close
          </Button>
          <Button
            fullWidth
            size="lg"
            onClick={() => navigate('/pay-emi')}
            className="h-16 shadow-card text-base flex gap-3 flex-[2]"
          >
            <CreditCard size={20} /> {t('plan_detail.pay_monthly')}
          </Button>
        </div>
      )}

      {/* Pre-Close Confirmation Modal */}
      <ConfirmModal
        isOpen={preCloseModalOpen}
        title="Pre-Close Scheme"
        message={`Are you sure you want to pre-close your ${plan.name} scheme? Please note that NO bonuses or gifts will be provided for pre-closed schemes. An OTP will be sent to your registered mobile number for verification.`}
        onConfirm={handleSendPreCloseOTP}
        onCancel={() => setPreCloseModalOpen(false)}
        confirmText={processing ? "Sending..." : "Send OTP"}
      />

      {/* OTP Verification Modal */}
      <ConfirmModal
        isOpen={otpModalOpen}
        title="Verify Pre-Close"
        message={`Please enter the 6-digit OTP sent to ${user?.phone} to confirm pre-closing the scheme.`}
        onConfirm={handleVerifyPreClose}
        onCancel={() => {
            setOtpModalOpen(false);
            setOtp('');
        }}
        confirmText={processing ? "Verifying..." : "Confirm Pre-Close"}
      >
        <div className="mt-4">
            <Input
                label="6-Digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                placeholder="123456"
                className="text-center tracking-widest text-xl font-bold"
                autoFocus
            />
        </div>
      </ConfirmModal>
    </motion.div>
  );
};

export default PlanDetail;
