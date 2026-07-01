import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, HandCoins, UserCheck, Award, ChevronLeft, Search, Smartphone, CheckCircle2, XCircle, Shield, FileText, Download, Printer, List, BarChart3, AlertTriangle, PlusCircle } from 'lucide-react';
import { downloadAsPDF } from '../utils/pdfUtils';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { CreateCustomerAccount } from '../components/CreateCustomerAccount';
import { EnrollCustomer } from '../components/EnrollCustomer';
import { formatCurrency, cn, validatePhone } from '../utils';
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
    getTransactionsFromDB
} from '../services/db';
import { useNotification } from '../context/NotificationContext';

const StaffDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth()!;
    const { showNotification } = useNotification();

    // Protection: Only staff can access
    useEffect(() => {
        if (!user || user.role !== 'staff') {
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

    const [fulfillmentOTPModalOpen, setFulfillmentOTPModalOpen] = useState(false);
    const [fulfillmentOTP, setFulfillmentOTP] = useState('');
    const [fulfillmentTarget, setFulfillmentTarget] = useState<any>(null);
    const [reportSourceView, setReportSourceView] = useState<ViewState | null>(null);

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
            
            if (user?.accessLevel === 'super' || user?.accessLevel === 'manager') {
                const { getAllUsersFromDB } = await import('../services/db');
                const users = await getAllUsersFromDB();
                // Match exact branch, or include own transactions just in case
                const branchUsers = users.filter((u: any) => u.branch === user.branch).map((u: any) => u.id);
                relevantTx = allTx.filter((tx: any) => branchUsers.includes(tx.recordedBy) || tx.recordedBy === user?.id);
                
                // Attach collector's name
                relevantTx = relevantTx.map((tx: any) => {
                    const collector: any = users.find((u: any) => u.id === tx.recordedBy);
                    return { ...tx, collectedByName: collector ? `${collector.firstName} ${collector.lastName || ''}`.trim() : 'Admin/Unknown' };
                });
            } else {
                relevantTx = allTx.filter((tx: any) => tx.recordedBy === user?.id);
            }
            
            setStaffTransactions(relevantTx.sort((a: any, b: any) => b.timestamp - a.timestamp));
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };

    const handleReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPlans.length === 0) {
            showNotification("Please select at least one scheme", "error");
            return;
        }

        const amt = parseFloat(depositAmount);
        const expectedTotal = customerActiveSchemes
            .filter(s => selectedPlans.includes(s.accountId))
            .reduce((acc, s) => acc + s.monthlyAmount, 0);

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
            try {
                const { verifyOTP } = await import('../services/sms');
                const res = await verifyOTP(phone, depositOTP);
                if (!res.success) {
                    return showNotification('Invalid OTP', 'error');
                }
            } catch (err) {
                return showNotification('Error verifying OTP', 'error');
            }
        }

        setDepositOTPModalOpen(false);
        setDepositOTP('');

        try {
            const userId = depositCustomerProfile?.id || depositCustomer;
            for (const accountId of selectedPlans) {
                const s = customerActiveSchemes.find(p => p.accountId === accountId);
                if (!s) continue;

                const paid = s.monthlyAmount;
                const schemeRef = doc(db, "user_schemes", accountId);
                const nextMonthsPaid = (s.monthsPaid || 0) + 1;
                const isCompleted = nextMonthsPaid >= (s.duration || 0);
                await updateDoc(schemeRef, {
                    monthsPaid: nextMonthsPaid,
                    totalPaid: (s.totalPaid || 0) + paid,
                    status: isCompleted ? 'completed' : (s.status || 'active'),
                    completedAt: isCompleted ? new Date().toISOString() : s.completedAt,
                });

                const transactionId = await recordTransactionInDB({
                    userId: userId,
                    userName: `${depositCustomerProfile?.firstName || ''} ${depositCustomerProfile?.lastName || ''}`,
                    schemeName: s.name || s.schemeName || 'Purchase Plan',
                    accountId: accountId,
                    amount: paid,
                    type: 'deposit',
                    status: 'Success',
                    method: 'CASH',
                    recordedBy: user?.id || 'staff'
                });

                const { addAuditLog } = await import('../services/db');
                if (transactionId) {
                    await addAuditLog('MANUAL_DEPOSIT', user?.id || 'staff', {
                        phone: userId,
                        amount: paid,
                        schemeId: s.name || s.schemeName || accountId,
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
                schemes: customerActiveSchemes.filter(s => selectedPlans.includes(s.accountId)).map(s => s.name || s.schemeName),
                date: new Date().toLocaleString(),
                recordedBy: user?.firstName || 'Staff',
                transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`
            });
        } catch (error) {
            console.error(error);
            showNotification("Failed to record receipt.", "error");
        }
    };

    const handleCustomerLookup = async (id: string) => {
        setDepositCustomer(id);
        if (id.length >= 10) {
            try {
                const userProfile: any = await getUserFromDB(id);
                if (userProfile) {
                    setDepositCustomerProfile(userProfile);
                    const plansById = await getUserPlansFromDB(userProfile.id);
                    let plansByPhone: any[] = [];
                    if (userProfile.phone && userProfile.phone !== userProfile.id) {
                        plansByPhone = await getUserPlansFromDB(userProfile.phone);
                    }
                    const combinedPlans = [...plansById, ...plansByPhone];
                    const uniquePlans = combinedPlans.filter((v, i, a) => a.findIndex(t => t.accountId === v.accountId) === i);
                    
                    setCustomerActiveSchemes(uniquePlans.filter((p: any) => p.status === 'active'));
                } else {
                    setDepositCustomerProfile(null);
                    const plans = await getUserPlansFromDB(id);
                    setCustomerActiveSchemes(plans.filter((p: any) => p.status === 'active'));
                }
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

        const sum = customerActiveSchemes
            .filter(s => newSelection.includes(s.accountId))
            .reduce((acc, s) => acc + s.monthlyAmount, 0);
        setDepositAmount(sum > 0 ? sum.toString() : '');
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
            alert("Customer not found");
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
        showNotification('Generating PDF, please wait...', 'info');
        const element = document.getElementById('customer-report-content');
        if (!element) {
            showNotification('Error: Report element not found', 'error');
            return;
        }
        
        try {
            await downloadAsPDF(element, `${reportCustomer?.firstName || 'customer'}_report`);
            showNotification('PDF downloaded successfully!', 'success');
        } catch (error: any) {
            console.error("Error generating PDF:", error);
            showNotification(`Failed to generate PDF: ${error.message}`, 'error');
        }
    };

    const handleDownloadTallyCSV = () => {
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
        
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Daily_Tally_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                    <div id="receipt-container" className="bg-white rounded-2xl p-6 shadow-card border border-border/50 max-w-sm mx-auto text-center print-area">
                        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-primary mb-1">Payment Successful</h2>
                        <p className="text-xs text-text-muted mb-6">{receiptData.date}</p>
                        
                        <div className="space-y-3 text-left bg-surface p-4 rounded-xl mb-6">
                            <div className="flex justify-between border-b border-border/50 pb-2">
                                <span className="text-xs text-text-muted uppercase tracking-wider">Amount Paid</span>
                                <span className="text-sm font-bold text-primary">₹{receiptData.amount}</span>
                            </div>
                            <div className="flex justify-between border-b border-border/50 pb-2">
                                <span className="text-xs text-text-muted uppercase tracking-wider">Customer</span>
                                <span className="text-sm font-bold text-primary text-right">{receiptData.customerName}<br/><span className="text-[10px] text-text-muted">{receiptData.phone}</span></span>
                            </div>
                            <div className="flex justify-between border-b border-border/50 pb-2">
                                <span className="text-xs text-text-muted uppercase tracking-wider">Schemes</span>
                                <span className="text-[10px] font-bold text-primary text-right max-w-[50%]">{receiptData.schemes.join(', ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-text-muted uppercase tracking-wider">Txn ID</span>
                                <span className="text-xs font-mono font-bold text-primary">{receiptData.transactionId}</span>
                            </div>
                        </div>
                        
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
                    <div id="credit-note-container" className="bg-white rounded-2xl p-6 shadow-card border border-border/50 max-w-sm mx-auto text-center relative overflow-hidden print-area">
                        <div className="absolute top-4 left-4 no-print z-20">
                            <button onClick={() => setCreditNoteData(null)} className="text-primary p-2 hover:bg-surface rounded-full transition-colors">
                                <ChevronLeft size={24} />
                            </button>
                        </div>
                        {creditNoteData.duplicate && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none rotate-[-30deg]">
                                <span className="text-4xl font-black text-danger tracking-widest uppercase border-4 border-danger px-4 py-2">Duplicate Copy</span>
                            </div>
                        )}
                        <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-primary mb-1">Scheme Closed</h2>
                        <h3 className="text-md font-bold text-accent uppercase tracking-widest mb-6">Credit Note</h3>
                        <p className="text-xs text-text-muted mb-6">{creditNoteData.closedAt}</p>
                        
                        <div className="space-y-3 text-left bg-surface p-4 rounded-xl mb-6 relative z-10">
                            <div className="flex justify-between border-b border-border/50 pb-2">
                                <span className="text-xs text-text-muted uppercase tracking-wider">Total Value</span>
                                <span className="text-sm font-bold text-primary">₹{creditNoteData.totalPaid}</span>
                            </div>
                            <div className="flex justify-between border-b border-border/50 pb-2">
                                <span className="text-xs text-text-muted uppercase tracking-wider shrink-0 mr-4">Customer</span>
                                <span className="text-sm font-bold text-primary text-right">
                                    {creditNoteData.userName || 'Unknown Customer'}<br/>
                                    <span className="text-[10px] text-text-muted">{creditNoteData.userPhone || creditNoteData.userId}</span>
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-border/50 pb-2">
                                <span className="text-xs text-text-muted uppercase tracking-wider">Scheme</span>
                                <span className="text-[10px] font-bold text-primary text-right max-w-[50%]">{creditNoteData.schemeName || creditNoteData.name}</span>
                            </div>
                            {(creditNoteData.bonuses || creditNoteData.gifts) && (
                                <div className="flex flex-col border-b border-border/50 pb-2 pt-2 gap-1 text-left">
                                    <span className="text-xs text-text-muted uppercase tracking-wider">Scheme Rewards</span>
                                    {creditNoteData.bonuses && <span className="text-[10px] font-bold text-accent">Bonus: {creditNoteData.bonuses}</span>}
                                    {creditNoteData.gifts && <span className="text-[10px] font-bold text-accent">Gift: {creditNoteData.gifts}</span>}
                                </div>
                            )}
                            <div className="flex justify-between mt-2">
                                <span className="text-xs text-text-muted uppercase tracking-wider">Acct ID</span>
                                <span className="text-xs font-mono font-bold text-primary">{creditNoteData.accountId.slice(0,8)}</span>
                            </div>
                        </div>

                        {creditNoteData.transactions && creditNoteData.transactions.length > 0 && (
                            <div className="space-y-2 text-left mb-6 relative z-10 border-t border-border/50 pt-4">
                                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Transaction History</h4>
                                <div className="space-y-2 pr-2">
                                    {creditNoteData.transactions.map((tx: any) => (
                                        <div key={tx.id} className="flex justify-between items-center text-xs border-b border-border/30 pb-1 last:border-0">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-primary">{new Date(tx.timestamp).toLocaleDateString()}</span>
                                                <span className="text-[9px] text-text-muted uppercase tracking-widest">{tx.method || 'CASH'}</span>
                                            </div>
                                            <span className="font-bold text-success">₹{tx.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex gap-2 mb-3 no-print">
                            <Button fullWidth onClick={() => {
                                downloadPDF('credit-note-container', `CreditNote_${creditNoteData.accountId}`);
                            }} className="bg-primary text-white flex justify-center items-center gap-2">
                                <Download size={18} /> Save PDF
                            </Button>
                        </div>
                    </div>
                </motion.div>
            );
        }

        if (activeView === 'tally') {
            const today = new Date().toDateString();
            const todayTx = staffTransactions.filter(t => new Date(t.timestamp).toDateString() === today);
            const total = todayTx.reduce((acc, t) => acc + (t.amount || 0), 0);
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border/50 pb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary"><ChevronLeft size={24} /></button>
                            <h2 className="text-xl font-display font-bold text-primary">Today's Tally</h2>
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
                    <div id="tally-report-content" className="space-y-6">
                        <div className="bg-primary p-6 rounded-2xl text-white shadow-lg">
                        <p className="text-xs opacity-70 uppercase tracking-widest">Total Collected Today</p>
                        <p className="text-4xl font-bold">₹{total}</p>
                    </div>
                    <div className="space-y-3">
                        {todayTx.map((tx: any) => (
                            <div key={tx.id} className="p-4 bg-white rounded-xl border border-border flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold">{tx.userName}</p>
                                    <p className="text-[10px] text-gray-500">{tx.schemeName}</p>
                                    {(user?.accessLevel === 'super' || user?.accessLevel === 'manager') && (
                                        <p className="text-[9px] font-bold text-accent uppercase tracking-widest mt-1">Collected by: {tx.collectedByName}</p>
                                    )}
                                </div>
                                <p className="font-bold text-primary">₹{tx.amount}</p>
                            </div>
                        ))}
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
                                const visibleSchemes = customerActiveSchemes.filter((s: any) => {
                                    const now = new Date();
                                    const joinDate = new Date(s.joinedAt || now);
                                    const monthsElapsed = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
                                    const dueMonths = monthsElapsed - s.monthsPaid;
                                    // ONLY show schemes with remaining dues for the current month (for all staff, including managers)
                                    if (dueMonths <= 0) {
                                        return false;
                                    }
                                    return true;
                                });

                                if (visibleSchemes.length > 0) {
                                    return visibleSchemes.map((s: any) => {
                                        const now = new Date();
                                        const joinDate = new Date(s.joinedAt || now);
                                        const monthsElapsed = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
                                        const dueMonths = monthsElapsed - s.monthsPaid;
                                        const isLate = dueMonths > 1;

                                        return (
                                            <div key={s.accountId} className="space-y-2">
                                            <Card
                                                onClick={() => togglePlan(s.accountId)}
                                                className={cn(
                                                    "p-4 border-2 transition-all cursor-pointer relative overflow-hidden",
                                                    selectedPlans.includes(s.accountId) ? "border-accent bg-accent-light/30" : "border-border/50"
                                                )}
                                            >
                                                {isLate && (
                                                    <div className="absolute top-0 right-0 bg-danger text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-bl-lg z-10">
                                                        LATE ({dueMonths} MO DUE)
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                                            selectedPlans.includes(s.accountId) ? "border-accent bg-accent" : "border-border"
                                                        )}>
                                                            {selectedPlans.includes(s.accountId) && <CheckCircle2 size={14} className="text-white" />}
                                                        </div>
                                                        <div>
                                                            <h4 className={cn("font-bold text-sm", isLate ? "text-danger" : "text-primary")}>{s.name}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-primary">{formatCurrency(s.monthlyAmount)}</p>
                                                        <p className="text-[9px] font-black text-accent uppercase tracking-widest">Due</p>
                                                    </div>
                                                </div>
                                            </Card>
                                        </div>
                                    );
                                    });
                                } else if (depositCustomer.length >= 4) {
                                    return <p className="text-sm text-text-muted px-4 py-6 border border-border/50 bg-white rounded-xl text-center">All dues are paid for this month. No active pending schemes found.</p>;
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
                        confirmText="Verify & Submit"
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
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                        <button onClick={() => setActiveView('overview')} className="text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-primary">Scheme Redemptions</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-primary uppercase tracking-wider text-xs">Pending Redemptions</h3>
                        </div>
                        {completedSchemes.length === 0 ? (
                            <Card className="p-6 text-center border-dashed border-2">
                                <p className="text-sm text-text-muted">No pending redemptions found.</p>
                            </Card>
                        ) : (
                            completedSchemes.map((scheme: any) => (
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
                                                                showNotification('OTP sent to customer\'s phone', 'success');
                                                            } else {
                                                                showNotification('Failed to send OTP to customer', 'error');
                                                            }
                                                        } catch(e) {
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
                        {closedSchemes.length === 0 ? (
                            <Card className="p-6 text-center border-dashed border-2">
                                <p className="text-sm text-text-muted">No closed schemes found.</p>
                            </Card>
                        ) : (
                            closedSchemes.map((scheme: any) => (
                                <Card key={scheme.accountId} className="p-4 border-2 border-border shadow-subtle opacity-75 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-text-muted text-white text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-bl-lg">Closed</div>
                                    <div className="flex justify-between items-start mt-2">
                                        <div>
                                            <h3 className="font-bold text-primary text-sm">{scheme.schemeName || scheme.name}</h3>
                                            <p className="text-xs text-text-muted mt-1">Closed on: {scheme.closedAt ? new Date(scheme.closedAt).toLocaleDateString() : (scheme.redeemedAt ? new Date(scheme.redeemedAt).toLocaleDateString() : 'N/A')}</p>
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
                                <p className="text-sm font-bold text-primary">{foundCustomer.createdAt ? new Date(foundCustomer.createdAt).toLocaleDateString() : 'N/A'}</p>

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
                                                        <p className="text-[10px] text-text-muted">{tx.date || new Date(tx.timestamp).toLocaleDateString()}</p>
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
                                <div className="text-center pb-6 border-b border-border">
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
                                        <p className="font-bold text-text-secondary text-xs">{reportCustomer.createdAt ? new Date(reportCustomer.createdAt).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-lg font-black text-primary uppercase tracking-wider border-b border-border pb-2">Schemes & Transactions</h3>
                                    {reportSchemes.length === 0 ? (
                                        <p className="text-sm text-text-muted">No schemes found for this customer.</p>
                                    ) : (
                                        reportSchemes.map((scheme, idx) => (
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
                                                                        <p className="text-[9px] text-text-muted">{tx.date || new Date(tx.timestamp).toLocaleDateString()}</p>
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
                    <Card onClick={() => setActiveView('deposit')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                        <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center">
                            <HandCoins size={24} />
                        </div>
                        <p className="text-xs font-bold text-primary">Manual Cash Receipt</p>
                    </Card>

                    <Card onClick={() => setActiveView('create_customer')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                        <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                            <UserCheck size={24} />
                        </div>
                        <p className="text-xs font-bold text-primary">Create Customer</p>
                    </Card>

                    <Card onClick={() => setActiveView('enroll_customer')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                        <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                            <PlusCircle size={24} />
                        </div>
                        <p className="text-xs font-bold text-primary">Enroll Customer</p>
                    </Card>

                    {user?.accessLevel === 'manager' && (
                        <Card onClick={() => setActiveView('redemptions')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                            <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <p className="text-xs font-bold text-primary">Redemptions</p>
                        </Card>
                    )}

                    {user?.accessLevel === 'manager' && (
                        <Card onClick={() => setActiveView('customer_lookup')} className={cn("p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface")}>
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Search size={24} />
                            </div>
                            <p className="text-xs font-bold text-primary">Customer Lookup</p>
                        </Card>
                    )}

                    {(user?.accessLevel === 'manager' || user?.accessLevel === 'super') && (
                        <Card onClick={() => setActiveView('customer_report')} className={cn("p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface")}>
                            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                                <FileText size={24} />
                            </div>
                            <p className="text-xs font-bold text-primary">Customer Report</p>
                        </Card>
                    )}

                    {(user?.accessLevel === 'super' || user?.accessLevel === 'manager') && (
                        <Card onClick={() => { loadStaffTransactions(); setActiveView('tally'); }} className={cn("p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface")}>
                            <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                <FileText size={24} />
                            </div>
                            <p className="text-xs font-bold text-primary">Daily Cash Tally</p>
                        </Card>
                    )}



                    {user?.accessLevel === 'manager' && (
                        <Card onClick={() => setActiveView('staff_approvals')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                            <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                <Shield size={24} />
                            </div>
                            <p className="text-xs font-bold text-primary">Staff Approvals</p>
                        </Card>
                    )}

                    {user?.accessLevel === 'manager' && (
                        <>
                            <Card onClick={() => navigate('/admin?view=management&activeView=transactions')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <List size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Transactions</p>
                            </Card>
                            <Card onClick={() => navigate('/admin?view=management&activeView=analytics')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                                    <BarChart3 size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Analytics</p>
                            </Card>
                            <Card onClick={() => navigate('/admin?view=management&activeView=defaulters')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
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
                            setClosedSchemes(prev => [{...fulfillmentTarget, status: 'closed', closedAt: new Date().toISOString()}, ...prev]);
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
