import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, HandCoins, UserCheck, Award, ChevronLeft, Search, Smartphone, CheckCircle2, XCircle, Shield, FileText, Download, Printer, List, BarChart3, AlertTriangle, PlusCircle } from 'lucide-react';
import { downloadAsPDF } from '../utils/pdfUtils';
import { downloadFile, workbookToBase64 } from '../utils/download';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { CreateCustomerAccount } from '../components/CreateCustomerAccount';
import { EnrollCustomer } from '../components/EnrollCustomer';
import { formatCurrency, cn, validatePhone, safeDate, formatDate } from '../utils';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
    getSchemesFromDB,
    getUserPlansFromDB,
    recordTransactionInDB,
    getUserFromDB,
    createUserProfile,
    getStaffRequestsFromDB,
    deleteStaffRequestFromDB,
    getTransactionsFromDB,
    addAuditLog
} from '../services/db';
import { useNotification } from '../context/NotificationContext';

const StaffDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth()!;
    const { showNotification } = useNotification();

    // Protection: Only staff/managers can access
    useEffect(() => {
        if (!user || (user.role !== 'staff' && user.role !== 'manager' && user.accessLevel !== 'manager')) {
            navigate('/home');
        }
    }, [user, navigate]);

    type ViewState = 'overview' | 'deposit' | 'referrals' | 'customer_lookup' | 'customer_report' | 'staff_approvals' | 'tally' | 'redemptions' | 'create_customer' | 'enroll_customer';
    const [activeView, setActiveView] = useState<ViewState>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<any>(null);
    const [newPhone, setNewPhone] = useState('');
    const [updatePhoneOTPModalOpen, setUpdatePhoneOTPModalOpen] = useState(false);
    const [updatePhoneOTP, setUpdatePhoneOTP] = useState('');
    const [pendingStaff, setPendingStaff] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [customerPlans, setCustomerPlans] = useState<any[]>([]);
    const [customerTransactions, setCustomerTransactions] = useState<any[]>([]);
    const [staffTransactions, setStaffTransactions] = useState<any[]>([]);
    const [receiptData, setReceiptData] = useState<any>(null);

    const [depositAmount, setDepositAmount] = useState('');
    const [depositCustomer, setDepositCustomer] = useState('');
    const [depositCustomerProfile, setDepositCustomerProfile] = useState<any>(null);
    const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
    const [customerActiveSchemes, setCustomerActiveSchemes] = useState<any[]>([]);
    const [ProgramsList, setProgramsList] = useState<any[]>([]);
    const [depositOTPModalOpen, setDepositOTPModalOpen] = useState(false);
    const [depositOTP, setDepositOTP] = useState('');

    // Removed myReferredUsers and myDetailedReferrals state
    const [completedSchemes, setCompletedSchemes] = useState<any[]>([]);
    const [closedSchemes, setClosedSchemes] = useState<any[]>([]);
    const [creditNoteData, setCreditNoteData] = useState<any>(null);

    // Customer Report State
    const [reportSearchPhone, setReportSearchPhone] = useState('');
    const [reportCustomer, setReportCustomer] = useState<any>(null);
    const [reportSchemes, setReportSchemes] = useState<any[]>([]);
    const [reportTransactions, setReportTransactions] = useState<Record<string, any[]>>({});
    const [loadingReport, setLoadingReport] = useState(false);
    const [reportSchemeTab, setReportSchemeTab] = useState<'all' | 'active' | 'completed' | 'closed'>('all');
    const [tallyStartDate, setTallyStartDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [tallyEndDate, setTallyEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const [fulfillmentOTPModalOpen, setFulfillmentOTPModalOpen] = useState(false);
    const [fulfillmentOTP, setFulfillmentOTP] = useState('');
    const [fulfillmentTarget, setFulfillmentTarget] = useState<any>(null);
    
    // Add loading states for OTP actions
    const [isVerifying, setIsVerifying] = useState(false);
    const [reportSourceView, setReportSourceView] = useState<ViewState | null>(null);
    const [activeCardKey, setActiveCardKey] = useState<string | null>(null);

    const handleCardNav = (key: string, action: () => void) => {
        setActiveCardKey(key);
        setTimeout(() => {
            action();
            setActiveCardKey(null);
        }, 200);
    };


    // Referral Report State (managers only)
    const [referralReportData, setReferralReportData] = useState<any[]>([]);
    const [referralMonthStart, setReferralMonthStart] = useState(() => {
        const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
    });
    const [referralMonthEnd, setReferralMonthEnd] = useState(() => new Date().toISOString().split('T')[0]);
    const [loadingReferrals, setLoadingReferrals] = useState(false);

    // Redemptions search
    const [redemptionsSearch, setRedemptionsSearch] = useState('');

    const downloadPDF = async (elementId: string, filename: string) => {
        showNotification('Generating PDF, please wait...', 'info');
        const element = document.getElementById(elementId);
        if (!element) {
            showNotification('Error: Receipt element not found', 'error');
            return;
        }

        // Hide elements with 'no-print' class during capture
        const noPrintElements = element.querySelectorAll('.no-print');
        noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');

        // Temporarily remove max-height to ensure full content is captured
        const scrollableElements = element.querySelectorAll('.max-h-40');
        scrollableElements.forEach(el => {
            (el as HTMLElement).style.maxHeight = 'none';
            (el as HTMLElement).style.overflowY = 'visible';
        });

        try {
            await downloadAsPDF(element, filename);
            showNotification('PDF downloaded successfully!', 'success');
        } catch (error: any) {
            console.error("Error generating PDF:", error);
            showNotification(`Failed to generate PDF: ${error.message}`, 'error');
        } finally {
            noPrintElements.forEach(el => (el as HTMLElement).style.display = '');
            scrollableElements.forEach(el => {
                (el as HTMLElement).style.maxHeight = '';
                (el as HTMLElement).style.overflowY = '';
            });
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/login');
        } else {
            getSchemesFromDB().then(data => setProgramsList(data));
            // Load pending staff approvals only for super staff or manager
            if (user.accessLevel === 'super' || user.accessLevel === 'manager') {
                getStaffRequestsFromDB().then(setPendingStaff);
            }
            fetchDashboardData();
        }
    }, [user, navigate]);

    const fetchDashboardData = async () => {
        if (!user) return;
        setLoadingData(true);
        try {
            const { getAllUserPlansFromDB, getSchemesFromDB } = await import('../services/db');

            const allPlans = await getAllUserPlansFromDB();
            const schemes = await getSchemesFromDB();

            const completed = allPlans.filter((p: any) => {
                const baseScheme = schemes.find((s: any) => s.id === p.planId || s.name === p.name || s.name === p.schemeName);
                const requiredDuration = (baseScheme as any)?.duration ? Number((baseScheme as any).duration) : (Number(p.duration) || 11);
                return p.status === 'completed' || (p.status === 'active' && p.monthsPaid >= requiredDuration);
            });
            setCompletedSchemes(completed);
            const closed = allPlans.filter((p: any) => p.status === 'closed' || p.status === 'redeemed');
            setClosedSchemes(closed);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const loadStaffTransactions = async () => {
        setLoadingData(true);
        try {
            // Fetch all transactions and filter
            const allTx = await getTransactionsFromDB();
            let relevantTx = [];

            if ((user as any)?.accessLevel === 'super' || (user as any)?.accessLevel === 'manager') {
                const { getAllUsersFromDB } = await import('../services/db');
                const users: any[] = await getAllUsersFromDB();
                // Match exact branch, or include own transactions just in case
                const branchUsers = users.filter((u: any) => u.branch === (user as any)?.branch).map((u: any) => u.id);
                relevantTx = allTx.filter((tx: any) => branchUsers.includes(tx.recordedBy) || tx.recordedBy === user?.id || tx.recordedBy === 'admin' || users.find((u: any) => u.id === tx.recordedBy)?.accessLevel === 'super');

                // Attach collector's name
                relevantTx = relevantTx.map((tx: any) => {
                    const collector: any = users.find((u: any) => u.id === tx.recordedBy);
                    return { ...tx, collectedByName: collector ? `${collector.firstName} ${collector.lastName || ''}`.trim() : 'Admin/Unknown' };
                });
            } else {
                relevantTx = allTx.filter((tx: any) => tx.recordedBy === user?.id);
            }

            setStaffTransactions(relevantTx.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };

    // Auto-load tally data when switching to tally view
    useEffect(() => {
        if (activeView === 'tally') {
            loadStaffTransactions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeView]);

    const handleReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPlans.length === 0) {
            showNotification("Please select at least one scheme", "error");
            return;
        }

        const amt = parseFloat(depositAmount);
        const expectedTotal = customerActiveSchemes
            .filter(s => selectedPlans.includes(s.accountId || s.id))
            .reduce((acc, s) => acc + Number(s.monthlyAmount || s.amount || 0), 0);

        if (amt !== expectedTotal) {
            showNotification(`Amount must exactly match the selected schemes total: ₹${expectedTotal}`, "error");
            return;
        }

        const phone = depositCustomerProfile?.phone || depositCustomer;
        if (phone && phone.length >= 10) {
            showNotification('Sending OTP to customer...', 'info');
            try {
                const { sendOTP } = await import('../services/sms');
                const res = await sendOTP(phone);
                if (res.success) {
                    setDepositOTPModalOpen(true);
                    showNotification('OTP sent to customer', 'success');
                } else {
                    showNotification('Failed to send OTP to customer. Cannot proceed.', 'error');
                }
            } catch (err) {
                console.error(err);
                showNotification('Error triggering OTP.', 'error');
            }
        } else {
            showNotification("No valid phone number for OTP. Proceeding without OTP.", "warning");
            await confirmDepositWithOTP(true);
        }
    };

    const confirmDepositWithOTP = async (skipOTP = false) => {
        if (!skipOTP && (!depositOTP || depositOTP.length < 6)) {
            return showNotification('Enter valid 6-digit OTP', 'error');
        }

        const phone = depositCustomerProfile?.phone || depositCustomer;
        if (!skipOTP && phone) {
            setIsVerifying(true);
            try {
                const { verifyOTP } = await import('../services/sms');
                const res = await verifyOTP(phone, depositOTP);
                if (!res.success) {
                    setIsVerifying(false);
                    return showNotification(res.error || 'Invalid or expired OTP', 'error');
                }
            } catch (err) {
                setIsVerifying(false);
                return showNotification('Error verifying OTP', 'error');
            }
            setIsVerifying(false);
        }

        setDepositOTPModalOpen(false);
        setDepositOTP('');

        try {
            const userId = depositCustomerProfile?.id || depositCustomer;
            for (const accountId of selectedPlans) {
                const s = customerActiveSchemes.find(p => (p.accountId || p.id) === accountId);
                if (!s) continue;

                const paid = Number(s.monthlyAmount || s.amount || 0);
                const targetDocId = s.accountId || s.id || accountId;
                const schemeRef = doc(db, "user_schemes", targetDocId);
                const nextMonthsPaid = Number(s.monthsPaid || 0) + 1;
                const isCompleted = nextMonthsPaid >= Number(s.duration || 0);
                await updateDoc(schemeRef, {
                    monthsPaid: nextMonthsPaid,
                    totalPaid: (s.totalPaid || 0) + paid,
                    status: isCompleted ? 'completed' : (s.status || 'active'),
                    completedAt: isCompleted ? new Date().toISOString() : (s.completedAt || null),
                });

                const transactionId = await recordTransactionInDB({
                    userId: userId,
                    userName: `${depositCustomerProfile?.firstName || ''} ${depositCustomerProfile?.lastName || ''}`,
                    schemeName: s.name || s.schemeName || 'Purchase Plan',
                    accountId: targetDocId,
                    amount: paid,
                    type: 'deposit',
                    status: 'Success',
                    method: 'CASH',
                    recordedBy: user?.id || 'staff'
                });

                if (transactionId) {
                    await addAuditLog('MANUAL_DEPOSIT', user?.id || 'staff', {
                        phone: userId,
                        amount: paid,
                        schemeId: s.name || s.schemeName || targetDocId,
                        transactionId
                    });
                }
            }

            showNotification("Receipt recorded & customer's plan(s) updated.", "success");
            const amt = parseFloat(depositAmount);

            setReceiptData({
                customerName: `${depositCustomerProfile?.firstName || ''} ${depositCustomerProfile?.lastName || ''}`,
                customerId: depositCustomerProfile?.customerId || depositCustomerProfile?.id,
                phone: depositCustomerProfile?.phone,
                amount: amt,
                schemes: customerActiveSchemes.filter(s => selectedPlans.includes(s.accountId || s.id)).map(s => s.name || s.schemeName),
                date: new Date().toLocaleString(),
                recordedBy: user?.firstName || 'Staff',
                transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`
            });
            setSelectedPlans([]);
            setDepositAmount('');
        } catch (error: any) {
            console.error('Error recording receipt:', error);
            showNotification(`Failed to record receipt: ${error?.message || 'Unknown error'}`, "error");
        }
    };

    const handleCustomerLookup = async (id: string) => {
        setDepositCustomer(id);
        if (id.length >= 10) {
            try {
                const userProfile: any = await getUserFromDB(id);
                let schemesToSet: any[] = [];
                if (userProfile) {
                    setDepositCustomerProfile(userProfile);
                    const plansById = await getUserPlansFromDB(userProfile.id);
                    let plansByPhone: any[] = [];
                    if (userProfile.phone && userProfile.phone !== userProfile.id) {
                        plansByPhone = await getUserPlansFromDB(userProfile.phone);
                    }
                    const combinedPlans = [...plansById, ...plansByPhone];
                    const uniquePlans = combinedPlans.filter((v, i, a) => a.findIndex(t => (t.accountId || t.id) === (v.accountId || v.id)) === i);
                    schemesToSet = uniquePlans.filter((p: any) => p.status === 'active');
                } else {
                    setDepositCustomerProfile(null);
                    const plans = await getUserPlansFromDB(id);
                    schemesToSet = plans.filter((p: any) => p.status === 'active');
                }

                // For each scheme, query transactions by accountId directly (most reliable)
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const enrichedSchemes = await Promise.all(schemesToSet.map(async (p) => {
                    const targetAccId = p.accountId || p.id;
                    // Fetch transactions for this specific accountId
                    const schemeTxs = await getTransactionsFromDB(undefined, targetAccId);
                    const paidThisMonth = schemeTxs.some(t => {
                        if (t.status === 'Failed') return false;
                        const d = safeDate(t.timestamp || t.date);
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    });
                    return { ...p, paidThisMonth };
                }));

                setCustomerActiveSchemes(enrichedSchemes);
            } catch (err) {
                console.error("Error fetching customer info:", err);
            }
            setSelectedPlans([]);
            setDepositAmount('');
        } else {
            setDepositCustomerProfile(null);
            setCustomerActiveSchemes([]);
            setSelectedPlans([]);
            setDepositAmount('');
        }
    };

    const togglePlan = (accountId: string) => {
        let newSelection = [];
        if (selectedPlans.includes(accountId)) {
            newSelection = selectedPlans.filter(id => id !== accountId);
        } else {
            newSelection = [...selectedPlans, accountId];
        }
        setSelectedPlans(newSelection);

        const total = customerActiveSchemes
            .filter(s => newSelection.includes(s.accountId || s.id))
            .reduce((acc, s) => acc + Number(s.monthlyAmount || s.amount || 0), 0);
        setDepositAmount(total > 0 ? total.toString() : '');
    };

    const handleCustomerSearch = async () => {
        if (!searchQuery) return;
        setLoadingData(true);
        const res: any = await getUserFromDB(searchQuery);
        if (res) {
            setFoundCustomer(res);
            setNewPhone(res.phone || '');
            const userId = res.id;

            const plansById = await getUserPlansFromDB(userId);
            let plansByPhone: any[] = [];
            if (res.phone && res.phone !== userId) {
                plansByPhone = await getUserPlansFromDB(res.phone);
            }
            const combinedPlans = [...plansById, ...plansByPhone];
            const uniquePlans = combinedPlans.filter((v, i, a) => a.findIndex(t => t.accountId === v.accountId) === i);
            setCustomerPlans(uniquePlans);

            const txById = await getTransactionsFromDB(userId);
            let txByPhone: any[] = [];
            if (res.phone && res.phone !== userId) {
                txByPhone = await getTransactionsFromDB(res.phone);
            }
            const combinedTx = [...txById, ...txByPhone];
            const uniqueTx = combinedTx.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            setCustomerTransactions(uniqueTx.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else {
            showNotification('Customer not found', 'error');
        }
        setLoadingData(false);
    };

    const handleUpdatePhone = async () => {
        if (!newPhone) return;
        if (!validatePhone(newPhone)) {
            return showNotification("Please enter a valid 10-digit Indian phone number starting with 6-9.", 'error');
        }
        setLoadingData(true);
        try {
            const { getUserByPhone } = await import('../services/db');
            const existingUser = await getUserByPhone(newPhone);
            if (existingUser && existingUser.id !== foundCustomer?.id) {
                showNotification("This phone number is already registered to another user.", "error");
                setLoadingData(false);
                return;
            }

            const { sendOTP } = await import('../services/sms');
            const res = await sendOTP(newPhone);
            if (res.success) {
                setUpdatePhoneOTPModalOpen(true);
                showNotification("OTP sent to new phone number", 'info');
            } else {
                showNotification("Failed to send OTP", 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification("Error triggering OTP", 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const confirmUpdatePhoneWithOTP = async () => {
        if (!updatePhoneOTP || updatePhoneOTP.length < 6) {
            return showNotification('Enter valid 6-digit OTP', 'error');
        }
        setLoadingData(true);
        try {
            const { verifyOTP } = await import('../services/sms');
            const res = await verifyOTP(newPhone, updatePhoneOTP);
            if (!res.success) {
                setLoadingData(false);
                return showNotification('Invalid OTP', 'error');
            }

            const updated = { ...foundCustomer, phone: newPhone };
            await createUserProfile(updated);
            showNotification("Phone number updated successfully!", "success");
            setFoundCustomer(null);
            setSearchQuery('');
            setUpdatePhoneOTPModalOpen(false);
            setUpdatePhoneOTP('');
            setActiveView('overview');
        } catch (err) {
            showNotification("Update failed", "error");
        } finally {
            setLoadingData(false);
        }
    };

    const handleSearchCustomerReport = async (overridePhone?: string | any) => {
        const phoneToSearch = typeof overridePhone === 'string' ? overridePhone : reportSearchPhone;
        if (!phoneToSearch) return;
        setLoadingReport(true);
        try {
            const { getUserFromDB, getUserPlansFromDB, getTransactionsFromDB } = await import('../services/db');
            const customerData = await getUserFromDB(phoneToSearch);

            if (!customerData) {
                showNotification("Customer not found", 'error');
                setReportCustomer(null);
                setReportSchemes([]);
                setReportTransactions({});
                return;
            }

            setReportCustomer(customerData);

            const plans = await getUserPlansFromDB(customerData.id);
            setReportSchemes(plans);

            const txsMap: Record<string, any[]> = {};
            for (const plan of plans as any[]) {
                const txs = await getTransactionsFromDB(customerData.id, plan.accountId);
                txsMap[plan.accountId] = txs;
            }
            setReportTransactions(txsMap);

        } catch (err) {
            console.error(err);
            showNotification("Failed to fetch report data", 'error');
        } finally {
            setLoadingReport(false);
        }
    };

    const downloadReportPDF = async () => {
        if (!reportCustomer) return;
        showNotification('Generating invoice PDF...', 'info');

        try {
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

            const W = 595.28;
            const MARGIN = 40;
            const contentW = W - MARGIN * 2;
            let y = 0;

            const colors = {
                primary: [30, 90, 60] as [number, number, number],
                accent: [16, 160, 100] as [number, number, number],
                success: [22, 163, 74] as [number, number, number],
                danger: [220, 38, 38] as [number, number, number],
                muted: [100, 100, 100] as [number, number, number],
                border: [220, 220, 220] as [number, number, number],
                lightBg: [245, 250, 247] as [number, number, number],
                white: [255, 255, 255] as [number, number, number],
            };

            const addPage = () => {
                pdf.addPage();
                y = MARGIN;
            };

            const checkPageBreak = (neededHeight: number) => {
                if (y + neededHeight > 820) addPage();
            };

            // ── HEADER BAND ──────────────────────────────────────────
            pdf.setFillColor(...colors.primary);
            pdf.rect(0, 0, W, 90, 'F');

            // Brand name
            pdf.setTextColor(...colors.white);
            pdf.setFontSize(26);
            pdf.setFont('helvetica', 'bold');
            pdf.text('SANTHOSH SILKS', MARGIN, 38);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text('VASTHARA', MARGIN, 52);

            // Report label (right aligned)
            pdf.setFontSize(18);
            pdf.setFont('helvetica', 'bold');
            pdf.text('CUSTOMER STATEMENT', W - MARGIN, 35, { align: 'right' });

            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            const genDate = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
            pdf.text(`Generated: ${genDate}`, W - MARGIN, 50, { align: 'right' });

            y = 110;

            // ── CUSTOMER INFO CARD ────────────────────────────────────
            pdf.setFillColor(...colors.lightBg);
            pdf.roundedRect(MARGIN, y, contentW, 80, 6, 6, 'F');
            pdf.setDrawColor(...colors.border);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(MARGIN, y, contentW, 80, 6, 6, 'S');

            const halfW = contentW / 2;

            // Left col
            pdf.setTextColor(...colors.muted);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.text('CUSTOMER NAME', MARGIN + 12, y + 18);
            pdf.setTextColor(...colors.primary);
            pdf.setFontSize(13);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${reportCustomer.firstName || ''} ${reportCustomer.lastName || ''}`.trim(), MARGIN + 12, y + 32);

            pdf.setTextColor(...colors.muted);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.text('CUSTOMER ID', MARGIN + 12, y + 52);
            pdf.setTextColor(60, 60, 60);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(reportCustomer.customerId || reportCustomer.id || 'N/A', MARGIN + 12, y + 65);

            // Right col
            pdf.setTextColor(...colors.muted);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.text('PHONE NUMBER', MARGIN + halfW + 12, y + 18);
            pdf.setTextColor(...colors.primary);
            pdf.setFontSize(13);
            pdf.setFont('helvetica', 'bold');
            pdf.text(reportCustomer.phone || 'N/A', MARGIN + halfW + 12, y + 32);

            pdf.setTextColor(...colors.muted);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.text('JOINED DATE', MARGIN + halfW + 12, y + 52);
            pdf.setTextColor(60, 60, 60);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            const joinedDate = reportCustomer.createdAt
                ? new Date(reportCustomer.createdAt).toLocaleDateString('en-IN')
                : 'N/A';
            pdf.text(joinedDate, MARGIN + halfW + 12, y + 65);

            y += 98;

            // ── SCHEMES SECTION ───────────────────────────────────────
            const filteredSchemes = reportSchemeTab === 'all'
                ? reportSchemes
                : reportSchemes.filter(s => (s.status || 'active') === reportSchemeTab);

            filteredSchemes.forEach((scheme: any, idx: number) => {
                const schemeTxs: any[] = reportTransactions[scheme.accountId] || [];

                checkPageBreak(110);

                // Scheme header bar
                pdf.setFillColor(...colors.primary);
                pdf.roundedRect(MARGIN, y, contentW, 34, 5, 5, 'F');

                pdf.setTextColor(...colors.white);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`SCHEME ${idx + 1}`, MARGIN + 10, y + 13);

                pdf.setFontSize(12);
                pdf.text(scheme.schemeName || scheme.name || 'Scheme', MARGIN + 10, y + 27);

                // Status badge
                const status = (scheme.status || 'active').toUpperCase();
                pdf.setFillColor(...(status === 'ACTIVE' ? colors.accent : status === 'COMPLETED' ? colors.success : colors.danger));
                pdf.roundedRect(W - MARGIN - 70, y + 8, 60, 18, 4, 4, 'F');
                pdf.setTextColor(...colors.white);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.text(status, W - MARGIN - 40, y + 21, { align: 'center' });

                y += 44;

                // Scheme details row
                pdf.setFillColor(240, 248, 244);
                pdf.rect(MARGIN, y, contentW, 36, 'F');
                pdf.setDrawColor(...colors.border);
                pdf.rect(MARGIN, y, contentW, 36, 'S');

                const cols = contentW / 4;
                const schemeDetails = [
                    { label: 'MONTHLY AMOUNT', value: `Rs.${Number(scheme.monthlyAmount || scheme.amount || 0).toLocaleString('en-IN')}` },
                    { label: 'MONTHS PAID', value: `${scheme.monthsPaid || 0} / ${scheme.duration || 'N/A'}` },
                    { label: 'TOTAL PAID', value: `Rs.${Number(scheme.totalPaid || 0).toLocaleString('en-IN')}` },
                    { label: 'ENROLLED ON', value: scheme.enrollmentDate ? new Date(scheme.enrollmentDate).toLocaleDateString('en-IN') : 'N/A' },
                ];

                schemeDetails.forEach((detail, i) => {
                    const cx = MARGIN + cols * i + cols / 2;
                    pdf.setTextColor(...colors.muted);
                    pdf.setFontSize(6.5);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(detail.label, cx, y + 13, { align: 'center' });
                    pdf.setTextColor(...colors.primary);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(detail.value, cx, y + 27, { align: 'center' });
                });

                y += 46;

                // Transactions table header
                checkPageBreak(30);
                pdf.setFillColor(30, 90, 60);
                pdf.rect(MARGIN, y, contentW, 20, 'F');

                pdf.setTextColor(...colors.white);
                pdf.setFontSize(7.5);
                pdf.setFont('helvetica', 'bold');
                const txColW = [contentW * 0.08, contentW * 0.25, contentW * 0.25, contentW * 0.22, contentW * 0.20];
                const txHeaders = ['#', 'DATE', 'TYPE', 'METHOD', 'AMOUNT'];
                let cx = MARGIN;
                txHeaders.forEach((h, i) => {
                    pdf.text(h, cx + (i === 0 ? 4 : 6), y + 14);
                    cx += txColW[i];
                });
                y += 20;

                if (schemeTxs.length === 0) {
                    checkPageBreak(22);
                    pdf.setFillColor(252, 252, 252);
                    pdf.rect(MARGIN, y, contentW, 22, 'F');
                    pdf.setDrawColor(...colors.border);
                    pdf.rect(MARGIN, y, contentW, 22, 'S');
                    pdf.setTextColor(...colors.muted);
                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'italic');
                    pdf.text('No transactions recorded for this scheme.', MARGIN + contentW / 2, y + 14, { align: 'center' });
                    y += 22;
                } else {
                    schemeTxs.forEach((tx: any, txIdx: number) => {
                        checkPageBreak(22);
                        const rowBg = txIdx % 2 === 0 ? [252, 252, 252] : [242, 248, 245];
                        pdf.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
                        pdf.rect(MARGIN, y, contentW, 22, 'F');
                        pdf.setDrawColor(...colors.border);
                        pdf.rect(MARGIN, y, contentW, 22, 'S');

                        const txDate = tx.date
                            ? tx.date
                            : tx.timestamp
                            ? new Date(tx.timestamp).toLocaleDateString('en-IN')
                            : 'N/A';
                        const txType = (tx.type || 'Cash Receipt').replace(/_/g, ' ');
                        const txMethod = tx.method || 'CASH';
                        const txAmt = `Rs.${Number(tx.amount || 0).toLocaleString('en-IN')}`;

                        const rowData = [`${txIdx + 1}`, txDate, txType, txMethod, txAmt];
                        let rxc = MARGIN;
                        rowData.forEach((val, i) => {
                            pdf.setTextColor(i === 4 ? colors.success[0] : 50, i === 4 ? colors.success[1] : 50, i === 4 ? colors.success[2] : 50);
                            pdf.setFontSize(8);
                            pdf.setFont('helvetica', i === 4 ? 'bold' : 'normal');
                            pdf.text(String(val), rxc + (i === 0 ? 4 : 6), y + 15);
                            rxc += txColW[i];
                        });

                        y += 22;
                    });

                    // Scheme total row
                    const schemeTotal = schemeTxs.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
                    checkPageBreak(26);
                    pdf.setFillColor(...colors.accent);
                    pdf.rect(MARGIN, y, contentW, 24, 'F');
                    pdf.setTextColor(...colors.white);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('SCHEME TOTAL', MARGIN + 8, y + 16);
                    pdf.text(`Rs.${schemeTotal.toLocaleString('en-IN')}`, W - MARGIN - 6, y + 16, { align: 'right' });
                    y += 24;
                }

                y += 18; // spacing between schemes
            });

            // ── GRAND TOTAL ───────────────────────────────────────────
            checkPageBreak(50);
            const grandTotal = Object.values(reportTransactions).flat().reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
            pdf.setFillColor(...colors.primary);
            pdf.roundedRect(MARGIN, y, contentW, 40, 6, 6, 'F');
            pdf.setTextColor(...colors.white);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('GRAND TOTAL PAID', MARGIN + 14, y + 26);
            pdf.setFontSize(16);
            pdf.text(`Rs.${grandTotal.toLocaleString('en-IN')}`, W - MARGIN - 14, y + 26, { align: 'right' });
            y += 56;

            // ── FOOTER ────────────────────────────────────────────────
            checkPageBreak(40);
            pdf.setDrawColor(...colors.border);
            pdf.setLineWidth(0.5);
            pdf.line(MARGIN, y, W - MARGIN, y);
            y += 12;
            pdf.setTextColor(...colors.muted);
            pdf.setFontSize(7.5);
            pdf.setFont('helvetica', 'normal');
            pdf.text('This is a computer-generated statement. No signature required.', W / 2, y, { align: 'center' });
            pdf.text('Santhosh Silks — VASTHARA Customer Report', W / 2, y + 12, { align: 'center' });

            // Page numbers
            const pageCount = pdf.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(7);
                pdf.setTextColor(...colors.muted);
                pdf.text(`Page ${i} of ${pageCount}`, W - MARGIN, 841.89 - 20, { align: 'right' });
            }

            const filename = `${reportCustomer.firstName || 'customer'}_statement_${new Date().toISOString().split('T')[0]}.pdf`;
            const { downloadFile } = await import('../utils/download');
            const base64Data = pdf.output('datauristring').split(',')[1];
            await downloadFile(base64Data, filename, 'application/pdf', true);

            showNotification('Invoice PDF downloaded!', 'success');
        } catch (error: any) {
            console.error('Error generating PDF:', error);
            showNotification(`Failed to generate PDF: ${error.message}`, 'error');
        }
    };

    const handleDownloadTallyCSV = async () => {
        const today = new Date().toDateString();
        const todayTx = staffTransactions.filter(t => new Date(t.timestamp).toDateString() === today);
        if (todayTx.length === 0) return showNotification("No transactions today", "error");

        const headers = ["Transaction ID", "Customer Name", "Customer Phone", "Amount", "Scheme Name", "Date"];
        const rows = todayTx.map(tx => [
            tx.id,
            `"${tx.userName}"`,
            tx.userPhone || 'N/A',
            tx.amount,
            `"${tx.schemeName}"`,
            new Date(tx.timestamp).toLocaleString()
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        await downloadFile(csvContent, `Daily_Tally_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv', false);
    };


    const handleStaffAction = async (id: string, action: 'approve' | 'reject') => {
        setLoadingData(true);
        if (action === 'approve') {
            const request = pendingStaff.find(s => s.id === id);
            if (request) {
                const tempPassword = request.password;
                const tempPin = Math.floor(1000 + Math.random() * 9000).toString();

                const { addAuditLog } = await import('../services/db');

                await createUserProfile({
                    phone: request.phone,
                    firstName: request.name.split(' ')[0] || request.name,
                    lastName: request.name.split(' ').slice(1).join(' ') || '',
                    branch: request.branch,
                    role: 'staff',
                    password: tempPassword,
                    pin: tempPin,
                    status: 'active'
                });

                await addAuditLog('STAFF_CREATION', user?.id || 'super_staff', {
                    staffId: request.phone,
                    name: request.name
                });

                showNotification(`Staff account created for ${request.name}. Temp PIN: ${tempPin}`, 'success');
            }
        }
        await deleteStaffRequestFromDB(id.toString());
        setPendingStaff(pendingStaff.filter(staff => staff.id !== id));
        if (action === 'reject') {
            showNotification(`Staff request rejected.`, 'info');
        }
        setLoadingData(false);
    };

    const renderView = () => {
        if (receiptData) {
            return (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="flex gap-2 mb-3 no-print">
                            <Button fullWidth onClick={() => {
                                window.print();
                            }} variant="outline" className="flex justify-center items-center gap-2">
                                <Printer size={18} /> Print
                            </Button>
                            <Button fullWidth onClick={() => {
                                downloadPDF('receipt-container', `Receipt_${receiptData.transactionId}`);
                            }} className="bg-primary text-white flex justify-center items-center gap-2">
                                <Download size={18} /> Save PDF
                            </Button>
                        </div>

                        <div id="receipt-container" className="bg-white p-6 border border-gray-300 font-sans text-gray-900 print-area max-w-sm mx-auto shadow-sm">
                            <div className="text-center border-b-2 border-gray-900 pb-4 mb-4 flex flex-col items-center">
                                <img src="/vasthara-logo.jpg" alt="Vastra Logo" className="w-24 h-auto object-contain mix-blend-multiply mb-2 block" />
                                <h1 className="text-xl font-black text-gray-900 uppercase tracking-widest">SANTOSH INSTYLE VASTRA</h1>
                                <p className="text-xs font-semibold text-gray-600 mt-1 uppercase tracking-wider">Official Cash Receipt</p>
                            </div>

                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</p>
                                    <p className="font-bold text-gray-900 text-sm">{receiptData.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Txn ID</p>
                                    <p className="font-mono font-bold text-gray-900 text-xs">{receiptData.transactionId}</p>
                                </div>
                            </div>

                            <div className="border border-gray-300 p-4 mb-6">
                                <div className="border-b border-gray-200 pb-2 mb-2 flex justify-between items-start gap-4">
                                    <span className="text-xs font-bold text-gray-600 uppercase shrink-0">Received From</span>
                                    <div className="text-right break-words max-w-[65%]">
                                        <span className="font-bold text-gray-900 text-sm block">{receiptData.customerName}</span>
                                        <span className="text-[10px] font-bold text-gray-500 block mt-0.5">{receiptData.phone}</span>
                                    </div>
                                </div>
                                <div className="border-b border-gray-200 pb-2 mb-2 flex justify-between items-start gap-4">
                                    <span className="text-xs font-bold text-gray-600 uppercase shrink-0">For Scheme(s)</span>
                                    <span className="text-xs font-bold text-gray-900 text-right max-w-[65%] break-words">{receiptData.schemes.join(', ')}</span>
                                </div>
                                <div className="pt-2 flex justify-between items-center">
                                    <span className="text-sm font-black text-gray-900 uppercase tracking-wider">Amount Paid</span>
                                    <span className="text-xl font-black text-green-700">₹{receiptData.amount}</span>
                                </div>
                            </div>

                            <div className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest pt-4 border-t border-gray-300">
                                This is a computer generated receipt and does not require a physical signature.
                            </div>
                        </div>

                        <Button fullWidth onClick={() => {
                            setReceiptData(null);
                            setSelectedPlans([]);
                            setDepositAmount('');
                            setDepositCustomer('');
                            setDepositCustomerProfile(null);
                            setCustomerActiveSchemes([]);
                            setActiveView('overview');
                        }} className="no-print">Done</Button>
                    </div>
                </motion.div>
            );
        }

        if (creditNoteData) {
            return (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="flex justify-between items-center no-print">
                            <button onClick={() => setCreditNoteData(null)} className="text-primary p-2 hover:bg-surface rounded-full transition-colors flex items-center gap-2">
                                <ChevronLeft size={24} /> <span className="font-bold text-sm">Back</span>
                            </button>
                            <div className="flex gap-2">
                                <Button onClick={() => window.print()} variant="outline" size="sm" className="flex justify-center items-center gap-2">
                                    <Printer size={16} /> Print
                                </Button>
                                <Button onClick={() => downloadPDF('credit-note-container', `CreditNote_${creditNoteData.accountId}`)} size="sm" className="bg-primary text-white flex justify-center items-center gap-2">
                                    <Download size={16} /> Save PDF
                                </Button>
                            </div>
                        </div>

                        <div id="credit-note-container" className="bg-white p-6 border border-gray-300 font-sans text-gray-900 print-area max-w-sm mx-auto shadow-sm relative overflow-hidden">
                            {creditNoteData.duplicate && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none rotate-[-45deg] z-0">
                                    <span className="text-6xl font-black text-gray-900 tracking-widest uppercase">DUPLICATE</span>
                                </div>
                            )}

                            <div className="relative z-10">
                                <div className="text-center border-b-2 border-gray-900 pb-4 mb-4 flex flex-col items-center">
                                    <img src="/vasthara-logo.jpg" alt="Vastra Logo" className="w-24 h-auto object-contain mix-blend-multiply mb-2 block" />
                                    <h1 className="text-xl font-black text-gray-900 uppercase tracking-widest">SANTOSH INSTYLE VASTRA</h1>
                                    <p className="text-xs font-semibold text-gray-600 mt-1 uppercase tracking-wider">Official Credit Note</p>
                                </div>

                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Closure Date</p>
                                        <p className="font-bold text-gray-900 text-sm">{creditNoteData.closedAt}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Account ID</p>
                                        <p className="font-mono font-bold text-gray-900 text-xs">{creditNoteData.accountId.slice(0, 12)}...</p>
                                    </div>
                                </div>

                                <div className="border border-gray-300 p-4 mb-6">
                                    <div className="border-b border-gray-200 pb-2 mb-2 flex justify-between items-start gap-4">
                                        <span className="text-xs font-bold text-gray-600 uppercase shrink-0">Customer</span>
                                        <div className="text-right break-words max-w-[65%]">
                                            <span className="font-bold text-gray-900 text-sm block">{creditNoteData.userName || 'Unknown Customer'}</span>
                                            <span className="text-[10px] font-bold text-gray-500 block mt-0.5">{creditNoteData.userPhone || creditNoteData.userId}</span>
                                        </div>
                                    </div>
                                    <div className="border-b border-gray-200 pb-2 mb-2 flex justify-between items-start gap-4">
                                        <span className="text-xs font-bold text-gray-600 uppercase shrink-0">Scheme</span>
                                        <span className="text-xs font-bold text-gray-900 text-right max-w-[65%] break-words">{creditNoteData.schemeName || creditNoteData.name}</span>
                                    </div>

                                    {(creditNoteData.bonuses || creditNoteData.gifts) && (
                                        <div className="border-b border-gray-200 pb-2 mb-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Bonuses & Gifts</span>
                                            <div className="flex flex-col gap-1 text-right">
                                                {creditNoteData.bonuses && <span className="text-xs font-bold text-gray-900">Bonus: {creditNoteData.bonuses}</span>}
                                                {creditNoteData.gifts && <span className="text-xs font-bold text-gray-900">Gift: {creditNoteData.gifts}</span>}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-2 flex justify-between items-center">
                                        <span className="text-sm font-black text-gray-900 uppercase tracking-wider">Total Value</span>
                                        <span className="text-xl font-black text-gray-900">₹{creditNoteData.totalPaid}</span>
                                    </div>
                                </div>

                                {creditNoteData.transactions && creditNoteData.transactions.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Transaction Ledger</h4>
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-100 text-gray-600">
                                                <tr>
                                                    <th className="py-1.5 px-2 font-bold uppercase tracking-wider">Date</th>
                                                    <th className="py-1.5 px-2 font-bold uppercase tracking-wider">Method</th>
                                                    <th className="py-1.5 px-2 font-bold uppercase tracking-wider text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {creditNoteData.transactions.map((tx: any) => (
                                                    <tr key={tx.id}>
                                                        <td className="py-1.5 px-2 font-medium text-gray-900">{formatDate(tx.timestamp)}</td>
                                                        <td className="py-1.5 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{tx.method || 'CASH'}</td>
                                                        <td className="py-1.5 px-2 font-bold text-gray-900 text-right">₹{tx.amount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest pt-4 border-t border-gray-300 mt-6">
                                    This is a computer generated statement and does not require a physical signature.
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            );
        }

        if (activeView === 'tally') {
            const start = new Date(tallyStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(tallyEndDate);
            end.setHours(23, 59, 59, 999);

            const rangeTx = staffTransactions.filter(t => {
                const txDate = new Date(t.timestamp);
                return txDate >= start && txDate <= end;
            });
            const total = rangeTx.reduce((acc, t) => acc + (t.amount || 0), 0);
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border/50 pb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary"><ChevronLeft size={24} /></button>
                            <h2 className="text-xl font-display font-bold text-primary">Cash Tally</h2>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => downloadPDF('tally-report-content', 'Daily_Tally_Report')} className="p-2 text-accent bg-accent/10 rounded-xl hover:bg-accent/20 transition-all flex items-center gap-2 text-xs font-bold">
                                <Printer size={18} />
                                <span className="hidden sm:inline">PDF</span>
                            </button>
                            <button onClick={handleDownloadTallyCSV} className="p-2 text-accent bg-accent/10 rounded-xl hover:bg-accent/20 transition-all flex items-center gap-2 text-xs font-bold">
                                <Download size={18} />
                                <span className="hidden sm:inline">CSV</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 bg-surface p-4 rounded-xl border border-border">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wider">From Date</label>
                            <input
                                type="date"
                                value={tallyStartDate}
                                onChange={(e) => setTallyStartDate(e.target.value)}
                                className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wider">To Date</label>
                            <input
                                type="date"
                                value={tallyEndDate}
                                onChange={(e) => setTallyEndDate(e.target.value)}
                                className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    <div id="tally-report-content" className="space-y-6">
                        <div className="text-center pb-4 flex flex-col items-center">
                            <img src="/vasthara-logo.jpg" alt="Vastra Logo" className="w-24 h-auto object-contain mix-blend-multiply mb-2 block" />
                            <h2 className="text-xl font-black text-primary uppercase tracking-wider">Daily Cash Tally</h2>
                            <p className="text-xs text-text-muted mt-1">{tallyStartDate} to {tallyEndDate}</p>
                        </div>
                        <div className="bg-primary p-6 rounded-2xl text-white shadow-lg">
                            <p className="text-xs opacity-70 uppercase tracking-widest">Total Collected</p>
                            <p className="text-4xl font-bold">₹{total}</p>
                        </div>
                        <div className="space-y-3">
                            {rangeTx.length === 0 ? (
                                <p className="text-center text-text-muted py-8">No transactions found for this date range.</p>
                            ) : (
                                rangeTx.map((tx: any) => (
                                    <div key={tx.id} className="p-4 bg-white rounded-xl border border-border flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-bold">{tx.userName}</p>
                                            <p className="text-[10px] text-gray-500">{tx.schemeName}</p>
                                            {(user?.accessLevel === 'super' || user?.accessLevel === 'manager') && (
                                                <p className="text-[9px] font-bold text-accent uppercase tracking-widest mt-1">Collected by: {tx.collectedByName || 'Admin'}</p>
                                            )}
                                        </div>
                                        <p className="font-bold text-primary">₹{tx.amount}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </motion.div>
            );
        }

        if (activeView === 'deposit') {
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                        <button onClick={() => setActiveView('overview')} className="text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-primary">Manual Cash Receipt</h2>
                    </div>
                    <form onSubmit={handleReceipt} className="space-y-4">
                        <Input
                            label="Customer Phone"
                            placeholder="e.g. 9876543210"
                            required
                            value={depositCustomer}
                            onChange={(e) => handleCustomerLookup(e.target.value)}
                        />

                        {depositCustomerProfile && (
                            <div className="bg-success-light/20 border border-success/30 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                                    <UserCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-success uppercase tracking-widest">Verified Customer</p>
                                    <p className="font-bold text-primary">{depositCustomerProfile.firstName} {depositCustomerProfile.lastName}</p>
                                    {depositCustomerProfile.customerId && (
                                        <p className="text-xs text-text-muted mt-1 font-mono">ID: {depositCustomerProfile.customerId}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Target Schemes</label>
                            {(() => {
                                if (customerActiveSchemes.length > 0) {
                                    return customerActiveSchemes.map((s: any) => {
                                        const targetAccId = s.accountId || s.id;
                                        const totalDuration = Number(s.duration) || 11;
                                        const paidCount = Number(s.monthsPaid) || 0;
                                        const remainingMonths = totalDuration - paidCount;

                                        return (
                                            <div key={targetAccId} className="space-y-2">
                                                <Card
                                                    onClick={() => {
                                                        if (!s.paidThisMonth) togglePlan(targetAccId);
                                                        else showNotification("Payment for this month already recorded. Missed dues are extended.", "warning");
                                                    }}
                                                    className={cn(
                                                        "p-4 border-2 transition-all relative overflow-hidden",
                                                        !s.paidThisMonth ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                                                        selectedPlans.includes(targetAccId) ? "border-accent bg-accent-light/30" : "border-border/50"
                                                    )}
                                                >
                                                    {s.paidThisMonth ? (
                                                        <div className="absolute top-0 right-0 bg-success text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-bl-lg z-10">
                                                            PAID THIS MONTH
                                                        </div>
                                                    ) : (
                                                        <div className="absolute top-0 right-0 bg-warning text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-bl-lg z-10">
                                                            DUE THIS MONTH
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center mt-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                                                selectedPlans.includes(targetAccId) ? "border-accent bg-accent" : "border-border"
                                                            )}>
                                                                {selectedPlans.includes(targetAccId) && <CheckCircle2 size={14} className="text-white" />}
                                                            </div>
                                                            <div>
                                                                <h4 className={cn("font-bold text-sm", !s.paidThisMonth ? "text-primary" : "text-success")}>{s.name || s.schemeName || 'Scheme'}</h4>
                                                                <p className="text-[10px] text-text-muted mt-0.5">{paidCount} Paid • {remainingMonths > 0 ? `${remainingMonths} Mo Remaining` : 'Completed'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-primary">{formatCurrency(Number(s.monthlyAmount || s.amount || 0))}</p>
                                                            <p className="text-[9px] font-black text-accent uppercase tracking-widest">Per Month</p>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </div>
                                        );
                                    });
                                } else if (depositCustomer.length >= 4) {
                                    return (
                                        <div className="p-6 border rounded-xl border-dashed flex flex-col items-center justify-center text-center">
                                            <p className="text-sm text-text-muted">No active schemes found for this customer.</p>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        <Input label="Total Cash Collected (₹)" type="number" required value={depositAmount} readOnly />
                        <Button fullWidth className="mt-4 bg-success text-white" type="submit">Submit Cash Collection</Button>
                    </form>

                    <ConfirmModal
                        isOpen={depositOTPModalOpen}
                        title="Confirm Cash Deposit"
                        message="An OTP has been sent to the customer's registered mobile number. Please ask the customer for the OTP and enter it below to confirm this manual cash deposit."
                        onConfirm={() => confirmDepositWithOTP(false)}
                        onCancel={() => {
                            setDepositOTPModalOpen(false);
                            setDepositOTP('');
                        }}
                    >
                        <div className="mt-4">
                            <Input
                                label="Enter 6-digit OTP"
                                value={depositOTP}
                                onChange={(e) => setDepositOTP(e.target.value.replace(/\D/g, ''))}
                                maxLength={6}
                                placeholder="123456"
                                className="text-center tracking-widest text-xl font-bold"
                            />
                        </div>
                    </ConfirmModal>
                </motion.div>
            );
        }


        if (activeView === 'redemptions') {
            const filteredPendingSchemes = completedSchemes.filter((scheme: any) => {
                if (!redemptionsSearch) return true;
                const q = redemptionsSearch.toLowerCase();
                return (
                    (scheme.customerId || '').toLowerCase().includes(q) ||
                    (scheme.userId || '').toLowerCase().includes(q) ||
                    (scheme.schemeName || scheme.name || '').toLowerCase().includes(q)
                );
            });
            const filteredClosedSchemes = closedSchemes.filter((scheme: any) => {
                if (!redemptionsSearch) return true;
                const q = redemptionsSearch.toLowerCase();
                return (
                    (scheme.customerId || '').toLowerCase().includes(q) ||
                    (scheme.userId || '').toLowerCase().includes(q) ||
                    (scheme.schemeName || scheme.name || '').toLowerCase().includes(q)
                );
            });

            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                        <button onClick={() => setActiveView('overview')} className="text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-primary">Scheme Redemptions</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="mb-4">
                            <Input
                                icon={Search}
                                placeholder="Search by Customer ID, Phone or Scheme..."
                                value={redemptionsSearch}
                                onChange={e => setRedemptionsSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-primary uppercase tracking-wider text-xs">Pending Redemptions</h3>
                        </div>
                        {filteredPendingSchemes.length === 0 ? (
                            <Card className="p-6 text-center border-dashed border-2">
                                <p className="text-sm text-text-muted">{redemptionsSearch ? 'No pending redemptions matching your search.' : 'No pending redemptions found.'}</p>
                            </Card>
                        ) : (
                            filteredPendingSchemes.map((scheme: any) => (
                                <Card key={scheme.accountId} className="p-4 border-2 border-warning/30 shadow-subtle relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-warning text-white text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-bl-lg">Pending</div>
                                    <div className="flex justify-between items-start mt-2">
                                        <div>
                                            <h3 className="font-bold text-primary text-sm">{scheme.schemeName || scheme.name}</h3>
                                            <p className="text-xs text-text-muted mt-1">Months Paid: {scheme.monthsPaid}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-success">₹{scheme.totalPaid}</p>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mt-1">Value</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-border flex flex-col justify-between items-start gap-3">
                                        <p className="text-[10px] text-text-muted break-all uppercase tracking-wider">Customer ID: <span className="font-mono text-[10px] font-bold text-primary">{scheme.customerId || scheme.userId}</span></p>
                                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                                            <button
                                                onClick={() => {
                                                    setReportSourceView('redemptions');
                                                    setReportSearchPhone(scheme.userId);
                                                    handleSearchCustomerReport(scheme.userId);
                                                    setActiveView('customer_report');
                                                }}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-bold rounded-lg text-center"
                                            >
                                                View Report
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const userProfile: any = await import('../services/db').then(m => m.getUserFromDB(scheme.userId));
                                                    if (!userProfile || !userProfile.phone) {
                                                        showNotification('Customer phone number not found. Cannot send OTP.', 'error');
                                                        return;
                                                    }
                                                    setLoadingData(true);
                                                    try {
                                                        const { sendOTP } = await import('../services/sms');
                                                        const result = await sendOTP(userProfile.phone);
                                                        if (result.success) {
                                                            setFulfillmentTarget(scheme);
                                                            setFulfillmentOTP('');
                                                            setFulfillmentOTPModalOpen(true);
                                                            showNotification(`OTP sent to ${userProfile.phone}`, 'info');
                                                        } else {
                                                            showNotification('Failed to send OTP to customer', 'error');
                                                        }
                                                    } catch (e) {
                                                        showNotification('Error sending OTP', 'error');
                                                    } finally {
                                                        setLoadingData(false);
                                                    }
                                                }}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-success text-white hover:bg-success/90 transition-colors text-xs font-bold rounded-lg text-center"
                                            >
                                                Process Fulfillment
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}

                        <div className="flex justify-between items-center mt-8 mb-2">
                            <h3 className="font-bold text-primary uppercase tracking-wider text-xs">Closed / Fulfilled Schemes</h3>
                        </div>
                        {filteredClosedSchemes.length === 0 ? (
                            <Card className="p-6 text-center border-dashed border-2">
                                <p className="text-sm text-text-muted">{redemptionsSearch ? 'No closed schemes matching your search.' : 'No closed schemes found.'}</p>
                            </Card>
                        ) : (
                            filteredClosedSchemes.map((scheme: any) => (
                                <Card key={scheme.accountId} className="p-4 border-2 border-border shadow-subtle opacity-75 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-text-muted text-white text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-bl-lg">Closed</div>
                                    <div className="flex justify-between items-start mt-2">
                                        <div>
                                            <h3 className="font-bold text-primary text-sm">{scheme.schemeName || scheme.name}</h3>
                                            <p className="text-xs text-text-muted mt-1">Closed on: {scheme.closedAt ? formatDate(scheme.closedAt) : (scheme.redeemedAt ? formatDate(scheme.redeemedAt) : 'N/A')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-text-secondary">₹{scheme.totalPaid}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                                        <p className="text-xs text-text-muted">Customer ID: {scheme.customerId || scheme.userId}</p>
                                        <button
                                            onClick={async () => {
                                                const { getTransactionsFromDB, getUserFromDB } = await import('../services/db');
                                                const txs = await getTransactionsFromDB(scheme.userId, scheme.accountId);
                                                const userProfile: any = await getUserFromDB(scheme.userId);
                                                setCreditNoteData({
                                                    ...scheme,
                                                    transactions: txs,
                                                    duplicate: true,
                                                    userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Unknown Customer',
                                                    userPhone: userProfile ? userProfile.phone : scheme.userId,
                                                    closedAt: scheme.closedAt ? new Date(scheme.closedAt).toLocaleString() : (scheme.redeemedAt ? new Date(scheme.redeemedAt).toLocaleString() : 'N/A')
                                                });
                                            }}
                                            className="px-4 py-2 bg-surface border border-border text-primary text-xs font-bold rounded-lg hover:bg-border/30 transition-colors"
                                        >
                                            Print Credit Note
                                        </button>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </motion.div>
            );
        }

        if (activeView === 'customer_lookup') {
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                        <button onClick={() => setActiveView('overview')} className="text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-primary">Customer Profile Update</h2>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter Customer Phone"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <button
                            onClick={handleCustomerSearch}
                            className="bg-primary text-white p-3 rounded-xl"
                        >
                            <Search size={20} />
                        </button>
                    </div>

                    {foundCustomer && (
                        <Card className="p-6 space-y-6 border-none shadow-card">
                            <div className="space-y-1">
                                <h3 className="font-bold text-primary">{foundCustomer.firstName} {foundCustomer.lastName}</h3>
                                {foundCustomer.customerId && (
                                    <p className="text-xs text-text-muted font-mono">ID: {foundCustomer.customerId}</p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-border space-y-1">
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Mobile Number</p>
                                <p className="text-sm font-bold text-primary flex items-center gap-2">
                                    <Smartphone size={14} /> {foundCustomer.phone}
                                </p>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-2">Join Date</p>
                                <p className="text-sm font-bold text-primary">{foundCustomer.createdAt ? formatDate(foundCustomer.createdAt) : 'N/A'}</p>

                                <div className="mt-6 pt-4 border-t border-border space-y-4">
                                    <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Active Subscriptions</h4>
                                    {customerPlans.length > 0 ? (
                                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                            {customerPlans.map((plan: any) => (
                                                <div key={plan.accountId} className="p-3 border border-border/50 rounded-xl bg-surface">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="font-bold text-sm text-primary">{plan.name || plan.schemeName}</p>
                                                        <span className={cn("text-[10px] font-black uppercase px-2 py-1 rounded", plan.status === 'completed' ? "bg-success/10 text-success" : "bg-accent/10 text-accent")}>{plan.status}</span>
                                                    </div>
                                                    <p className="text-xs text-text-muted">Paid: {plan.monthsPaid || 0}/{plan.duration} months (₹{plan.totalPaid || 0})</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-text-muted">No subscriptions found.</p>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-border space-y-4">
                                    <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Recent Transactions</h4>
                                    {customerTransactions.length > 0 ? (
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                            {customerTransactions.map((tx: any) => (
                                                <div key={tx.id} className="p-3 border border-border/50 rounded-xl bg-surface flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-sm text-primary">₹{tx.amount}</p>
                                                        <p className="text-[10px] text-text-muted">{tx.schemeName || 'Payment'} • {tx.type}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-success uppercase">{tx.status}</p>
                                                        <p className="text-[10px] text-text-muted">{tx.date || formatDate(tx.timestamp)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-text-muted">No transactions found.</p>
                                    )}
                                </div>

                                {(user?.accessLevel === 'manager' || user?.accessLevel === 'super') ? (
                                    <div className="mt-6 pt-4 border-t border-border space-y-4">
                                        <h4 className="text-xs font-black text-danger uppercase tracking-[0.2em]">Update Details</h4>
                                        <Input
                                            label="New Phone Number"
                                            icon={Smartphone}
                                            value={newPhone}
                                            onChange={e => setNewPhone(e.target.value)}
                                        />
                                        <Button fullWidth onClick={handleUpdatePhone} loading={loadingData}>Update Mobile</Button>

                                        <ConfirmModal
                                            isOpen={updatePhoneOTPModalOpen}
                                            title="Verify New Mobile Number"
                                            message={`An OTP has been sent to ${newPhone}. Please enter it below to confirm the update.`}
                                            onConfirm={confirmUpdatePhoneWithOTP}
                                            onCancel={() => {
                                                setUpdatePhoneOTPModalOpen(false);
                                                setUpdatePhoneOTP('');
                                            }}
                                            confirmText="Verify & Update"
                                        >
                                            <div className="mt-4">
                                                <Input
                                                    label="Enter 6-digit OTP"
                                                    value={updatePhoneOTP}
                                                    onChange={(e) => setUpdatePhoneOTP(e.target.value.replace(/\D/g, ''))}
                                                    maxLength={6}
                                                    placeholder="123456"
                                                    className="text-center tracking-widest text-xl font-bold"
                                                />
                                            </div>
                                        </ConfirmModal>
                                    </div>
                                ) : (
                                    <div className="mt-6 pt-4 border-t border-border">
                                        <p className="text-[10px] text-text-muted mt-1">Contact admin to change phone number.</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </motion.div>
            );
        }

        if (activeView === 'customer_report' && (user?.accessLevel === 'manager' || user?.accessLevel === 'super')) {
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                        <button onClick={() => { setActiveView(reportSourceView || 'overview'); setReportSourceView(null); }} className="text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-primary">Customer Report</h2>
                    </div>

                    <Card className="p-6 border-none shadow-card bg-white">
                        <h3 className="text-sm font-bold text-primary mb-4">Search Customer</h3>
                        <div className="flex gap-2">
                            <Input
                                icon={Search}
                                placeholder="Enter Phone Number..."
                                value={reportSearchPhone}
                                onChange={e => setReportSearchPhone(e.target.value)}
                                maxLength={10}
                            />
                            <Button
                                onClick={handleSearchCustomerReport}
                                loading={loadingReport}
                                className="shrink-0 h-12"
                            >
                                Search
                            </Button>
                        </div>
                    </Card>

                    {reportCustomer && (
                        <div className="space-y-6 relative">
                            <div className="absolute top-0 right-0 z-10 flex gap-2">
                                <Button onClick={downloadReportPDF} size="sm">
                                    <Download size={16} className="mr-2" /> Download PDF
                                </Button>
                            </div>
                            <div id="customer-report-content" className="bg-white p-6 rounded-2xl shadow-card space-y-6">
                                <div className="text-center pb-6 border-b border-border flex flex-col items-center">
                                    <img src="/vasthara-logo.jpg" alt="Vastra Logo" className="w-24 h-auto object-contain mix-blend-multiply mb-2 block" />
                                    <h2 className="text-2xl font-black text-primary uppercase tracking-wider">Customer Report</h2>
                                    <p className="text-xs text-text-muted mt-1">Generated on {new Date().toLocaleString()}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-surface p-4 rounded-xl border border-border">
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Customer Name</p>
                                        <p className="font-bold text-primary text-lg">{reportCustomer.firstName} {reportCustomer.lastName || ''}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Phone Number</p>
                                        <p className="font-bold text-primary text-lg">{reportCustomer.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Customer ID</p>
                                        <p className="font-bold text-text-secondary text-xs break-all">{reportCustomer.customerId || reportCustomer.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Joined Date</p>
                                        <p className="font-bold text-text-secondary text-xs">{reportCustomer.createdAt ? formatDate(reportCustomer.createdAt) : 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 border-b border-border pb-3">
                                        <h3 className="text-lg font-black text-primary uppercase tracking-wider">Schemes & Transactions</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(['all', 'active', 'completed', 'closed'] as const).map(tab => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setReportSchemeTab(tab)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${reportSchemeTab === tab ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-primary'}`}
                                                >
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {reportSchemes.length === 0 ? (
                                        <p className="text-sm text-text-muted">No schemes found for this customer.</p>
                                    ) : (
                                        (reportSchemeTab === 'all' ? reportSchemes : reportSchemes.filter(s => (s.status || 'active') === reportSchemeTab)).map((scheme, idx) => (
                                            <div key={scheme.accountId} className="border-2 border-border rounded-xl p-4 space-y-4 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl">
                                                    {scheme.status || 'Active'}
                                                </div>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Scheme {idx + 1}</p>
                                                        <h4 className="font-bold text-primary text-lg">{scheme.schemeName || scheme.name}</h4>
                                                    </div>
                                                    <div className="text-right mt-1">
                                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Total Paid</p>
                                                        <p className="font-black text-success text-lg">₹{scheme.totalPaid || 0}</p>
                                                    </div>
                                                </div>

                                                {(scheme.bonuses || scheme.gifts) && (
                                                    <div className="pt-2 pb-2 bg-accent/5 rounded-lg px-3 border border-accent/20">
                                                        <p className="text-[10px] font-black text-accent uppercase tracking-wider mb-1">Scheme Rewards</p>
                                                        <div className="flex flex-col gap-0.5">
                                                            {scheme.bonuses && <p className="text-xs font-bold text-primary">• {scheme.bonuses}</p>}
                                                            {scheme.gifts && <p className="text-xs font-bold text-primary">• {scheme.gifts}</p>}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-3 border-t border-border">
                                                    <p className="text-xs font-bold text-primary mb-3">Transactions for this Scheme</p>
                                                    {reportTransactions[scheme.accountId] && reportTransactions[scheme.accountId].length > 0 ? (
                                                        <div className="space-y-2">
                                                            {reportTransactions[scheme.accountId].map((tx: any) => (
                                                                <div key={tx.id} className="flex justify-between items-center p-2 bg-surface rounded-lg border border-border/50 text-xs">
                                                                    <div>
                                                                        <p className="font-bold text-primary">₹{tx.amount}</p>
                                                                        <p className="text-[9px] text-text-muted">{tx.date || formatDate(tx.timestamp)}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="font-bold text-success uppercase text-[9px]">{tx.status}</p>
                                                                        <p className="text-[9px] text-text-muted">{tx.type || 'Manual Cash Receipt'}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-text-muted italic">No transactions found.</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            );
        }

        if (activeView === 'staff_approvals' && (user?.accessLevel === 'super' || user?.accessLevel === 'manager')) {
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                        <button onClick={() => setActiveView('overview')} className="text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-primary">Staff Approvals</h2>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Pending Requests</h3>
                        {pendingStaff.length === 0 ? (
                            <p className="text-sm text-text-muted py-4">No pending requests.</p>
                        ) : (
                            pendingStaff.map((staff) => (
                                <Card key={staff.id} className="p-4 border-none shadow-subtle flex justify-between items-center bg-white">
                                    <div>
                                        <p className="text-sm font-bold text-primary">{staff.name}</p>
                                        <p className="text-[10px] text-text-muted">Requested Branch: {staff.branch}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button disabled={loadingData} onClick={() => handleStaffAction(staff.id, 'approve')} className="p-2 bg-success/10 text-success rounded-xl hover:bg-success/20 transition-all disabled:opacity-50">
                                            <CheckCircle2 size={18} />
                                        </button>
                                        <button disabled={loadingData} onClick={() => handleStaffAction(staff.id, 'reject')} className="p-2 bg-danger/10 text-danger rounded-xl hover:bg-danger/20 transition-all disabled:opacity-50">
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </motion.div>
            );
        }

        if (activeView === 'create_customer') {
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                        <button onClick={() => setActiveView('overview')} className="text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-primary">Create Customer</h2>
                    </div>
                    <CreateCustomerAccount />
                </motion.div>
            );
        }

        if (activeView === 'enroll_customer') {
            return (
                <EnrollCustomer onBack={() => setActiveView('overview')} />
            );
        }

        // ====== REFERRAL REPORT VIEW ======
        if (activeView === 'referrals') {
            const handleFetchReferralReport = async () => {
                if (!referralMonthStart || !referralMonthEnd) return;
                setLoadingReferrals(true);
                try {
                    const { collection, getDocs, query } = await import('firebase/firestore');
                    const { db } = await import('../firebase');
                    const { getAllUsersFromDB } = await import('../services/db');
                    const snap = await getDocs(query(collection(db, 'user_schemes')));
                    const allUsers: any[] = await getAllUsersFromDB();
                    const userMap: Record<string, any> = {};
                    allUsers.forEach((u: any) => { userMap[u.id] = u; if (u.phone) userMap[u.phone] = u; });
                    const staffMap: Record<string, any> = {};
                    allUsers.filter((u: any) => u.role === 'staff').forEach((s: any) => {
                        if (s.empId) staffMap[s.empId] = s;
                        staffMap[s.id] = s;
                    });
                    const start = new Date(referralMonthStart);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(referralMonthEnd);
                    end.setHours(23, 59, 59, 999);
                    const results: any[] = [];
                    snap.forEach((doc) => {
                        const data = doc.data();
                        const refCode = data.referralCode || data.referralEmpId;
                        if (!refCode) return;
                        const dateStr = data.enrollmentDate || data.joinedAt || data.enrolledAt || data.createdAt;
                        const joinedAt = dateStr ? safeDate(dateStr) : null;
                        if (!joinedAt || isNaN(joinedAt.getTime()) || joinedAt < start || joinedAt > end) return;
                        const enrollee = userMap[data.userId] || {};
                        const referrer = staffMap[refCode] || {};
                        const masterScheme = ProgramsList.find((s: any) =>
                            s.id === data.planId || s.name === data.name || s.name === data.schemeName
                        );
                        const incentiveAmt = Number(masterScheme?.referralIncentive || data.referralIncentive || 0);
                        results.push({
                            schemeId: doc.id, schemeName: data.schemeName || data.name || '',
                            enrolleeName: `${enrollee.firstName || ''} ${enrollee.lastName || ''}`.trim() || data.userId,
                            enrolleePhone: enrollee.phone || data.userId,
                            enrolledAt: formatDate(joinedAt),
                            referrerEmpId: refCode,
                            referrerName: referrer.firstName ? `${referrer.firstName} ${referrer.lastName || ''}`.trim() : refCode,
                            amount: data.amount || data.monthlyAmount || 0,
                            incentiveAmt,
                        });
                    });
                    setReferralReportData(results);
                    if (results.length === 0) showNotification('No referrals found for this date range.', 'info');
                } catch (e) {
                    showNotification('Failed to fetch referral data', 'error');
                } finally {
                    setLoadingReferrals(false);
                }
            };

            const handleExportExcel = async () => {
                if (!referralReportData.length) return;
                const XLSX = await import('xlsx');
                const headers = ['Scheme ID', 'Scheme Name', 'Enrollee Name', 'Enrollee Phone', 'Enrolled Date', 'Referrer EMP ID', 'Referrer Name', 'Monthly Amount (₹)', 'Incentive Earned (₹)'];
                const rows = referralReportData.map(r => [r.schemeId, r.schemeName, r.enrolleeName, r.enrolleePhone, r.enrolledAt, r.referrerEmpId, r.referrerName, r.amount, r.incentiveAmt]);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Referral Details');
                const summary: Record<string, { name: string; count: number; total: number; incentiveTotal: number }> = {};
                referralReportData.forEach(r => {
                    if (!summary[r.referrerEmpId]) summary[r.referrerEmpId] = { name: r.referrerName, count: 0, total: 0, incentiveTotal: 0 };
                    summary[r.referrerEmpId].count++;
                    summary[r.referrerEmpId].total += Number(r.amount);
                    summary[r.referrerEmpId].incentiveTotal += Number(r.incentiveAmt);
                });
                const sumRows = Object.entries(summary).map(([id, v]) => [id, v.name, v.count, v.total, v.incentiveTotal]);
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Emp ID', 'Name', 'Total Referrals', 'Total Monthly Value (₹)', 'Total Incentive Earned (₹)'], ...sumRows]), 'Summary');
                const base64Data = workbookToBase64(wb, XLSX);
                await downloadFile(base64Data, `Incentive_Report_${referralMonthStart}_to_${referralMonthEnd}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true);
            };

            const empSummary: Record<string, { name: string; count: number; total: number; incentiveTotal: number }> = {};
            referralReportData.forEach(r => {
                if (!empSummary[r.referrerEmpId]) empSummary[r.referrerEmpId] = { name: r.referrerName, count: 0, total: 0, incentiveTotal: 0 };
                empSummary[r.referrerEmpId].count++;
                empSummary[r.referrerEmpId].total += Number(r.amount);
                empSummary[r.referrerEmpId].incentiveTotal += Number(r.incentiveAmt);
            });

            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border/50 pb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary"><ChevronLeft size={24} /></button>
                            <h2 className="text-xl font-display font-bold text-primary">Incentive Referral Report</h2>
                        </div>
                        {referralReportData.length > 0 && (
                            <button onClick={handleExportExcel} className="p-2 text-accent bg-accent/10 rounded-xl hover:bg-accent/20 transition-all flex items-center gap-2 text-xs font-bold">
                                <Download size={18} /> <span className="hidden sm:inline">Export Excel</span>
                            </button>
                        )}
                    </div>

                    <div className="bg-accent/10 p-4 rounded-xl flex items-start gap-3">
                        <Users className="text-accent flex-shrink-0" size={20} />
                        <p className="text-xs text-accent font-bold">Shows all scheme enrollments where a staff referral code was used, filtered by enrollment date range. Use this to calculate incentive bonuses.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 bg-surface p-4 rounded-xl border border-border items-end">
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wider">From Date</label>
                            <input type="date" value={referralMonthStart} onChange={e => setReferralMonthStart(e.target.value)} className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wider">To Date</label>
                            <input type="date" value={referralMonthEnd} onChange={e => setReferralMonthEnd(e.target.value)} className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                        </div>
                        <div className="w-full sm:w-auto mt-2 sm:mt-0">
                            <Button onClick={handleFetchReferralReport} loading={loadingReferrals} className="w-full sm:w-auto">
                                <Search size={16} className="mr-2" /> Fetch Report
                            </Button>
                        </div>
                    </div>

                    {referralReportData.length > 0 && (
                        <>
                            <div className="space-y-2">
                                <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Summary by Employee ({Object.keys(empSummary).length} staff)</h3>
                                {Object.entries(empSummary).map(([empId, s]) => (
                                    <Card key={empId} className="p-4 border-none shadow-subtle bg-white">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-primary text-sm">{s.name}</p>
                                                <p className="text-[10px] text-text-muted mt-0.5">EMP ID: {empId}</p>
                                                <p className="text-[10px] text-text-muted mt-0.5">{s.count} referral{s.count !== 1 ? 's' : ''} • ₹{s.total.toLocaleString()}/mo value</p>
                                            </div>
                                            <div className="text-right">
                                                {s.incentiveTotal > 0 ? (
                                                    <>
                                                        <p className="text-lg font-black text-success">₹{s.incentiveTotal.toLocaleString()}</p>
                                                        <p className="text-[10px] text-text-muted uppercase tracking-widest">Incentive Earned</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-lg font-bold text-accent">{s.count}</p>
                                                        <p className="text-[10px] text-text-muted uppercase tracking-widest">Referrals</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] mt-4">Detailed Enrollments ({referralReportData.length})</h3>
                                {referralReportData.map((r, idx) => (
                                    <Card key={r.schemeId || idx} className="p-4 border-none shadow-subtle bg-white">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-primary text-sm">{r.enrolleeName}</p>
                                                <p className="text-[10px] text-text-muted mt-0.5">{r.enrolleePhone} • {r.schemeName}</p>
                                                <p className="text-[10px] text-text-muted">Enrolled: {r.enrolledAt}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-accent">Ref: {r.referrerName}</p>
                                                <p className="text-[10px] text-text-muted">EMP: {r.referrerEmpId}</p>
                                                <p className="text-sm font-bold text-success">₹{r.amount}/mo</p>
                                                {r.incentiveAmt > 0 && (
                                                    <p className="text-[10px] font-bold text-success mt-0.5">+₹{r.incentiveAmt} incentive</p>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                    {referralReportData.length === 0 && !loadingReferrals && (
                        <p className="text-sm text-center text-text-muted py-8">Select a date range and click "Fetch Report" to load incentive data.</p>
                    )}
                </motion.div>
            );
        }

        // ====== DEFAULT: OVERVIEW ======
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex items-start gap-4 border-b border-border/50 pb-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary mt-1">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <UserCheck className="text-accent" size={24} />
                            <div>
                                <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Staff Console</h1>
                                <p className="text-[10px] font-black text-accent uppercase tracking-widest mt-0.5">
                                    {user?.accessLevel === 'manager' ? 'Branch Manager' : user?.accessLevel === 'super' ? 'Super Staff' : 'Standard Staff'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Staff Stats */}
                <div className="bg-primary rounded-2xl p-6 text-white relative overflow-hidden shadow-card">
                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Award size={20} className="text-[#D4AF37]" />
                                <div>
                                    <h4 className="font-display font-bold text-lg">Hello, {user?.firstName || 'Staff'}</h4>
                                    <p className="text-xs text-white/90 mt-1.5 tracking-wide flex items-center">
                                        Emp ID (Referral Code):
                                        <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded ml-2 text-white border border-white/30 shadow-sm">
                                            {user?.empId || user?.phone || 'NOT ASSIGNED'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <Card loading={activeCardKey === 'deposit'} onClick={() => handleCardNav('deposit', () => setActiveView('deposit'))} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                        <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center">
                            <HandCoins size={24} />
                        </div>
                        <p className="text-xs font-bold text-primary">Manual Cash Receipt</p>
                    </Card>

                    <Card loading={activeCardKey === 'create_customer'} onClick={() => handleCardNav('create_customer', () => setActiveView('create_customer'))} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                        <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                            <UserCheck size={24} />
                        </div>
                        <p className="text-xs font-bold text-primary">Create Customer</p>
                    </Card>

                    <Card loading={activeCardKey === 'enroll_customer'} onClick={() => handleCardNav('enroll_customer', () => setActiveView('enroll_customer'))} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                        <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                            <PlusCircle size={24} />
                        </div>
                        <p className="text-xs font-bold text-primary">Enroll Customer</p>
                    </Card>

                    {user?.accessLevel === 'manager' && (
                        <Card loading={activeCardKey === 'redemptions'} onClick={() => handleCardNav('redemptions', () => setActiveView('redemptions'))} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                            <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <p className="text-xs font-bold text-primary">Redemptions</p>
                        </Card>
                    )}

                    {user?.accessLevel === 'manager' && (
                        <Card loading={activeCardKey === 'customer_lookup'} onClick={() => handleCardNav('customer_lookup', () => setActiveView('customer_lookup'))} className={cn("p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface")}>
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Search size={24} />
                            </div>
                            <p className="text-xs font-bold text-primary">Customer Lookup</p>
                        </Card>
                    )}

                    {(user?.accessLevel === 'manager' || user?.accessLevel === 'super') && (
                        <Card loading={activeCardKey === 'customer_report'} onClick={() => handleCardNav('customer_report', () => setActiveView('customer_report'))} className={cn("p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface")}>
                            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                                <FileText size={24} />
                            </div>
                            <p className="text-xs font-bold text-primary">Customer Report</p>
                        </Card>
                    )}

                    {(user?.accessLevel === 'super' || user?.accessLevel === 'manager') && (
                        <Card loading={activeCardKey === 'tally'} onClick={() => handleCardNav('tally', () => { loadStaffTransactions(); setActiveView('tally'); })} className={cn("p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface")}>
                            <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                <FileText size={24} />
                            </div>
                            <p className="text-xs font-bold text-primary">Daily Cash Tally</p>
                        </Card>
                    )}

                    <Card loading={activeCardKey === 'referrals'} onClick={() => handleCardNav('referrals', () => { setReferralReportData([]); setActiveView('referrals'); })} className={cn("p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface col-span-2")}>
                        <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <p className="text-xs font-bold text-primary">Incentive Referral Report</p>
                    </Card>

                    {user?.accessLevel === 'manager' && (
                        <Card loading={activeCardKey === 'staff_approvals'} onClick={() => handleCardNav('staff_approvals', () => setActiveView('staff_approvals'))} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                            <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                <Shield size={24} />
                            </div>
                            <p className="text-xs font-bold text-primary">Staff Approvals</p>
                        </Card>
                    )}

                    {user?.accessLevel === 'manager' && (
                        <>
                            <Card loading={activeCardKey === 'admin_tx'} onClick={() => handleCardNav('admin_tx', () => navigate('/admin?view=management&activeView=transactions'))} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <List size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Transactions</p>
                            </Card>
                            <Card loading={activeCardKey === 'admin_analytics'} onClick={() => handleCardNav('admin_analytics', () => navigate('/admin?view=management&activeView=analytics'))} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                                    <BarChart3 size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Analytics</p>
                            </Card>
                            <Card loading={activeCardKey === 'admin_defaulters'} onClick={() => handleCardNav('admin_defaulters', () => navigate('/admin?view=management&activeView=defaulters'))} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                                    <AlertTriangle size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Defaulters</p>
                            </Card>
                        </>
                    )}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="page-transition-wrapper p-6 pb-24">
            <ConfirmModal
                isOpen={fulfillmentOTPModalOpen}
                title="Process Fulfillment Verification"
                message="An OTP has been sent to the customer's registered mobile number. Please ask the customer for the OTP and enter it below to confirm fulfillment."
                confirmText={loadingData ? "Verifying..." : "Verify & Fulfill"}
                type="danger"
                onConfirm={async () => {
                    if (!fulfillmentOTP || fulfillmentOTP.length !== 6) {
                        showNotification('Please enter a valid 6-digit OTP', 'error');
                        return;
                    }
                    if (!fulfillmentTarget) return;

                    setLoadingData(true);
                    try {
                        const userProfile: any = await import('../services/db').then(m => m.getUserFromDB(fulfillmentTarget.userId));
                        const { markSchemeAsRedeemed, getTransactionsFromDB } = await import('../services/db');
                        const { verifyOTP } = await import('../services/sms');

                        const isOtpValid = await verifyOTP(userProfile.phone, fulfillmentOTP);
                        if (!isOtpValid) {
                            showNotification('Invalid or expired OTP', 'error');
                            setLoadingData(false);
                            return;
                        }

                        const success = await markSchemeAsRedeemed(fulfillmentTarget.accountId, user!.id);
                        if (success) {
                            const txs = await getTransactionsFromDB(fulfillmentTarget.userId, fulfillmentTarget.accountId);
                            showNotification('Scheme marked as closed and fulfilled!', 'success');
                            setCompletedSchemes(prev => prev.filter(p => p.accountId !== fulfillmentTarget.accountId));
                            setClosedSchemes(prev => [{ ...fulfillmentTarget, status: 'closed', closedAt: new Date().toISOString() }, ...prev]);
                            setCreditNoteData({
                                ...fulfillmentTarget,
                                transactions: txs,
                                duplicate: false,
                                userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Unknown Customer',
                                userPhone: userProfile ? userProfile.phone : fulfillmentTarget.userId,
                                closedAt: new Date().toLocaleString()
                            });
                            setFulfillmentOTPModalOpen(false);
                            setFulfillmentTarget(null);
                        } else {
                            showNotification('Failed to fulfill scheme', 'error');
                        }
                    } catch (error) {
                        showNotification('Error verifying OTP', 'error');
                    } finally {
                        setLoadingData(false);
                    }
                }}
                onCancel={() => {
                    setFulfillmentOTPModalOpen(false);
                    setFulfillmentOTP('');
                    setFulfillmentTarget(null);
                }}
            >
                <div className="mt-4">
                    <Input
                        label="Enter 6-digit OTP"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={fulfillmentOTP}
                        onChange={(e) => setFulfillmentOTP(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                    />
                </div>
            </ConfirmModal>
            <AnimatePresence mode="wait">
                {renderView()}
            </AnimatePresence>
        </div>
    );
};

export default StaffDashboard;
