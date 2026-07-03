import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Receipt, Download, RefreshCw, Tag, UserCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getTransactionsFromDB, getUserPlansFromDB, getSchemesFromDB } from '../services/db';
import { Badge, Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { formatCurrency, cn, safeDate } from '../utils';
import { downloadAsPDF } from '../utils/pdfUtils';

const Transactions = () => {
    const { user } = useAuth()!;
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [planMap, setPlanMap] = useState<Record<string, string>>({});
    const [selectedInvoiceTx, setSelectedInvoiceTx] = useState<any>(null);

    const fetchTransactions = async () => {
        setLoading(true);
        if (user) {
            try {
                const userIds = Array.from(new Set([user.id, user.phone].filter(Boolean) as string[]));
                const [txGroups, planGroups, allSchemes] = await Promise.all([
                    Promise.all(userIds.map((id) => getTransactionsFromDB(id))),
                    Promise.all(userIds.map((id) => getUserPlansFromDB(id))),
                    getSchemesFromDB()
                ]);
                const txData = Array.from(
                    new Map(txGroups.flat().map((tx: any) => [tx.id, tx])).values()
                );
                const userPlans = Array.from(
                    new Map(planGroups.flat().map((plan: any) => [plan.id || plan.accountId, plan])).values()
                );
                const mapping: Record<string, string> = {};
                userPlans.forEach((p: any) => {
                    mapping[p.id || p.accountId] = p.name || p.schemeName;
                });
                allSchemes.forEach((s: any) => {
                    mapping[s.id] = s.name;
                });
                setPlanMap(mapping);
                const sorted = txData.sort((a: any, b: any) => safeDate(b.timestamp).getTime() - safeDate(a.timestamp).getTime());
                setTransactions(sorted);
            } catch (err) {
                console.error('Error fetching transaction data:', err);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTransactions();
    }, [user]);

    const renderInvoiceOverlay = () => {
        if (!selectedInvoiceTx) return null;
        const tx = selectedInvoiceTx;
        const resolvedSchemeName = tx.schemeName || planMap[tx.accountId] || planMap[tx.schemeId] || 'General Payment';
        const invoicePrimaryKey = tx.invoicePrimaryKey || tx.id;
        const paymentId = tx.razorpayPaymentId || tx.gatewayPaymentId || '';

        return (
            <div className="fixed inset-0 z-[100] bg-gray-50 overflow-y-auto">
                {/* Action bar - not captured in PDF */}
                <div className="max-w-[800px] mx-auto p-4 flex justify-between items-center sticky top-0 bg-gray-50 z-10 border-b shadow-sm mb-6">
                    <button
                        onClick={() => setSelectedInvoiceTx(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                    >
                        &larr; Back
                    </button>
                    <button
                        id="invoice-download-btn"
                        onClick={async () => {
                            const btn = document.getElementById('invoice-download-btn') as HTMLButtonElement;
                            if (btn) { btn.textContent = 'Generating...'; btn.disabled = true; }
                            const el = document.getElementById('invoice-pdf-content');
                            if (el) {
                                try { await downloadAsPDF(el, 'Invoice_' + invoicePrimaryKey); }
                                catch (e) { console.error(e); }
                            }
                            if (btn) { btn.innerHTML = 'Download PDF'; btn.disabled = false; }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                    >
                        <Download size={16} /> Download PDF
                    </button>
                </div>

                {/* PDF content — all inline styles for html2canvas compatibility */}
                <div
                    id="invoice-pdf-content"
                    style={{ maxWidth: '780px', margin: '0 auto', padding: '40px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#111827' }}
                >
                    {/* Header */}
                    <table style={{ width: '100%', borderBottom: '2px solid #f3f4f6', paddingBottom: '24px', marginBottom: '32px' }}>
                        <tbody>
                            <tr>
                                <td style={{ verticalAlign: 'top', width: '50%' }}>
                                    <img src="/vastra-logo.jpg" alt="Vastra Logo" style={{ maxWidth: '140px', height: 'auto', display: 'block' }} />
                                </td>
                                <td style={{ verticalAlign: 'top', width: '50%', textAlign: 'right' }}>
                                    <h1 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '24px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>INVOICE</h1>
                                    <div style={{ display: 'inline-block', padding: '4px 12px', background: '#dcfce7', color: '#166534', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px', border: '1px solid #bbf7d0' }}>PAID</div>
                                    <table style={{ marginLeft: 'auto', borderCollapse: 'collapse' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '3px 15px 3px 0', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Invoice No:</td>
                                                <td style={{ padding: '3px 0', fontSize: '13px', fontWeight: 600, color: '#111827' }}>#{invoicePrimaryKey}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 15px 3px 0', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date:</td>
                                                <td style={{ padding: '3px 0', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{tx.date || safeDate(tx.timestamp).toLocaleDateString()}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '3px 15px 3px 0', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Reference:</td>
                                                <td style={{ padding: '3px 0', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{tx.referenceId || invoicePrimaryKey}</td>
                                            </tr>
                                            {paymentId && (
                                                <tr>
                                                    <td style={{ padding: '3px 15px 3px 0', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Gateway ID:</td>
                                                    <td style={{ padding: '3px 0', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{paymentId}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Billing */}
                    <table style={{ width: '100%', marginBottom: '32px' }}>
                        <tbody>
                            <tr>
                                <td style={{ verticalAlign: 'top', width: '50%', paddingRight: '16px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Billed From</div>
                                    <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7 }}>
                                        <strong style={{ color: '#111827' }}>Vastra (Santhosh Silks)</strong><br />
                                        Hosur Branch<br />
                                        Tamil Nadu, India
                                    </div>
                                </td>
                                <td style={{ verticalAlign: 'top', width: '50%', paddingLeft: '16px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Billed To</div>
                                    <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7 }}>
                                        <strong style={{ color: '#111827' }}>{user?.firstName || 'Customer'} {user?.lastName || ''}</strong><br />
                                        Phone: +91 {user?.phone}<br />
                                        {user?.email ? 'Email: ' + user.email : 'No email provided'}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Items Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                        <thead>
                            <tr>
                                <th style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Description</th>
                                <th style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Payment Method</th>
                                <th style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '16px 12px', borderBottom: '1px solid #f3f4f6', fontSize: '15px', color: '#111827' }}>
                                    <strong>Subscription Payment</strong><br />
                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Scheme: {resolvedSchemeName}</span>
                                </td>
                                <td style={{ padding: '16px 12px', borderBottom: '1px solid #f3f4f6', fontSize: '15px', color: '#111827' }}>{tx.method || 'Razorpay / Standard'}</td>
                                <td style={{ padding: '16px 12px', borderBottom: '1px solid #f3f4f6', fontSize: '15px', color: '#111827', textAlign: 'right' }}>{formatCurrency(tx.amount)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Totals */}
                    <table style={{ width: '100%', marginBottom: '32px' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '60%' }}></td>
                                <td style={{ width: '40%' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '8px 12px', fontSize: '15px', textAlign: 'right', color: '#4b5563' }}>Subtotal:</td>
                                                <td style={{ padding: '8px 12px', fontSize: '15px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatCurrency(tx.amount)}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '12px 12px 8px', fontSize: '18px', textAlign: 'right', fontWeight: 700, color: '#000', borderTop: '2px solid #e5e7eb' }}>Total Paid:</td>
                                                <td style={{ padding: '12px 12px 8px', fontSize: '18px', textAlign: 'right', fontWeight: 700, color: '#000', borderTop: '2px solid #e5e7eb' }}>{formatCurrency(tx.amount)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                        <p><strong>Thank you for choosing Vastra.</strong></p>
                        <p>This is a computer-generated document and does not require a physical signature.</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="page-transition-wrapper pb-12"
        >
            {renderInvoiceOverlay()}
            <div className="bg-primary pt-12 pb-24 px-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full -ml-16 -mb-16" />
                <div className="flex items-center gap-4 relative z-10">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white/80 hover:text-white">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-display font-bold text-white tracking-tight">
                        {t('transactions.title')}
                    </h1>
                </div>
                <div className="mt-8 relative z-10">
                    <p className="text-white/80 font-medium">{t('transactions.recent_payments')}</p>
                </div>
            </div>

            <div className="px-6 -mt-12 relative z-20 space-y-6">
                <Card className="p-6 border-none shadow-card">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-display font-bold text-primary flex items-center gap-2">
                            <Receipt size={20} className="text-accent" />
                            {t('transactions.payment_history')}
                        </h2>
                        <button
                            onClick={fetchTransactions}
                            className={cn('p-2 rounded-full bg-surface-alt text-primary transition-transform', loading && 'animate-spin')}
                            disabled={loading}
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {loading && transactions.length === 0 ? (
                            <div className="py-12 flex justify-center">
                                <div className="w-8 h-8 rounded-full border-4 border-accent/30 border-t-accent animate-spin" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="py-12 flex flex-col items-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center text-text-muted">
                                    <AlertCircle size={32} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-primary">{t('transactions.no_transactions')}</p>
                                    <p className="text-xs text-text-muted mt-1">{t('transactions.no_transactions_desc')}</p>
                                </div>
                            </div>
                        ) : (
                            transactions.map((txItem) => (
                                <motion.div
                                    key={txItem.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 rounded-2xl border border-border/30 bg-surface shadow-subtle grid grid-cols-1 sm:grid-cols-[1.5fr,1fr,auto] items-center gap-4"
                                >
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="success">{t('transactions.paid')}</Badge>
                                            <span className="text-[10px] font-bold text-text-muted whitespace-nowrap">
                                                {txItem.date || safeDate(txItem.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Tag size={14} className="text-accent flex-shrink-0" />
                                            <p className="text-sm font-bold text-primary uppercase truncate">
                                                {txItem.schemeName || t('transactions.subscription_payment')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="py-3 sm:py-0 px-0 sm:px-6 border-y sm:border-y-0 sm:border-x border-border/10 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2">
                                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest opacity-60">{t('transactions.amount')}</p>
                                        <p className="text-lg font-bold text-primary leading-none">
                                            {formatCurrency(txItem.amount)}
                                        </p>
                                    </div>

                                    <div className="flex justify-end pl-0 sm:pl-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedInvoiceTx(txItem)}
                                            className="h-10 px-5 border-primary/10 text-primary hover:bg-primary hover:text-white hover:border-primary transition-all rounded-xl shadow-sm hover:shadow-md active:scale-95"
                                        >
                                            <Download size={16} className="mr-2" />
                                            {t('transactions.invoice')}
                                        </Button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </motion.div>
    );
};

export default Transactions;
