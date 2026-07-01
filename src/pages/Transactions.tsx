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

const Transactions = () => {
    const { user } = useAuth()!;
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [planMap, setPlanMap] = useState<Record<string, string>>({});

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

    const handleDownloadInvoice = (t: any) => {
        // Resolve scheme name using transaction property, then the fetched mapping
        const resolvedSchemeName = t.schemeName || planMap[t.accountId] || planMap[t.schemeId] || 'General Payment';

        const invoicePrimaryKey = t.invoicePrimaryKey || t.id;
        const paymentId = t.razorpayPaymentId || t.gatewayPaymentId || '';
        const orderId = t.razorpayOrderId || '';

        // Create an invoice structure
        const invoiceHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - ${invoicePrimaryKey}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
                    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; color: #555; }
                    .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
                    .invoice-box table td { padding: 5px; vertical-align: top; }
                    .invoice-box table tr td:nth-child(2) { text-align: right; }
                    .invoice-box table tr.top table td { padding-bottom: 20px; }
                    .invoice-box table tr.top table td.title { font-size: 45px; line-height: 45px; color: #333; }
                    .invoice-box table tr.information table td { padding-bottom: 40px; }
                    .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
                    .invoice-box table tr.details td { padding-bottom: 20px; }
                    .invoice-box table tr.item td { border-bottom: 1px solid #eee; }
                    .invoice-box table tr.item.last td { border-bottom: none; }
                    .invoice-box table tr.total td:nth-child(2) { border-top: 2px solid #eee; font-weight: bold; }
                    .text-center { text-align: center; margin-top: 40px; font-size: 12px; color: #777;}
                </style>
            </head>
            <body onload="window.print()">
                <div class="invoice-box">
                    <table>
                        <tr class="top">
                            <td colspan="2">
                                <table>
                                    <tr>
                                        <td class="title">
                                            <img src="${window.location.origin}/vasthara-logo.jpg" style="max-width: 150px;" alt="Vastra" />
                                        </td>
                                        <td>
                                            Invoice Primary Key: ${invoicePrimaryKey}<br>
                                            Reference #: ${t.referenceId || invoicePrimaryKey}<br>
                                            ${paymentId ? `Razorpay Payment ID: ${paymentId}<br>` : ''}
                                            ${orderId ? `Razorpay Order ID: ${orderId}<br>` : ''}
                                            Created: ${t.date || safeDate(t.timestamp).toLocaleDateString()}<br>
                                            Status: Paid
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr class="information">
                            <td colspan="2">
                                <table>
                                    <tr>
                                        <td>
                                            Santhosh Silks<br/>
                                            Hosur
                                        </td>
                                        <td>
                                            Username: ${user?.firstName} ${user?.lastName}<br>
                                            Phone Number: +91 ${user?.phone}<br>
                                            Email: ${user?.email || 'Not provided'}<br>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr class="heading">
                            <td>Payment Method</td>
                            <td>Amount</td>
                        </tr>
                        <tr class="details">
                            <td>${t.method || 'Razorpay'}</td>
                            <td>${formatCurrency(t.amount)}</td>
                        </tr>
                        <tr class="heading">
                            <td>Item</td>
                            <td>Price</td>
                        </tr>
                        <tr class="item last">
                            <td>Subscription Payment (${resolvedSchemeName})</td>
                            <td>${formatCurrency(t.amount)}</td>
                        </tr>
                        <tr class="total">
                            <td></td>
                            <td>Total: ${formatCurrency(t.amount)}</td>
                        </tr>
                    </table>
                    <div class="text-center">
                        <p>Thank you for choosing Vastra.</p>
                        <p>This is a computer generated invoice and does not require a physical signature.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write(invoiceHTML);
            newWindow.document.close();
        } else {
            alert('Please allow popups to download your invoice.');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="page-transition-wrapper pb-12"
        >
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
                                            onClick={() => handleDownloadInvoice(tx)}
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
