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
import { downloadAsSinglePagePDF } from '../utils/pdfUtils';

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
        const invoiceDate = tx.date || safeDate(tx.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

        return (
            <div className="fixed inset-0 z-[100] bg-gray-100 overflow-y-auto flex flex-col items-center">
                {/* Action bar — not captured in PDF */}
                <div style={{ width: '100%', maxWidth: '794px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
                    <button
                        onClick={() => setSelectedInvoiceTx(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                    >
                        ← Back
                    </button>
                    <button
                        id="invoice-download-btn"
                        onClick={async () => {
                            const btn = document.getElementById('invoice-download-btn') as HTMLButtonElement;
                            if (btn) { btn.textContent = 'Generating…'; btn.disabled = true; }
                            const el = document.getElementById('invoice-pdf-content');
                            if (el) {
                                try { await downloadAsSinglePagePDF(el, 'Invoice_' + invoicePrimaryKey); }
                                catch (e) { console.error(e); }
                            }
                            if (btn) { btn.innerHTML = '⬇ Download PDF'; btn.disabled = false; }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                    >
                        <Download size={16} /> Download PDF
                    </button>
                </div>

                {/*
                  A4 page: 794px × 1123px at 96 dpi.
                  All content must fit inside this box — no scrolling inside the PDF element.
                  padding: 48px sides, 40px top/bottom keeps content in the printable area.
                */}
                <div
                    id="invoice-pdf-content"
                    style={{
                        width: '794px',
                        minWidth: '794px',
                        maxWidth: '794px',
                        height: '1123px',
                        minHeight: '1123px',
                        maxHeight: '1123px',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        padding: '40px 48px',
                        background: '#ffffff',
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        color: '#111827',
                        display: 'flex',
                        flexDirection: 'column',
                        margin: '16px 0 24px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    }}
                >
                    {/* ── Header stripe ── */}
                    <div style={{ background: '#1e3a5f', margin: '-40px -48px 0', padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <img src="/vasthara-logo.jpg" alt="Vastra Logo" style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '8px', background: 'white', padding: '4px' }} />
                            <div>
                                <div style={{ color: 'white', fontSize: '18px', fontWeight: 900, letterSpacing: '0.5px', lineHeight: 1.2 }}>SANTOSH INSTYLE VASTRA</div>
                                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', marginTop: '2px' }}>Hosur Branch · Tamil Nadu, India</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'white', fontSize: '28px', fontWeight: 900, letterSpacing: '2px' }}>INVOICE</div>
                            <div style={{ display: 'inline-block', marginTop: '6px', padding: '3px 14px', background: '#22c55e', color: 'white', borderRadius: '999px', fontSize: '11px', fontWeight: 800, letterSpacing: '1px' }}>✓ PAID</div>
                        </div>
                    </div>

                    {/* ── Invoice meta ── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', marginBottom: '24px' }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '3px 20px 3px 0', color: '#6b7280', fontWeight: 600 }}>Invoice No</td>
                                    <td style={{ padding: '3px 0', color: '#111827', fontWeight: 700 }}>#{invoicePrimaryKey}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '3px 20px 3px 0', color: '#6b7280', fontWeight: 600 }}>Date</td>
                                    <td style={{ padding: '3px 0', color: '#111827', fontWeight: 700 }}>{invoiceDate}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '3px 20px 3px 0', color: '#6b7280', fontWeight: 600 }}>Reference</td>
                                    <td style={{ padding: '3px 0', color: '#111827', fontWeight: 700 }}>{tx.referenceId || invoicePrimaryKey}</td>
                                </tr>
                                {paymentId && (
                                    <tr>
                                        <td style={{ padding: '3px 20px 3px 0', color: '#6b7280', fontWeight: 600 }}>Gateway ID</td>
                                        <td style={{ padding: '3px 0', color: '#111827', fontWeight: 700 }}>{paymentId}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Divider ── */}
                    <div style={{ height: '1px', background: '#e5e7eb', marginBottom: '24px' }} />

                    {/* ── Billing ── */}
                    <div style={{ display: 'flex', gap: '32px', marginBottom: '28px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Billed From</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Vastra (Santhosh Silks)</div>
                            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
                                Hosur Branch<br />
                                Tamil Nadu, India
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Billed To</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                                {user?.firstName || 'Customer'} {user?.lastName || ''}
                            </div>
                            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
                                +91 {user?.phone}<br />
                                {user?.email || 'No email provided'}
                            </div>
                        </div>
                    </div>

                    {/* ── Items table ── */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb' }}>
                                <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>Description</th>
                                <th style={{ padding: '11px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>Payment Method</th>
                                <th style={{ padding: '11px 14px', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '18px 14px', borderBottom: '1px solid #f3f4f6' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>Subscription Payment</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>Scheme: {resolvedSchemeName}</div>
                                </td>
                                <td style={{ padding: '18px 14px', textAlign: 'center', fontSize: '13px', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{tx.method || 'Razorpay / Standard'}</td>
                                <td style={{ padding: '18px 14px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(tx.amount)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ── Totals ── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0', marginBottom: '24px' }}>
                        <div style={{ width: '260px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '13px', color: '#4b5563', borderBottom: '1px solid #f3f4f6' }}>
                                <span>Subtotal</span>
                                <span style={{ fontWeight: 600 }}>{formatCurrency(tx.amount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', fontSize: '16px', fontWeight: 800, color: '#111827', background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                                <span>Total Paid</span>
                                <span style={{ color: '#166534' }}>{formatCurrency(tx.amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Spacer pushes footer to bottom ── */}
                    <div style={{ flex: 1 }} />

                    {/* ── Footer ── */}
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '18px', textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a5f', marginBottom: '4px' }}>Thank you for choosing Vastra.</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>This is a computer-generated document and does not require a physical signature.</div>
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
