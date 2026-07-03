import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Receipt, Download, RefreshCw, Calendar, Tag, UserCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getTransactionsFromDB, getUserPlansFromDB, getSchemesFromDB } from '../services/db';
import { Badge, Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { formatCurrency, cn, safeDate, formatDate } from '../utils';
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
                // Map from accountId to schemeName
                userPlans.forEach((p: any) => {
                    mapping[p.id || p.accountId] = p.name || p.schemeName;
                });
                // Also map from schemeId for fallback
                allSchemes.forEach((s: any) => {
                    mapping[s.id] = s.name;
                });
                setPlanMap(mapping);

                // Sort by timestamp descending
                const sorted = txData.sort((a: any, b: any) => safeDate(b.timestamp).getTime() - safeDate(a.timestamp).getTime());
                setTransactions(sorted);
            } catch (err) {
                console.error("Error fetching transaction data:", err);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTransactions();
    }, [user]);

    const renderInvoiceOverlay = () => {
        if (!selectedInvoiceTx) return null;
        const t = selectedInvoiceTx;
        const resolvedSchemeName = t.schemeName || planMap[t.accountId] || planMap[t.schemeId] || 'General Payment';
        const invoicePrimaryKey = t.invoicePrimaryKey || t.id;
        const paymentId = t.razorpayPaymentId || t.gatewayPaymentId || '';

        return (
            <div className="fixed inset-0 z-[100] bg-gray-50 overflow-y-auto print:bg-white print:overflow-visible">
                <style>
                    {`
                    .invoice-container { max-width: 800px; margin: 0 auto; padding: 40px; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); background: #fff; }
                    .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; }
                    .logo-section img { max-width: 140px; height: auto; }
                    .invoice-details { text-align: right; }
                    .invoice-details h1 { margin: 0 0 10px 0; color: #111827; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
                    .details-table { margin-left: auto; text-align: right; border-collapse: collapse; }
                    .details-table td { padding: 3px 0; font-size: 13px; }
                    .details-table td.label { font-weight: 600; color: #6b7280; padding-right: 15px; }
                    .details-table td.value { font-weight: 600; color: #111827; }
                    .billing-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
                    .billing-block { width: 45%; }
                    .billing-title { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
                    .billing-content { font-size: 14px; color: #374151; }
                    .billing-content strong { color: #111827; }
                    table.items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    table.items th { background-color: #f9fafb; border-bottom: 2px solid #e5e7eb; text-align: left; padding: 12px; font-size: 13px; font-weight: 600; color: #4b5563; text-transform: uppercase; }
                    table.items th.right { text-align: right; }
                    table.items td { padding: 16px 12px; border-bottom: 1px solid #f3f4f6; font-size: 15px; color: #111827; }
                    table.items td.right { text-align: right; }
                    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
                    .totals-table { width: 300px; border-collapse: collapse; }
                    .totals-table td { padding: 8px 12px; font-size: 15px; }
                    .totals-table td.label { text-align: right; font-weight: 500; color: #4b5563; }
                    .totals-table td.amount { text-align: right; font-weight: 600; color: #111827; }
                    .totals-table tr.grand-total td { border-top: 2px solid #e5e7eb; font-size: 18px; font-weight: 700; color: #000; padding-top: 12px; }
                    .invoice-footer { text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                    .status-badge { display: inline-block; padding: 4px 12px; background-color: #dcfce7; color: #166534; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; border: 1px solid #bbf7d0; }
                    
                    @media print {
                        body * { visibility: hidden; }
                        .print-overlay, .print-overlay * { visibility: visible; }
                        .print-overlay { position: absolute; left: 0; top: 0; width: 100%; }
                        .no-print { display: none !important; }
                        .invoice-container { box-shadow: none; border: none; padding: 0; }
                    }
                    
                    @media (max-width: 640px) {
                        .invoice-container { padding: 20px; border: none; border-radius: 0; }
                        .invoice-header { flex-direction: column; align-items: center; text-align: center; }
                        .invoice-details { text-align: center; margin-top: 20px; width: 100%; }
                        .details-table { margin: 0 auto; text-align: left; }
                        .details-table td { font-size: 14px; text-align: left; padding: 4px 0; }
                        .details-table td.label { padding-right: 20px; }
                        .billing-section { flex-direction: column; gap: 24px; }
                        .billing-block { width: 100%; }
                        table.items th, table.items td { padding: 12px 8px; font-size: 13px; }
                        .totals-section { justify-content: center; }
                        .totals-table { width: 100%; }
                    }
                    `}
                </style>

                <div className="print-overlay min-h-screen bg-gray-50 pb-10 font-sans">
                    <div className="no-print max-w-[800px] mx-auto p-4 flex justify-between items-center sticky top-0 bg-gray-50 z-10 border-b shadow-sm mb-6">
                        <button onClick={() => setSelectedInvoiceTx(null)} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-bold text-sm shadow-sm hover:bg-gray-50 active:scale-95 transition-all">
                            &larr; Back
                        </button>
                        <button onClick={async () => {
                            const el = document.getElementById('invoice-pdf-content');
                            if (el) {
                                await downloadAsPDF(el, `Invoice_${invoicePrimaryKey}`);
                            }
                        }} className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-md hover:bg-primary/90 active:scale-95 transition-all">
                            <Download size={16} /> Download PDF
                        </button>
                    </div>

                    <div id="invoice-pdf-content" className="invoice-container text-gray-800">
                        <div className="invoice-header">
                            <div className="logo-section">
                                <img src="/vasthara-logo.jpg" alt="Vastra Logo" />
                            </div>
                            <div className="invoice-details">
                                <h1>INVOICE</h1>
                                <div className="status-badge">PAID</div>
                                <table className="details-table">
                                    <tbody>
                                        <tr><td className="label">Invoice No:</td><td className="value">#{invoicePrimaryKey}</td></tr>
                                        <tr><td className="label">Date:</td><td className="value">{t.date || safeDate(t.timestamp).toLocaleDateString()}</td></tr>
                                        <tr><td className="label">Reference:</td><td className="value">{t.referenceId || invoicePrimaryKey}</td></tr>
                                        {paymentId && <tr><td className="label">Gateway ID:</td><td className="value">{paymentId}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="billing-section">
                            <div className="billing-block">
                                <div className="billing-title">Billed From</div>
                                <div className="billing-content">
                                    <strong>Vastra (Santhosh Silks)</strong><br />
                                    Hosur Branch<br />
                                    Tamil Nadu, India
                                </div>
                            </div>
                            <div className="billing-block">
                                <div className="billing-title">Billed To</div>
                                <div className="billing-content">
                                    <strong>{user?.firstName || 'Customer'} {user?.lastName || ''}</strong><br />
                                    Phone: +91 {user?.phone}<br />
                                    {user?.email ? 'Email: ' + user.email : 'No email provided'}
                                </div>
                            </div>
                        </div>

                        <table className="items">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Payment Method</th>
                                    <th className="right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <strong>Subscription Payment</strong><br />
                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>Scheme: {resolvedSchemeName}</span>
                                    </td>
                                    <td>{t.method || 'Razorpay / Standard'}</td>
                                    <td className="right">{formatCurrency(t.amount)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="totals-section">
                            <table className="totals-table">
                                <tbody>
                                    <tr>
                                        <td className="label">Subtotal:</td>
                                        <td className="amount">{formatCurrency(t.amount)}</td>
                                    </tr>
                                    <tr className="grand-total">
                                        <td className="label">Total Paid:</td>
                                        <td className="amount">{formatCurrency(t.amount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="invoice-footer">
                            <p><strong>Thank you for choosing Vastra.</strong></p>
                            <p>This is a computer-generated document and does not require a physical signature.</p>
                        </div>
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
                            className={cn("p-2 rounded-full bg-surface-alt text-primary transition-transform", loading && "animate-spin")}
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
                            transactions.map((tx) => (
                                <motion.div
                                    key={tx.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 rounded-2xl border border-border/30 bg-surface shadow-subtle grid grid-cols-1 sm:grid-cols-[1.5fr,1fr,auto] items-center gap-4"
                                >
                                    {/* Left: Transaction Details */}
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="success">{t('transactions.paid')}</Badge>
                                            <span className="text-[10px] font-bold text-text-muted whitespace-nowrap">
                                                {tx.date || safeDate(tx.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Tag size={14} className="text-accent flex-shrink-0" />
                                            <p className="text-sm font-bold text-primary uppercase truncate">
                                                {tx.schemeName || t('transactions.subscription_payment')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Middle: Amount (Stacked on mobile, side-by-side on desktop) */}
                                    <div className="py-3 sm:py-0 px-0 sm:px-6 border-y sm:border-y-0 sm:border-x border-border/10 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2">
                                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest opacity-60">{t('transactions.amount')}</p>
                                        <p className="text-lg font-bold text-primary leading-none">
                                            {formatCurrency(tx.amount)}
                                        </p>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex justify-end pl-0 sm:pl-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedInvoiceTx(tx)}
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
