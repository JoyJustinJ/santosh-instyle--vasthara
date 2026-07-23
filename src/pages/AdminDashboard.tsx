import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import {
    ChevronLeft, HandCoins, CheckCircle, XCircle, Edit2, Save, X, Search, Smartphone, LogOut, LayoutDashboard, User, BarChart2, Download, AlertTriangle, Megaphone, ShieldAlert, Clock, Plus, FileText, Landmark, Trash2, Users, Shield, Printer, UserCheck, PlusCircle
} from 'lucide-react';
import { downloadAsPDF } from '../utils/pdfUtils';
import { downloadFile, workbookToBase64 } from '../utils/download';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import Home from './Home';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Notification, NotificationType } from '../components/UI/Notification';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { NumericKeypad } from '../components/UI/NumericKeypad';
import { CreateCustomerAccount } from '../components/CreateCustomerAccount';
import { EnrollCustomer } from '../components/EnrollCustomer';
import { formatCurrency, cn, formatDate, safeDate } from '../utils';
import { useAuth } from '../context/AuthContext';
import {
    getSchemesFromDB,
    getStaffRequestsFromDB,
    saveSchemeToDB,
    deleteSchemeFromDB,
    deleteStaffRequestFromDB,
    recordTransactionInDB,
    getAdminSettings,
    updateAdminSettings,
    getUserPlansFromDB,
    getTransactionsFromDB,
    getAllUsersFromDB,
    createUserProfile,
    getUserFromDB,
    getAllAdminsFromDB,
    deleteAdminFromDB,
    getAllUserPlansFromDB,
    addNotificationToDB,
    broadcastNotificationsToDB,
    getAuditLogsFromDB,
    resetApplicationData
} from '../services/db';
import { useNotification } from '../context/NotificationContext';
import { db } from '../firebase';

import { doc, updateDoc } from 'firebase/firestore';

type ViewState = 'overview' | 'create_scheme' | 'manage_schemes' | 'deposit' | 'transactions' | 'staff' | 'staff_mgmt' | 'customer_update' | 'customer_report' | 'settings' | 'analytics' | 'defaulters' | 'broadcast' | 'audit_logs' | 'redemptions' | 'create_customer' | 'enroll_customer' | 'tally' | 'referral_report';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user, isBiometricEnabled: contextBiometricEnabled } = useAuth()!;
    const [viewMode, setViewMode] = useState<'personal' | 'management'>(() => {
        const params = new URLSearchParams(location.search);
        return params.get('view') === 'management' ? 'management' : 'personal';
    });
    const [activeView, setActiveView] = useState<ViewState>(() => {
        const params = new URLSearchParams(location.search);
        const viewFromUrl = params.get('activeView');
        if (viewFromUrl && viewFromUrl !== 'management' && viewFromUrl !== 'personal') {
            return viewFromUrl as ViewState;
        }
        return 'overview';
    });
    const { showNotification } = useNotification();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const mode = params.get('view') === 'management' ? 'management' : 'personal';
        if (mode !== viewMode) setViewMode(mode);

        const viewFromUrl = params.get('activeView');
        if (viewFromUrl && viewFromUrl !== 'management' && viewFromUrl !== 'personal') {
            setActiveView(viewFromUrl as ViewState);
        }
    }, [location.search]);

    const handleBack = () => {
        const params = new URLSearchParams(location.search);
        if (params.get('activeView') && user?.role !== 'admin') {
            navigate('/staff');
        } else {
            setActiveView('overview');
        }
    };

    // DB State
    const [ProgramsList, setProgramsList] = useState<any[]>([]);
    const [pendingStaff, setPendingStaff] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [newScheme, setNewScheme] = useState({ name: '', duration: '', amount: '', bonuses: '', gifts: '', referralIncentive: '' });
    const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositCustomer, setDepositCustomer] = useState('');
    const [depositOTPModalOpen, setDepositOTPModalOpen] = useState(false);
    const [depositOTP, setDepositOTP] = useState('');
    const [depositMonthsConfig, setDepositMonthsConfig] = useState<Record<string, number>>({});
    const [customerActiveSchemes, setCustomerActiveSchemes] = useState<any[]>([]);
    const [incentiveRange, setIncentiveRange] = useState({ start: '', end: '' });
    const [transactionReport, setTransactionReport] = useState<any[]>([]);

    const [notification, setNotification] = useState<{ message: string, type: NotificationType } | null>(null);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [adminSettings, setAdminSettings] = useState({ adminId: '', password: '', securityPin: '' });
    const [newAdmin, setNewAdmin] = useState({ adminId: '', password: '', securityPin: '' });
    const [showAddAdmin, setShowAddAdmin] = useState(false);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [editingStaff, setEditingStaff] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<any>(null);
    const [newPhone, setNewPhone] = useState('');
    const [customerPlans, setCustomerPlans] = useState<any[]>([]);
    const [customerTransactions, setCustomerTransactions] = useState<any[]>([]);
    const [showCustomerReport, setShowCustomerReport] = useState(false);
    const [isPrimaryAdmin] = useState(() => localStorage.getItem('is_primary_admin') === 'true');
    const [adminsList, setAdminsList] = useState<any[]>([]);
    const [analyticsData, setAnalyticsData] = useState<{ monthlyRevenue: any[], schemePopularity: any[] }>({ monthlyRevenue: [], schemePopularity: [] });
    const [allPlans, setAllPlans] = useState<any[]>([]);
    
    // Redemptions State
    const [completedSchemes, setCompletedSchemes] = useState<any[]>([]);
    const [closedSchemes, setClosedSchemes] = useState<any[]>([]);
    const [creditNoteData, setCreditNoteData] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });
    const [broadcastMode, setBroadcastMode] = useState<'all'|'custom'>('all');
    const [selectedUsersForBroadcast, setSelectedUsersForBroadcast] = useState<string[]>([]);
    const [broadcastSearchQuery, setBroadcastSearchQuery] = useState('');
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [allTransactions, setAllTransactions] = useState<any[]>([]);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showResetPinPrompt, setShowResetPinPrompt] = useState(false);
    const [tallyStartDate, setTallyStartDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [tallyEndDate, setTallyEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [resetPin, setResetPin] = useState('');
    const [resetPinError, setResetPinError] = useState(false);
    const [updatePhoneOTPModalOpen, setUpdatePhoneOTPModalOpen] = useState(false);
    const [updatePhoneOTP, setUpdatePhoneOTP] = useState('');

    // Referral Report State
    const [referralReportData, setReferralReportData] = useState<any[]>([]);
    const [referralMonthStart, setReferralMonthStart] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [referralMonthEnd, setReferralMonthEnd] = useState(() => new Date().toISOString().split('T')[0]);
    const [loadingReferrals, setLoadingReferrals] = useState(false);

    const [fulfillmentOTPModalOpen, setFulfillmentOTPModalOpen] = useState(false);
    const [fulfillmentOTP, setFulfillmentOTP] = useState('');
    const [fulfillmentTarget, setFulfillmentTarget] = useState<any>(null);
    const [reportSourceView, setReportSourceView] = useState<ViewState | null>(null);

    // Scheme Redemptions State
    const [redemptionsSearch, setRedemptionsSearch] = useState('');

    // Customer Report State
    const [reportSearchPhone, setReportSearchPhone] = useState('');
    const [reportCustomer, setReportCustomer] = useState<any>(null);
    const [reportSchemes, setReportSchemes] = useState<any[]>([]);
    const [reportTransactions, setReportTransactions] = useState<Record<string, any[]>>({});
    const [loadingReport, setLoadingReport] = useState(false);
    const [reportSchemeTab, setReportSchemeTab] = useState<'all' | 'active' | 'completed' | 'closed'>('all');

    // Admin Pre-close State
    const [adminPreCloseModalOpen, setAdminPreCloseModalOpen] = useState(false);
    const [adminPreCloseOTP, setAdminPreCloseOTP] = useState('');
    const [adminPreCloseTarget, setAdminPreCloseTarget] = useState<any>(null);

    const handleInitiateReset = async () => {
        try {
            const { checkBiometricAvailability, verifyBiometric } = await import('../utils/biometrics');
            const available = await checkBiometricAvailability();
            const biometricEnabled = localStorage.getItem('vastra_biometric_enabled') === 'true' || contextBiometricEnabled;
            
            if (available && biometricEnabled) {
                const success = await verifyBiometric();
                if (success) {
                    setShowResetModal(true);
                    return;
                } else {
                    showNotif('Biometric verification failed. Please enter PIN.', 'info');
                }
            }
        } catch (e) {
            console.error('Biometrics check failed', e);
        }
        
        setShowResetPinPrompt(true);
        setResetPin('');
        setResetPinError(false);
    };

    const handleResetPinChange = (val: string) => {
        setResetPin(val);
        setResetPinError(false);
        if (val.length === 4) {
            // Get correct PIN, fallback to local storage if user.pin is missing
            const correctPin = user?.pin || localStorage.getItem('vastra_pin');
            if (val === correctPin) {
                setShowResetPinPrompt(false);
                setShowResetModal(true);
            } else {
                setResetPinError(true);
                setResetPin('');
            }
        }
    };

    const handleResetApp = async () => {
        setLoadingData(true);
        setShowResetModal(false);
        try {
            const success = await resetApplicationData();
            if (success) {
                showNotif("Application data has been reset successfully. Please reload.", 'success');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                showNotif("Failed to reset application data", 'error');
            }
        } catch (e) {
            console.error(e);
            showNotif("Failed to reset application data", 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const loadAuditLogs = async () => {
        setLoadingData(true);
        try {
            const logs = await getAuditLogsFromDB();
            setAuditLogs(logs);
        } catch (error) {
            console.error(error);
            showNotif('Failed to load audit logs', 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const showNotif = (message: string, type: NotificationType = 'success') => {
        showNotification(message, type);
    };

    useEffect(() => {
        const fetchDB = async () => {
            try {
                const s = await getSchemesFromDB();
                setProgramsList(s);
                const r = await getStaffRequestsFromDB();
                setPendingStaff(r);
                const settings = await getAdminSettings();
                setAdminSettings(settings as any);
                await loadStaffList();
                
                // Fetch basic analytic datasets
                const txs = await getTransactionsFromDB();
                setAllTransactions(txs);
                const plans = await getAllUserPlansFromDB();
                const users = await getAllUsersFromDB();
                
                // Branch filtering for managers
                const isPrimary = user?.accessLevel === 'super';
                const managerBranch = user?.branch || 'Head Office';
                
                const filteredUsers = isPrimary ? users : users.filter((u: any) => u.branch === managerBranch || !u.branch);
                const filteredUserIds = filteredUsers.map((u: any) => u.id);
                const filteredPhones = filteredUsers.map((u: any) => u.phone);

                const filteredPlans = isPrimary ? plans : plans.filter((p: any) => filteredUserIds.includes(p.userId) || filteredPhones.includes(p.userId));
                
                setAllPlans(filteredPlans);
                setUsersList(filteredUsers);
                
                // Redemptions
                const completed = filteredPlans.filter((p: any) => {
                    const baseScheme = s.find((scheme: any) => scheme.id === p.planId || scheme.name === p.name || scheme.name === p.schemeName);
                    const requiredDuration = (baseScheme as any)?.duration ? Number((baseScheme as any).duration) : (Number(p.duration) || 11);
                    return p.status === 'completed' || (p.status === 'active' && p.monthsPaid >= requiredDuration);
                });
                setCompletedSchemes(completed);
                const closed = filteredPlans.filter((p: any) => p.status === 'closed' || p.status === 'redeemed');
                setClosedSchemes(closed);
                
                // Process Current Month Revenue by Scheme
                const currentMonthRevenueMap: Record<string, { amount: number, users: Set<string> }> = {};
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                txs.forEach((tx: any) => {
                    if (tx.status === 'Success' && tx.amount) {
                        let date = safeDate(tx.timestamp);
                        if (tx.date && typeof tx.date === 'string') {
                            const parts = tx.date.split(/[-/]/);
                            if (parts.length === 3) {
                                const day = parseInt(parts[0], 10);
                                const month = parseInt(parts[1], 10) - 1;
                                let year = parseInt(parts[2], 10);
                                if (year < 100) year += 2000;
                                date = new Date(year, month, day);
                            }
                        }
                        
                        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                            const plan = plans.find((p: any) => p.accountId === tx.accountId);
                            const schemeAmt = plan ? ((plan as any).amount || (plan as any).monthlyAmount || 0) : 0;
                            const displayName = schemeAmt ? `₹${schemeAmt}` : 'Other';
                            
                            if (!currentMonthRevenueMap[displayName]) {
                                currentMonthRevenueMap[displayName] = { amount: 0, users: new Set() };
                            }
                            currentMonthRevenueMap[displayName].amount += parseFloat(tx.amount);
                            if (tx.userId) currentMonthRevenueMap[displayName].users.add(tx.userId);
                        }
                    }
                });
                
                const monthlyRev = Object.keys(currentMonthRevenueMap).map(k => ({ 
                    name: k, 
                    amount: currentMonthRevenueMap[k].amount,
                    users: currentMonthRevenueMap[k].users.size
                })).sort((a, b) => b.amount - a.amount);

                // Process Scheme Popularity
                const schemePopMap: Record<string, number> = {};
                plans.forEach((p: any) => {
                    const amt = p.amount || p.monthlyAmount || 0;
                    const name = amt ? `₹${amt} Scheme` : 'Other';
                    schemePopMap[name] = (schemePopMap[name] || 0) + 1;
                });
                const schemePop = Object.keys(schemePopMap).map(k => ({ name: k, value: schemePopMap[k] }));

                setAnalyticsData({ monthlyRevenue: monthlyRev, schemePopularity: schemePop });
            } catch (err) {
                console.error("Failed to load Firebase data:", err);
            } finally {
                setLoadingData(false);
            }
        };
        fetchDB();
    }, []);

    const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', duration: '', amount: '', bonuses: '', gifts: '', referralIncentive: '' });
    
    const [approvalModalData, setApprovalModalData] = useState<{ isOpen: boolean, request: any, branch: string, accessLevel: string } | null>(null);

    const downloadPDF = async () => {
        if (!printRef.current) return;
        try {
            await downloadAsPDF(printRef.current, `credit_note_${creditNoteData.accountId}`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            showNotif('Failed to generate PDF', 'error');
        }
    };

    // Handlers
    const handleCreateScheme = async (e: React.FormEvent) => {
        e.preventDefault();

        const duration = parseInt(newScheme.duration);
        const amount = parseInt(newScheme.amount);

        if (isNaN(duration) || isNaN(amount) || !newScheme.name) {
            showNotif("Please enter valid name, duration and amount.", 'error');
            return;
        }

        const created = {
            id: 'scheme_' + Date.now(), // More robust ID
            name: newScheme.name,
            duration: duration,
            monthlyAmount: amount,
            maturityValue: amount * duration,
            bonuses: newScheme.bonuses,
            gifts: newScheme.gifts,
            referralIncentive: parseInt(newScheme.referralIncentive) || 0,
            members: 0,
            description: '',
            category: 'Custom',
            status: 'active'
        };
        await saveSchemeToDB(created);
        setProgramsList([...ProgramsList, created]);
        showNotif("Scheme Created Successfully!");
        setNewScheme({ name: '', duration: '', amount: '', bonuses: '', gifts: '', referralIncentive: '' });
        setActiveView('overview');
    };

    const handleDeleteScheme = async (id: string) => {
        if (!id) {
            showNotif("Error: Scheme has no ID", 'error');
            return;
        }
        setIdToDelete(id);
    };

    const confirmDelete = async () => {
        if (!idToDelete) return;

        try {
            await deleteSchemeFromDB(idToDelete.toString());
            setProgramsList(ProgramsList.filter(s => String(s.id) !== String(idToDelete)));
            showNotif("Scheme deleted successfully!");
        } catch (err: any) {
            console.error("Delete failed:", err);
            showNotif(`Delete Failed: ${err.message}`, 'error');
        } finally {
            setIdToDelete(null);
        }
    };

    const handleEditScheme = (scheme: any) => {
        setEditingSchemeId(scheme.id);
        setEditForm({ 
            name: scheme.name, 
            duration: scheme.duration.toString(), 
            amount: scheme.monthlyAmount.toString(),
            bonuses: scheme.bonuses || '',
            gifts: scheme.gifts || '',
            referralIncentive: scheme.referralIncentive ? scheme.referralIncentive.toString() : ''
        });
    };

    const handleSaveEdit = async (id: string) => {
        const duration = parseInt(editForm.duration);
        const amount = parseInt(editForm.amount);

        if (isNaN(duration) || isNaN(amount) || !editForm.name) {
            showNotif("Invalid input values", 'error');
            return;
        }

        const updatedList = await Promise.all(ProgramsList.map(async s => {
            if (String(s.id) === String(id)) {
                const newParams = {
                    ...s,
                    name: editForm.name,
                    duration: duration,
                    monthlyAmount: amount,
                    maturityValue: amount * duration,
                    bonuses: editForm.bonuses,
                    gifts: editForm.gifts,
                    referralIncentive: parseInt(editForm.referralIncentive) || 0
                };
                await saveSchemeToDB(newParams);
                return newParams;
            }
            return s;
        }));
        setProgramsList(updatedList);
        setEditingSchemeId(null);
    };

    const handleToggleStatus = async (id: string) => {
        const updatedList = await Promise.all(ProgramsList.map(async s => {
            if (String(s.id) === String(id)) {
                const newStatus = s.status === 'active' ? 'inactive' : 'active';
                const updated = { ...s, status: newStatus };
                await saveSchemeToDB(updated);
                return updated;
            }
            return s;
        }));
        setProgramsList(updatedList);
        showNotif("Scheme status updated!");
    };

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPlans.length === 0) {
            showNotif("Please select at least one scheme", 'error');
            return;
        }

        const amt = parseFloat(depositAmount);
        const expectedTotal = customerActiveSchemes
            .filter(s => selectedPlans.includes(s.accountId))
            .reduce((acc, s) => {
                const months = depositMonthsConfig[s.accountId] || 1;
                return acc + (Number(s.monthlyAmount || s.amount || 0) * months);
            }, 0);

        if (amt < expectedTotal) {
            showNotif(`Deposit amount (₹${amt}) cannot be less than the selected schemes total (₹${expectedTotal}).`, 'error');
            return;
        }

        const userId = foundCustomer?.id || depositCustomer;
        const phone = foundCustomer?.phone || depositCustomer;
        if (!phone || phone.length < 10) return showNotif('Invalid customer phone number', 'error');

        setLoadingData(true);
        try {
            const { sendOTP } = await import('../services/sms');
            const res = await sendOTP(phone);
            if (res.success) {
                setDepositOTPModalOpen(true);
                showNotif(`OTP sent to customer. (OTP: ${res.otp || ''})`, 'warning');
            } else {
                showNotif('Failed to send OTP to customer. Cannot proceed.', 'error');
            }
        } catch (e) {
            console.error(e);
            showNotif('Error triggering OTP.', 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const confirmDepositWithOTP = async () => {
        if (!depositOTP || depositOTP.length < 6) return showNotif('Enter valid OTP', 'error');
        setLoadingData(true);
        const phone = foundCustomer?.phone || depositCustomer;
        
        try {
            const { verifyOTP } = await import('../services/sms');
            const res = await verifyOTP(phone, depositOTP);
            if (!res.success) {
                setLoadingData(false);
                return showNotif('Invalid OTP', 'error');
            }
            
            setDepositOTPModalOpen(false);
            setDepositOTP('');
            
            const userId = foundCustomer?.id || depositCustomer;
            const { addAuditLog } = await import('../services/db');

            for (const accountId of selectedPlans) {
                const s = customerActiveSchemes.find(p => p.accountId === accountId);
                if (!s) continue;

                const monthsToPay = depositMonthsConfig[accountId] || 1;
                const paid = Number(s.monthlyAmount || s.amount || 0) * monthsToPay;
                const schemeRef = doc(db, "user_schemes", s.id);
                const nextMonthsPaid = (s.monthsPaid || 0) + monthsToPay;
                const isCompleted = nextMonthsPaid >= (s.duration || 0);
                await updateDoc(schemeRef, {
                    monthsPaid: nextMonthsPaid,
                    totalPaid: (s.totalPaid || 0) + paid,
                    status: isCompleted ? 'completed' : (s.status || 'active'),
                    completedAt: isCompleted ? new Date().toISOString() : (s.completedAt || null),
                });

                const transactionId = await recordTransactionInDB({
                    userId: userId,
                    customerAccount: userId,
                    schemeName: s.name || s.schemeName || 'Purchase Plan',
                    accountId: accountId,
                    schemeId: accountId,
                    amount: paid,
                    type: 'deposit',
                    status: 'Success',
                    method: 'CASH',
                    recordedBy: 'admin'
                });

                if (transactionId) {
                    await addAuditLog('MANUAL_DEPOSIT', 'admin', {
                        phone: userId,
                        amount: paid,
                        schemeId: s.name || s.schemeName || accountId,
                        transactionId
                    });
                }
            }

            showNotification("Cash deposit recorded successfully!", 'success');
            setSelectedPlans([]);
            setDepositMonthsConfig({});
            setDepositAmount('');
            setDepositCustomer('');
            setCustomerActiveSchemes([]);
            setActiveView('overview');
        } catch (err) {
            console.error(err);
            showNotification("Deposit failed. Please try again.", 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const calculateDepositAmount = (selected: string[], monthsConfig: Record<string, number>) => {
        const sum = customerActiveSchemes
            .filter(s => selected.includes(s.accountId))
            .reduce((acc, s) => {
                const months = monthsConfig[s.accountId] || 1;
                return acc + (Number(s.monthlyAmount || s.amount || 0) * months);
            }, 0);
        setDepositAmount(sum > 0 ? sum.toString() : '');
    };

    const togglePlan = (accountId: string) => {
        let newSelection = [];
        let newConfig = { ...depositMonthsConfig };
        if (selectedPlans.includes(accountId)) {
            newSelection = selectedPlans.filter(id => id !== accountId);
            delete newConfig[accountId];
        } else {
            newSelection = [...selectedPlans, accountId];
            newConfig[accountId] = 1;
        }
        setSelectedPlans(newSelection);
        setDepositMonthsConfig(newConfig);
        calculateDepositAmount(newSelection, newConfig);
    };

    const updateDepositMonths = (e: React.MouseEvent, accountId: string, increment: boolean) => {
        e.stopPropagation();
        const s = customerActiveSchemes.find(p => p.accountId === accountId);
        if (!s) return;
        
        const remainingMonths = (s.duration || 0) - (s.monthsPaid || 0);
        let current = depositMonthsConfig[accountId] || 1;
        if (increment && current < remainingMonths) {
            current++;
        } else if (!increment && current > 1) {
            current--;
        }
        
        const newConfig = { ...depositMonthsConfig, [accountId]: current };
        setDepositMonthsConfig(newConfig);
        calculateDepositAmount(selectedPlans, newConfig);
    };

    const handleCustomerLookup = async (id: string) => {
        setDepositCustomer(id);
        if (id.length >= 10) {
            const userProfile: any = await getUserFromDB(id);
            if (userProfile) {
                setFoundCustomer(userProfile);
                const userId = userProfile.id;
                
                // Fetch plans using BOTH ID and Phone
                const plansById = await getUserPlansFromDB(userId);
                let plansByPhone: any[] = [];
                if (userProfile.phone && userProfile.phone !== userId) {
                    plansByPhone = await getUserPlansFromDB(userProfile.phone);
                }
                
                const combinedPlans = [...plansById, ...plansByPhone];
                // remove duplicates by accountId
                const uniquePlans = combinedPlans.filter((v, i, a) => a.findIndex(t => t.accountId === v.accountId) === i);
                
                setCustomerActiveSchemes(uniquePlans.filter((p: any) => p.status !== 'completed'));
            } else {
                const plans = await getUserPlansFromDB(id);
                setCustomerActiveSchemes(plans.filter((p: any) => p.status !== 'completed'));
            }
            setSelectedPlans([]);
            setDepositAmount('');
        } else {
            setCustomerActiveSchemes([]);
            setSelectedPlans([]);
            setDepositAmount('');
        }
    };

    const handleStaffAction = async (id: string, action: 'approve' | 'reject') => {
        if (action === 'approve') {
            const request = pendingStaff.find(s => s.id === id);
            if (request) {
                setApprovalModalData({ isOpen: true, request, branch: request.branch || '', accessLevel: 'standard' });
            }
        } else {
            await deleteStaffRequestFromDB(id.toString());
            setPendingStaff(pendingStaff.filter(staff => staff.id !== id));
            showNotif(`Staff request rejected.`, 'info');
        }
    };

    const confirmStaffApproval = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!approvalModalData?.request) return;
        setLoadingData(true);
        try {
            const request = approvalModalData.request;
            const tempPassword = request.password; 
            const tempPin = Math.floor(1000 + Math.random() * 9000).toString();
            
            const { addAuditLog } = await import('../services/db');
            
            // Auto-generate sequential empId starting at 101
            const allCurrentUsers = await getAllUsersFromDB();
            const currentStaff = allCurrentUsers.filter((u: any) => u.role === 'staff' && u.empId);
            let nextEmpId = 101;
            if (currentStaff.length > 0) {
                const maxId = Math.max(...currentStaff.map((s: any) => parseInt(s.empId) || 0));
                if (maxId >= 100) nextEmpId = maxId + 1;
            }
            
            await createUserProfile({
                phone: request.phone,
                firstName: request.name.split(' ')[0] || request.name,
                lastName: request.name.split(' ').slice(1).join(' ') || '',
                branch: approvalModalData.branch,
                role: 'staff',
                accessLevel: approvalModalData.accessLevel,
                password: tempPassword,
                pin: tempPin,
                status: 'active',
                empId: nextEmpId.toString()
            });

            await addAuditLog('STAFF_CREATION', 'admin', {
                staffId: request.phone,
                name: request.name
            });

            showNotif(`Staff account created for ${request.name}. Temp PIN: ${tempPin}`, 'success');
            await deleteStaffRequestFromDB(request.id.toString());
            setPendingStaff(pendingStaff.filter(staff => staff.id !== request.id));
            setApprovalModalData(null);
            
            const updatedUsers = await getAllUsersFromDB();
            setStaffList(updatedUsers.filter((u:any) => u.role === 'staff'));
        } catch(err) {
            showNotif("Failed to approve staff", "error");
        } finally {
            setLoadingData(false);
        }
    };

    const handleUpdateSecurity = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingData(true);
        try {
            await updateAdminSettings(adminSettings);
            
            const { auth } = await import('../firebase');
            if (auth.currentUser) {
                const { updatePassword } = await import('firebase/auth');
                try {
                    await updatePassword(auth.currentUser, adminSettings.password);
                } catch (authErr) {
                    console.error("Could not update Firebase Auth password:", authErr);
                }
            }

            showNotif("Admin Security Settings Updated!");
            setActiveView('overview');
        } catch (err) {
            showNotif("Failed to update security", "error");
        } finally {
            setLoadingData(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!newAdmin.adminId || !newAdmin.password || !newAdmin.securityPin) {
            showNotif("Please fill all fields", 'error');
            return;
        }
        setLoadingData(true);
        try {
            // We use a different ID for extra admins
            const adminDocId = `admin_${newAdmin.adminId}`;
            const { db } = await import('../firebase');
            const { doc, setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, "admins", adminDocId), newAdmin);
            showNotif("New Admin added successfully!");
            setNewAdmin({ adminId: '', password: '', securityPin: '' });
            setShowAddAdmin(false);
            // Refresh the admins list so the new admin appears immediately
            const updated = await getAllAdminsFromDB();
            setAdminsList(updated);
        } catch (err) {
            showNotif("Failed to add admin", 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const loadStaffList = async () => {
        setLoadingData(true);
        const users = await getAllUsersFromDB();
        setStaffList(users.filter((u: any) => u.role === 'staff'));
        setLoadingData(false);
    };

    const handleUpdateStaffAuthority = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingData(true);
        try {
            await createUserProfile(editingStaff); // Re-saves the user with new data
            showNotif("Staff authority updated!");
            setEditingStaff(null);
            loadStaffList();
        } catch (err) {
            showNotif("Update failed", "error");
        } finally {
            setLoadingData(false);
        }
    };

    const handleCustomerSearch = async () => {
        if (!searchQuery) return;
        setLoadingData(true);
        setShowCustomerReport(false);
        const res: any = await getUserFromDB(searchQuery);
        if (res) {
            setFoundCustomer(res);
            setNewPhone(res.phone);
            const userId = res.id;
            
            // Fetch Plans
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
            setCustomerTransactions(uniqueTx.sort((a, b) => safeDate(b.timestamp).getTime() - safeDate(a.timestamp).getTime()));
        } else {
            showNotif("Customer not found", 'error');
        }
        setLoadingData(false);
    };

    const handleUpdatePhone = async () => {
        if (!newPhone) return;
        if (newPhone.length < 10) {
            return showNotif("Please enter a valid 10-digit phone number.", 'error');
        }
        setLoadingData(true);
        try {
            const { sendOTP } = await import('../services/sms');
            const res = await sendOTP(newPhone);
            if (res.success) {
                setUpdatePhoneOTPModalOpen(true);
                showNotif(`OTP sent to new phone number (OTP: ${res.otp || ''})`, 'warning');
            } else {
                showNotif("Failed to send OTP", 'error');
            }
        } catch (err) {
            console.error(err);
            showNotif("Error triggering OTP", 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const confirmUpdatePhoneWithOTP = async () => {
        if (!updatePhoneOTP || updatePhoneOTP.length < 6) {
            return showNotif('Enter valid 6-digit OTP', 'error');
        }
        setLoadingData(true);
        try {
            const { verifyOTP } = await import('../services/sms');
            const res = await verifyOTP(newPhone, updatePhoneOTP);
            if (!res.success) {
                setLoadingData(false);
                return showNotif('Invalid OTP', 'error');
            }

            const updated = { ...foundCustomer, phone: newPhone };
            await createUserProfile(updated);
            showNotif("Phone number updated successfully!", "success");
            setFoundCustomer(null);
            setSearchQuery('');
            setUpdatePhoneOTPModalOpen(false);
            setUpdatePhoneOTP('');
            setActiveView('overview');
        } catch (err) {
            showNotif("Update failed", 'error');
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
                showNotif("Customer not found", 'error');
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
            showNotif("Failed to fetch report data", 'error');
        } finally {
            setLoadingReport(false);
        }
    };

    const handleInitiateAdminPreClose = async (plan: any) => {
        try {
            setLoadingData(true);
            const { sendOTP } = await import('../services/sms');
            const result = await sendOTP(reportCustomer.phone);
            if (result.success) {
                setAdminPreCloseTarget(plan);
                setAdminPreCloseModalOpen(true);
                showNotif(`OTP sent to ${reportCustomer.phone} for pre-close verification. (OTP: ${result.otp || ''})`, 'warning');
            } else {
                showNotif('Failed to send OTP for pre-close.', 'error');
            }
        } catch (error) {
            console.error("Error initiating pre-close:", error);
            showNotif('Failed to prepare pre-close.', 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const handleVerifyAdminPreClose = async () => {
        if (!adminPreCloseOTP || adminPreCloseOTP.length !== 6 || !adminPreCloseTarget) {
            showNotif('Please enter a valid 6-digit OTP.', 'error');
            return;
        }
        try {
            setLoadingData(true);
            const { verifyOTP } = await import('../services/sms');
            const { preCloseScheme } = await import('../services/db');
            const isOtpValid = await verifyOTP(reportCustomer.phone, adminPreCloseOTP);
            
            if (!isOtpValid) {
                showNotif('Invalid or expired OTP', 'error');
                return;
            }
            
            await preCloseScheme(adminPreCloseTarget.id);
            showNotif(`Scheme ${adminPreCloseTarget.schemeName || adminPreCloseTarget.name} pre-closed successfully.`, 'success');
            
            setAdminPreCloseModalOpen(false);
            setAdminPreCloseOTP('');
            setAdminPreCloseTarget(null);
            
            // Refresh customer report data
            await handleSearchCustomerReport(reportCustomer.phone);
        } catch (error) {
            console.error("Error verifying pre-close:", error);
            showNotif('Failed to verify and pre-close.', 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const downloadReportPDF = async () => {
        showNotif('Generating PDF, please wait...', 'info');
        const element = document.getElementById('customer-report-print-content');
        if (!element) {
            showNotif('Error: Report element not found', 'error');
            return;
        }
        try {
            await downloadAsPDF(element, `${reportCustomer?.firstName || 'customer'}_statement`);
            showNotif('PDF downloaded successfully!', 'success');
        } catch (error: any) {
            console.error("Error generating PDF:", error);
            showNotif(`Failed to generate PDF: ${error.message}`, 'error');
        }
    };

    const handleFilterTransactions = async () => {
        if (!incentiveRange.start || !incentiveRange.end) {
            showNotif("Please select both start and end dates", 'error');
            return;
        }
        setLoadingData(true);
        try {
            const allTx = await getTransactionsFromDB();
            const start = new Date(incentiveRange.start).getTime();
            // Set end time to the end of the day (23:59:59)
            const endDateObj = new Date(incentiveRange.end);
            endDateObj.setHours(23, 59, 59, 999);
            const end = endDateObj.getTime();

            const filtered = allTx.filter((tx: any) => {
                const txTime = safeDate(tx.timestamp).getTime();
                return txTime >= start && txTime <= end;
            });

            const allUsers = await getAllUsersFromDB();
            const userMap: Record<string, any> = {};
            allUsers.forEach((u: any) => {
                userMap[u.id] = u;
                if (u.phone) userMap[u.phone] = u;
            });

            const augmentedFiltered = filtered.map((tx: any) => {
                const accountKey = tx.userId || tx.customerAccount || tx.userPhone || tx.accountId || '';
                const user = userMap[accountKey];
                return {
                    ...tx,
                    customerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : (tx.userName || accountKey),
                    customerPhone: user?.phone || accountKey
                };
            });

            setTransactionReport(augmentedFiltered);
        } catch (err) {
            showNotif("Error fetching reports", "error");
        } finally {
            setLoadingData(false);
        }
    };


    const handleDownloadCSV = async () => {
        if (transactionReport.length === 0) return;

        // Fetch all users once and build a lookup map by phone (which is the user doc ID)
        const allUsers = await getAllUsersFromDB();
        const userMap: Record<string, any> = {};
        allUsers.forEach((u: any) => {
            userMap[u.id] = u;
            if (u.phone) userMap[u.phone] = u;
            if (u.empId) userMap[u.empId] = u;
        });

        // Build a scheme name lookup from user_schemes to handle accountId -> name
        const { collection, getDocs } = await import('firebase/firestore');
        const userSchemesSnap = await getDocs(collection(db, "user_schemes"));
        const accountSchemeMap: Record<string, string> = {};
        userSchemesSnap.docs.forEach(d => {
            const data = d.data();
            accountSchemeMap[d.id] = data.name || data.schemeName || 'Investment Plan';
        });

        // Build a scheme name lookup from already-loaded ProgramsList
        const schemeMap: Record<string, string> = {};
        ProgramsList.forEach((s: any) => {
            schemeMap[s.id] = s.name;
        });

        const headers = ["Transaction ID", "Customer Name", "Phone Number", "Amount (₹)", "Date", "Transaction Type", "Method", "Recorded By", "Scheme Name"];

        const rows = transactionReport.map(tx => {
            const accountKey = tx.userId || tx.customerAccount || tx.userPhone || tx.accountId || '';
            const user = userMap[accountKey];
            const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : (tx.userName || accountKey);
            const phone = user?.phone || tx.userPhone || (accountKey.match(/^\d+$/) ? accountKey : 'N/A');

            // Try resolving scheme name from transaction property, then account map, then master scheme map
            const schemeName = tx.schemeName || accountSchemeMap[tx.accountId] || schemeMap[tx.schemeId] || tx.schemeId || 'N/A';

            let recorderName = tx.recordedBy || 'System';
            if (tx.recordedBy && tx.recordedBy !== 'System') {
                const recorder = userMap[tx.recordedBy];
                if (recorder) {
                    const rName = `${recorder.firstName || ''} ${recorder.lastName || ''}`.trim();
                    if (rName) recorderName = `${rName} (${tx.recordedBy})`;
                } else if (tx.recordedBy === 'main_admin') {
                    recorderName = 'Main Admin';
                }
            }

            return [
                tx.referenceId || tx.id || 'N/A',
                `"${customerName}"`,
                phone,
                tx.amount || 0,
                tx.date || formatDate(safeDate(tx.timestamp)),
                (tx.type || 'unknown').toUpperCase(),
                (tx.method || 'Razorpay').toUpperCase(),
                `"${recorderName}"`,
                `"${schemeName}"`
            ];
        });

        const csvContent = "\uFEFF" + [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const fileName = `Transactions_${incentiveRange.start || 'Report'}_to_${incentiveRange.end || 'Report'}.csv`;
        await downloadFile(csvContent, fileName, 'text/csv', false);
    };

    const handleExportCustomers = async () => {
        if (!usersList.length && !allPlans.length) return showNotif("No customer data to export", "error");
        
        const maxInstallments = Math.max(...allPlans.map(p => Number(p.duration) || 11), 11);
        const getOrdinal = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };

        const formatDateToText = (dateString) => {
            if (!dateString) return '';
            // Handle DD/MM/YYYY or DD-MM-YYYY: last segment is 4-digit year, first is day
            const parts = dateString.split(/[-/]/);
            if (parts.length === 3 && parts[2].length === 4) {
                return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
            }
            // ISO or other formats: use safeDate which handles Firestore timestamps and ISO strings
            const d = safeDate(dateString);
            if (isNaN(d.getTime())) return dateString;
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        };

        const headers = [
            "S No", "Scheme ID", "Customer ID", "Phone No", "Cus Name", "Doj", "Scheme Amt"
        ];
        
        for (let i = 1; i <= maxInstallments; i++) {
            headers.push(`${getOrdinal(i)} Installment`);
        }
        
        headers.push("Count", "Total Paid");

        const plansWithUsers = [];
        const processedPlans = new Set();
        
        const customersOnly = usersList.filter(u => u.role !== 'admin' && u.role !== 'staff');

        // Build a canonical user map: merge legacy users with same name+phone.
        // Key: normalized name + phone. Value: canonical user (first seen) + list of all their ids.
        const canonicalUserMap = new Map<string, { user: any; allIds: Set<string> }>();
        customersOnly.forEach(u => {
            const firstName = (u.firstName || '').trim().toLowerCase();
            const lastName = (u.lastName || '').trim().toLowerCase();
            const phone = (u.phone || '').replace(/\D/g, '').slice(-10);
            const key = `${firstName}|${lastName}|${phone}`;
            if (!canonicalUserMap.has(key)) {
                canonicalUserMap.set(key, { user: u, allIds: new Set([u.id, u.phone].filter(Boolean)) });
            } else {
                const entry = canonicalUserMap.get(key)!;
                if (u.id) entry.allIds.add(u.id);
                if (u.phone) entry.allIds.add(u.phone);
            }
        });

        // Build a lookup from any userId/phone -> canonical entry
        const idToCanonical = new Map<string, { user: any; allIds: Set<string> }>();
        canonicalUserMap.forEach(entry => {
            entry.allIds.forEach(id => idToCanonical.set(id, entry));
        });
        
        canonicalUserMap.forEach(({ user, allIds }) => {
            const userPlans = allPlans.filter(p => allIds.has(p.userId));
            if (userPlans.length > 0) {
                userPlans.forEach(plan => {
                    processedPlans.add(plan.id);
                    plansWithUsers.push({ plan, user, allIds });
                });
            } else {
                plansWithUsers.push({ plan: null, user, allIds });
            }
        });
        
        allPlans.forEach(plan => {
            if (!processedPlans.has(plan.id)) {
                const canonical = idToCanonical.get(plan.userId);
                const user = canonical?.user || usersList.find(u => u.id === plan.userId || u.phone === plan.userId) || { phone: plan.userId, firstName: 'Unknown', lastName: '' };
                const allIds = canonical?.allIds || new Set([plan.userId].filter(Boolean));
                plansWithUsers.push({ plan, user, allIds });
            }
        });

        plansWithUsers.sort((a, b) => {
            const nameA = `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim().toLowerCase();
            const nameB = `${b.user.firstName || ''} ${b.user.lastName || ''}`.trim().toLowerCase();
            return nameA.localeCompare(nameB);
        });

        let grandTotalPaid = 0;
        let sNo = 1;

        const rows = plansWithUsers.map(({ plan, user, allIds }) => {
            if (!plan) {
                const row = [];
                row.push(sNo++);
                row.push(""); // Scheme ID
                row.push(user.customerId || 'N/A');
                row.push(user.phone || 'N/A');
                row.push((`${user.firstName || ''} ${user.lastName || ''}`).trim());
                row.push(""); // Doj
                row.push(0); // Scheme Amt
                for (let i = 0; i < maxInstallments; i++) row.push("");
                row.push(0); // Count
                row.push(0); // Total Paid
                return row;
            }

            const txs = allTransactions.filter(tx => tx.accountId === plan.accountId && tx.status === 'Success');
            txs.sort((a, b) => safeDate(a.timestamp).getTime() - safeDate(b.timestamp).getTime());

            // Calculate Nth scheme of this amount for this user (using ALL ids/phones for legacy dedup)
            const userAllIds = allIds || new Set([plan.userId].filter(Boolean));
            const userPlans = allPlans.filter(p => userAllIds.has(p.userId));
            const amt = Number(plan.amount || plan.monthlyAmount || 0);
            const sameAmtPlans = userPlans.filter(p => Number(p.amount || p.monthlyAmount || 0) === amt);
            sameAmtPlans.sort((a, b) => safeDate(a.enrollmentDate || a.createdAt || 0).getTime() - safeDate(b.enrollmentDate || b.createdAt || 0).getTime());
            const planIndex = sameAmtPlans.findIndex(p => p.accountId === plan.accountId);
            const nth = String((planIndex >= 0 ? planIndex : 0) + 1).padStart(2, '0');

            // Get DoJ: use safeDate to safely handle Firestore Timestamps, ISO strings and DD-MM-YYYY
            let d: Date;
            const rawDate = plan.enrollmentDate || plan.createdAt || plan.joinedAt;
            if (rawDate && typeof rawDate === 'string') {
                // Handle DD-MM-YYYY or DD/MM/YYYY formats which new Date() misreads
                const parts = rawDate.split(/[-/]/);
                if (parts.length === 3 && parts[2].length === 4) {
                    d = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}T00:00:00Z`);
                    if (isNaN(d.getTime())) d = safeDate(rawDate);
                } else {
                    d = safeDate(rawDate);
                }
            } else {
                d = safeDate(rawDate);
            }
            if (isNaN(d.getTime())) d = new Date();

            const dd = String(d.getUTCDate()).padStart(2, '0');
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const yyyy = d.getUTCFullYear();
            
            // Format: DDMMYYYY + Amount + Nth
            // If year is typed as YY vs YYYY. The user's examples were "3005202650001" and "0506202650002" (DDMMYYYY).
            const schemeIdStr = `${dd}${mm}${yyyy}${amt}${nth}`;

            const row = [];
            row.push(sNo++);
            row.push(schemeIdStr);
            row.push(user.customerId || 'N/A');
            row.push(user.phone || 'N/A');
            row.push((`${user.firstName || ''} ${user.lastName || ''}`).trim());
            
            row.push(formatDateToText(plan.enrollmentDate));
            
            const schemeAmt = Number(plan.amount || plan.monthlyAmount || 0);
            row.push(schemeAmt);

            for (let i = 0; i < maxInstallments; i++) {
                if (i < txs.length) {
                    const tx = txs[i];
                    if (tx.date && typeof tx.date === 'string') {
                        row.push(tx.date.replace(/"/g, ''));
                    } else {
                        const txD = safeDate(tx.timestamp);
                        const tdd = String(txD.getDate()).padStart(2, '0');
                        const tmm = String(txD.getMonth() + 1).padStart(2, '0');
                        const tyyyy = txD.getFullYear();
                        row.push(`${tdd}/${tmm}/${tyyyy}`);
                    }
                } else {
                    row.push("");
                }
            }

            const calculatedTxTotal = txs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
            const totalPaid = Math.max(Number(plan.totalPaid || 0), calculatedTxTotal);
            const count = Math.max(txs.length, Number(plan.monthsPaid || 0));
            
            grandTotalPaid += totalPaid;

            row.push(count);
            row.push(totalPaid);

            return row;
        });

        const totalRow = Array(headers.length).fill("");
        totalRow[headers.length - 2] = "GRAND TOTAL";
        totalRow[headers.length - 1] = grandTotalPaid;
        rows.push(totalRow);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const colWidths = [
            { wch: 6 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 12 }
        ];
        for (let i = 1; i <= maxInstallments; i++) colWidths.push({ wch: 15 });
        colWidths.push({ wch: 10 }, { wch: 15 });
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Customers");
        const base64 = workbookToBase64(wb, XLSX);
        await downloadFile(base64, `Customers_Export_${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true);
    };

    const handleDownloadStaffCSV = async () => {
        if (!staffList || staffList.length === 0) return showNotif("No staff data to export", "error");

        const headers = ["Employee ID", "First Name", "Last Name", "Phone", "Access Level", "Assigned Branch"];
        const rows = staffList.map(staff => [
            `"${staff.empId || 'N/A'}"`,
            `"${staff.firstName || ''}"`,
            `"${staff.lastName || ''}"`,
            `"${staff.phone || ''}"`,
            `"${staff.accessLevel || 'standard'}"`,
            `"${staff.branch || 'No Branch'}"`
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        await downloadFile(csvContent, `Staff_Report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv', false);
    };

    const handleExportSubscriptions = async () => {
        if (!allPlans.length) return showNotif("No subscriptions to export", "error");
        
        const formatDateToText = (dateString: any) => {
            if (!dateString) return 'N/A';
            const d = safeDate(dateString);
            if (isNaN(d.getTime())) return 'N/A';
            const day = String(d.getDate()).padStart(2, '0');
            const month = d.toLocaleString('en-US', { month: 'short' });
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        };

        const headers = ["Account ID", "Customer Name", "Customer Phone", "Scheme Name", "Status", "Duration (Months)", "Months Paid", "Total Paid (₹)", "Join Date"];
        
        const plansWithUsers = allPlans.map(p => {
            const u = usersList.find(user => user.id === p.userId || user.phone === p.userId) || {};
            return { p, u };
        });

        // Sort alphabetically by Customer Name
        plansWithUsers.sort((a, b) => {
            const nameA = `${a.u.firstName || ''} ${a.u.lastName || ''}`.trim().toLowerCase();
            const nameB = `${b.u.firstName || ''} ${b.u.lastName || ''}`.trim().toLowerCase();
            return nameA.localeCompare(nameB);
        });

        const rows = plansWithUsers.map(({ p, u }) => {
            const phoneStr = u.phone || p.userId || '';
            const formattedPhone = phoneStr || 'N/A';
            const joinedAtFormatted = formatDateToText(p.joinedAt || p.enrollmentDate || p.createdAt);
            const customerName = `${u.firstName || ''} ${u.lastName || ''}`.trim();

            return [
                p.accountId || 'N/A',
                customerName,
                formattedPhone,
                p.name || p.schemeName || (p.amount ? `Scheme-${p.amount}` : (p.monthlyAmount ? `Scheme-${p.monthlyAmount}` : 'N/A')),
                p.status || 'N/A',
                p.duration || 'N/A',
                p.monthsPaid || 0,
                p.totalPaid || 0,
                joinedAtFormatted
            ];
        });

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Subscriptions");
        const base64 = workbookToBase64(wb, XLSX);
        await downloadFile(base64, `subscriptions_export_${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true);
    };



    const handleFetchReferralReport = async () => {
        if (!referralMonthStart || !referralMonthEnd) {
            showNotif('Please select a valid date range', 'error');
            return;
        }
        setLoadingReferrals(true);
        try {
            const { collection, getDocs } = await import('firebase/firestore');
            const snap = await getDocs(collection(db, 'user_schemes'));
            const allUsers = await getAllUsersFromDB();
            const userMap: Record<string, any> = {};
            allUsers.forEach((u: any) => {
                userMap[u.id] = u;
                if (u.phone) userMap[u.phone] = u;
                if (u.empId) userMap[u.empId] = u;
            });

            const start = new Date(referralMonthStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(referralMonthEnd);
            end.setHours(23, 59, 59, 999);

            const results: any[] = [];
            snap.docs.forEach(d => {
                const data = d.data();
                const refCode = data.referralCode || data.referralEmpId;
                if (!refCode) return;

                let enrollDate: Date | null = null;
                const dateStr = data.enrollmentDate || data.enrolledAt || data.joinedAt || data.createdAt;
                if (dateStr) {
                    enrollDate = safeDate(dateStr);
                }

                if (enrollDate && enrollDate >= start && enrollDate <= end) {
                    const enrollee = userMap[data.userId] || userMap[data.phone] || null;
                    const referrer = userMap[refCode] ||
                                     allUsers.find((u: any) => u.empId === refCode) || null;
                    const masterScheme = ProgramsList.find((s: any) =>
                        s.id === data.planId || s.name === data.name || s.name === data.schemeName
                    );
                    const incentiveAmt = Number(masterScheme?.referralIncentive || data.referralIncentive || 0);
                    results.push({
                        schemeId: d.id,
                        schemeName: data.name || data.schemeName || 'N/A',
                        enrolleeName: enrollee
                            ? `${enrollee.firstName || ''} ${enrollee.lastName || ''}`.trim()
                            : (data.userId || 'Unknown'),
                        enrolleePhone: enrollee?.phone || data.userId || 'N/A',
                        referrerCode: refCode,
                        referrerName: referrer
                            ? `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim()
                            : refCode,
                        referrerEmpId: referrer?.empId || refCode,
                        enrolledAt: enrollDate ? formatDate(enrollDate) : 'N/A',
                        amount: data.amount || data.monthlyAmount || 0,
                        incentiveAmt,
                    });
                }
            });

            results.sort((a, b) => (a.referrerName || '').localeCompare(b.referrerName || ''));
            setReferralReportData(results);
            if (results.length === 0) showNotif('No referrals found for this date range.', 'info');
        } catch (err) {
            console.error(err);
            showNotif('Failed to fetch referral data', 'error');
        } finally {
            setLoadingReferrals(false);
        }
    };

    const handleExportReferralExcel = async () => {
        if (!referralReportData.length) return;
        const headers = [
            'Enrollee Name', 'Enrollee Phone', 'Scheme Name', 'Monthly Amount (₹)',
            'Enrolled On', 'Referrer Name', 'Referrer Emp ID', 'Incentive Earned (₹)'
        ];
        const rows = referralReportData.map(r => [
            r.enrolleeName,
            r.enrolleePhone,
            r.schemeName,
            r.amount,
            r.enrolledAt,
            r.referrerName,
            r.referrerEmpId,
            r.incentiveAmt || 0,
        ]);

        // Group summary: referrals per employee with incentive totals
        const summaryMap: Record<string, { name: string; count: number; incentiveTotal: number }> = {};
        referralReportData.forEach(r => {
            if (!summaryMap[r.referrerEmpId]) {
                summaryMap[r.referrerEmpId] = { name: r.referrerName, count: 0, incentiveTotal: 0 };
            }
            summaryMap[r.referrerEmpId].count++;
            summaryMap[r.referrerEmpId].incentiveTotal += Number(r.incentiveAmt || 0);
        });
        const summaryRows = Object.entries(summaryMap).map(([empId, { name, count, incentiveTotal }]) => [
            empId, name, count, incentiveTotal
        ]);

        const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const ws2 = XLSX.utils.aoa_to_sheet([['Emp ID', 'Referrer Name', 'Total Referrals', 'Total Incentive Earned (₹)'], ...summaryRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws1, 'Referral Details');
        XLSX.utils.book_append_sheet(wb, ws2, 'Summary by Employee');
        const base64 = workbookToBase64(wb, XLSX);
        await downloadFile(
            base64,
            `Referral_Report_${referralMonthStart}_to_${referralMonthEnd}.xlsx`,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            true
        );
    };

    const getActorName = (actorId: string) => {
        if (!actorId) return 'Unknown';
        if (actorId === user?.id || actorId === user?.phone) return `${user.firstName} (You)`;
        const foundUser = usersList.find(u => u.id === actorId || u.phone === actorId || u.empId === actorId);
        if (foundUser) return foundUser.firstName + (foundUser.lastName ? ` ${foundUser.lastName}` : '');
        const foundAdmin = adminsList.find(a => a.adminId === actorId || a.docId === actorId);
        if (foundAdmin) return foundAdmin.name || actorId;
        return actorId;
    };

    const renderView = () => {
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
                                <Button onClick={downloadPDF} size="sm" className="bg-primary text-white flex justify-center items-center gap-2">
                                    <Download size={16} /> Save PDF
                                </Button>
                            </div>
                        </div>

                        <div id="credit-note-container" ref={printRef} className="bg-white p-6 border border-gray-300 font-sans text-gray-900 print-area max-w-sm mx-auto shadow-sm relative overflow-hidden">
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
                                        <p className="font-mono font-bold text-gray-900 text-xs">{creditNoteData.accountId.slice(0,12)}...</p>
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
                                    
                                    {(creditNoteData.bonuses || creditNoteData.gifts) && !creditNoteData.isPreClosed && (
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

        switch (activeView) {
            case 'create_customer':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Create Customer Account</h2>
                        </div>
                        <CreateCustomerAccount />
                    </motion.div>
                );

            case 'enroll_customer':
                return (
                    <EnrollCustomer onBack={() => setActiveView('overview')} />
                );

            case 'create_scheme':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Create Scheme</h2>
                        </div>
                        <form onSubmit={handleCreateScheme} className="space-y-4">
                            <Input label="Scheme Name" required value={newScheme.name} onChange={e => setNewScheme({ ...newScheme, name: e.target.value })} />
                            <Input label="Duration (Months)" type="number" required value={newScheme.duration} onChange={e => setNewScheme({ ...newScheme, duration: e.target.value })} />
                            <Input label="Monthly Installment (₹)" type="number" required value={newScheme.amount} onChange={e => setNewScheme({ ...newScheme, amount: e.target.value })} />
                            <Input label="Bonuses" value={newScheme.bonuses} onChange={e => setNewScheme({ ...newScheme, bonuses: e.target.value })} />
                            <Input label="Gifts" value={newScheme.gifts} onChange={e => setNewScheme({ ...newScheme, gifts: e.target.value })} />
                            <Input label="Referral Incentive Amount (₹)" type="number" value={newScheme.referralIncentive} onChange={e => setNewScheme({ ...newScheme, referralIncentive: e.target.value })} />
                            <Button fullWidth className="mt-4" type="submit">Publish Scheme</Button>
                        </form>
                    </motion.div>
                );

            case 'manage_schemes':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Manage Schemes</h2>
                        </div>
                        <div className="space-y-4">
                            {ProgramsList.map(s => (
                                <Card key={s.id} className="p-4 border-none shadow-subtle flex flex-col gap-3 bg-surface">
                                    {editingSchemeId === s.id ? (
                                        <div className="space-y-3">
                                            <Input label="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                            <div className="flex gap-2">
                                                <Input label="Duration" type="number" value={editForm.duration} onChange={e => setEditForm({ ...editForm, duration: e.target.value })} />
                                                <Input label="Amount" type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
                                            </div>
                                            <Input label="Bonuses" value={editForm.bonuses} onChange={e => setEditForm({ ...editForm, bonuses: e.target.value })} />
                                            <Input label="Gifts" value={editForm.gifts} onChange={e => setEditForm({ ...editForm, gifts: e.target.value })} />
                                            <Input label="Referral Incentive (₹)" type="number" value={editForm.referralIncentive} onChange={e => setEditForm({ ...editForm, referralIncentive: e.target.value })} />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => setEditingSchemeId(null)} className="p-2 border rounded-xl flex items-center justify-center text-text-muted">
                                                    <X size={16} />
                                                </button>
                                                <button onClick={() => handleSaveEdit(s.id)} className="p-2 bg-success text-white rounded-xl flex items-center justify-center px-4 gap-2 font-bold text-sm">
                                                    <Save size={16} /> Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-primary text-sm">{s.name}</h3>
                                                <p className="text-xs text-text-muted">{s.duration} Months • {formatCurrency(s.monthlyAmount)}/mo</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(s.id)}
                                                    className={cn(
                                                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                                        s.status === 'active'
                                                            ? "bg-success/10 text-success border border-success/20"
                                                            : "bg-danger/10 text-danger border border-danger/20"
                                                    )}
                                                >
                                                    {s.status}
                                                </button>
                                                <button onClick={() => handleEditScheme(s)} className="p-2 text-accent bg-accent/10 rounded-xl">
                                                    <Edit2 size={16} />
                                                </button>
                                                <motion.button
                                                    whileTap={{ scale: 0.8 }}
                                                    onClick={() => handleDeleteScheme(s.id)}
                                                    className="p-3 text-white bg-danger rounded-xl shadow-lg flex items-center justify-center"
                                                >
                                                    <Trash2 size={24} />
                                                </motion.button>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                );

            case 'deposit':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Manual Cash Deposit</h2>
                        </div>
                        <form onSubmit={handleDeposit} className="space-y-4">
                            <Input
                                label="Customer Phone"
                                placeholder="e.g. 9876543210"
                                required
                                value={depositCustomer}
                                onChange={(e) => handleCustomerLookup(e.target.value)}
                            />
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Target Schemes</label>
                                {customerActiveSchemes.length > 0 ? (
                                    customerActiveSchemes.map((s: any) => (
                                        <Card
                                            key={s.accountId}
                                            onClick={() => togglePlan(s.accountId)}
                                            className={cn(
                                                "p-4 border-2 transition-all cursor-pointer",
                                                selectedPlans.includes(s.accountId) ? "border-accent bg-accent-light/30" : "border-border/50"
                                            )}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                                        selectedPlans.includes(s.accountId) ? "border-accent bg-accent" : "border-border"
                                                    )}>
                                                        {selectedPlans.includes(s.accountId) && <CheckCircle size={14} className="text-white" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-primary text-sm">{s.name}</h4>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span className="text-[10px] text-success font-bold uppercase tracking-wider">{s.monthsPaid || 0} Paid</span>
                                                            <span className="text-[10px] text-text-muted/50">•</span>
                                                            <span className="text-[10px] text-warning font-bold uppercase tracking-wider">{(s.duration || 0) - (s.monthsPaid || 0)} Remaining</span>
                                                        </div>
                                                        {selectedPlans.includes(s.accountId) && (
                                                            <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                                                                <span className="text-[10px] text-text-secondary uppercase tracking-widest font-black block">Select Remaining Dues:</span>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {Array.from({ length: (s.duration || 0) - (s.monthsPaid || 0) }).map((_, i) => {
                                                                        const dueMonthNum = (s.monthsPaid || 0) + i + 1;
                                                                        const isSelected = (depositMonthsConfig[s.accountId] || 1) > i;
                                                                        return (
                                                                            <button
                                                                                key={dueMonthNum}
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const newCount = (isSelected && (depositMonthsConfig[s.accountId] || 1) === i + 1) ? Math.max(1, i) : i + 1;
                                                                                    const newConfig = { ...depositMonthsConfig, [s.accountId]: newCount };
                                                                                    setDepositMonthsConfig(newConfig);
                                                                                    calculateDepositAmount(selectedPlans, newConfig);
                                                                                }}
                                                                                className={cn(
                                                                                    "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors border uppercase tracking-widest",
                                                                                    isSelected ? "bg-primary text-white border-primary shadow-md shadow-primary/20" : "bg-white text-text-muted border-border hover:border-primary/50 hover:text-primary"
                                                                                )}
                                                                            >
                                                                                Month {dueMonthNum}
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-primary">
                                                        {formatCurrency(Number(s.monthlyAmount || s.amount || 0) * (depositMonthsConfig[s.accountId] || 1))}
                                                    </p>
                                                    <p className="text-[9px] font-black text-accent uppercase tracking-widest">Due</p>
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                ) : depositCustomer.length >= 4 ? (
                                    <p className="text-sm text-text-muted px-4 py-6 border border-border/50 bg-white rounded-xl text-center">No active schemes found for this customer.</p>
                                ) : null}
                            </div>
                            <Input label="Total Cash Collected (₹)" type="number" required value={depositAmount} readOnly />
                            <Input label="Reference Notes" placeholder="Receipt number, etc (optional)" />
                            <Button fullWidth className="mt-4 bg-success text-white" type="submit" loading={loadingData}>Confirm Deposit</Button>
                        </form>
                    </motion.div>
                );

            case 'customer_update':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Customer Phone Update</h2>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter Phone / ID"
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
                                        {!showCustomerReport ? (
                                            <div className="space-y-4">
                                                <div className="flex gap-4">
                                                    <div className="flex-1 bg-surface border border-border/50 rounded-xl p-4 text-center shadow-subtle">
                                                        <p className="text-2xl font-black text-primary">{customerPlans.length}</p>
                                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Schemes</p>
                                                    </div>
                                                    <div className="flex-1 bg-surface border border-border/50 rounded-xl p-4 text-center shadow-subtle">
                                                        <p className="text-2xl font-black text-primary">{customerTransactions.length}</p>
                                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Transactions</p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    fullWidth 
                                                    variant="outline" 
                                                    className="border-accent text-accent"
                                                    onClick={() => setShowCustomerReport(true)}
                                                >
                                                    View Full Report
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                                    <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Full Report</h4>
                                                    <button onClick={() => setShowCustomerReport(false)} className="text-[10px] font-bold text-text-muted uppercase tracking-widest hover:text-primary transition-colors">Close Report</button>
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Active Subscriptions</h4>
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

                                                <div className="pt-4 border-t border-border space-y-4">
                                                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Recent Transactions</h4>
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
                                            </div>
                                        )}
                                    </div>

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
                                </div>
                            </Card>
                        )}
                    </motion.div>
                );

            case 'customer_report':
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
                                    <Search size={20} />
                                </Button>
                            </div>
                        </Card>

                        {reportCustomer && (
                            <div className="space-y-6 relative">
                                <div className="flex justify-end gap-2 mb-4">
                                    <Button onClick={downloadReportPDF} size="sm">
                                        <Download size={16} className="mr-2" /> Download PDF
                                    </Button>
                                </div>

                                <div className="bg-white p-8 rounded-none border border-gray-300 shadow-sm max-w-4xl mx-auto font-sans text-gray-900">
                                    <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-6">
                                        <div className="flex items-center gap-4">
                                            <img src="/vasthara-logo.jpg" alt="Vastra Logo" className="w-20 h-auto object-contain mix-blend-multiply block" />
                                            <div>
                                                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-widest">SANTOSH INSTYLE VASTRA</h1>
                                                <p className="text-sm font-semibold text-gray-600 mt-1 uppercase tracking-wider">Official Account Statement</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date Generated</p>
                                            <p className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Customer Name</p>
                                            <p className="font-bold text-gray-900 text-lg uppercase">{reportCustomer.firstName} {reportCustomer.lastName || ''}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Customer ID</p>
                                            <p className="font-bold text-gray-900 text-sm">{reportCustomer.customerId || reportCustomer.id}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Phone Number</p>
                                            <p className="font-bold text-gray-900 text-lg">{reportCustomer.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Account Created</p>
                                            <p className="font-bold text-gray-900 text-sm">{reportCustomer.createdAt ? formatDate(reportCustomer.createdAt) : 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-200">
                                        {(['all', 'active', 'completed', 'closed'] as const).map(tab => (
                                            <button 
                                                key={tab}
                                                onClick={() => setReportSchemeTab(tab)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${reportSchemeTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-8">
                                        {(reportSchemeTab === 'all' ? reportSchemes : reportSchemes.filter(s => (s.status || 'active') === reportSchemeTab)).map((scheme, idx) => (
                                            <div key={scheme.accountId} className="break-inside-avoid">
                                                <div className="bg-gray-100 p-3 flex justify-between items-center border border-gray-300 border-b-0">
                                                    <div>
                                                        <h4 className="font-black text-gray-900 uppercase text-lg">{scheme.schemeName || scheme.name}</h4>
                                                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Account: {scheme.accountId}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {scheme.isPreClosed && (
                                                            <span className="inline-block px-3 py-1 bg-red-700 text-white text-[10px] font-black uppercase tracking-wider">PRE-CLOSED</span>
                                                        )}
                                                        {!scheme.isPreClosed && (!scheme.status || scheme.status === 'active') && (
                                                            <button
                                                                onClick={() => handleInitiateAdminPreClose(scheme)}
                                                                className="px-3 py-1.5 bg-orange-100 border border-orange-400 text-orange-700 text-[10px] font-black uppercase tracking-wider rounded hover:bg-orange-400 hover:text-white transition-colors"
                                                            >
                                                                ⚠ Pre-Close This Scheme
                                                            </button>
                                                        )}
                                                        <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                                                            scheme.status === 'completed' ? 'bg-green-700 text-white' :
                                                            scheme.status === 'closed' ? 'bg-gray-700 text-white' :
                                                            'bg-gray-900 text-white'
                                                        }`}>
                                                            {scheme.isPreClosed ? 'Pre-Closed' : (scheme.status || 'Active')}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="border border-gray-300 p-4 mb-2">
                                                    <div className="flex justify-between text-sm font-bold text-gray-900 mb-4 border-b border-gray-200 pb-3">
                                                        <div>Monthly Amount: <span className="font-black text-green-700">₹{scheme.amount || scheme.monthlyAmount}</span></div>
                                                        <div>Duration: <span className="font-black">{scheme.duration || 11} Months</span></div>
                                                        <div>Total Paid: <span className="font-black text-green-700 text-lg">₹{scheme.totalPaid || 0}</span></div>
                                                    </div>

                                                    {(scheme.bonuses || scheme.gifts) && !scheme.isPreClosed && (
                                                        <div className="mb-4 bg-gray-50 p-2 border border-dashed border-gray-300">
                                                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-wider mb-1">Bonuses & Gifts</p>
                                                            <div className="flex flex-col gap-0.5 text-xs font-bold text-gray-900">
                                                                {scheme.bonuses && <p>• {scheme.bonuses}</p>}
                                                                {scheme.gifts && <p>• {scheme.gifts}</p>}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="mt-4">
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Transaction Ledger</p>
                                                        <table className="w-full text-left text-xs border-collapse">
                                                            <thead>
                                                                <tr className="border-b-2 border-gray-300 text-gray-900">
                                                                    <th className="py-2 pr-1 font-black uppercase">Date</th>
                                                                    <th className="py-2 px-1 font-black uppercase text-center">Type</th>
                                                                    <th className="py-2 px-1 font-black uppercase text-center">Status</th>
                                                                    <th className="py-2 pl-1 font-black uppercase text-right">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {reportTransactions[scheme.accountId] && reportTransactions[scheme.accountId].length > 0 ? (
                                                                    reportTransactions[scheme.accountId].map((tx: any) => (
                                                                        <tr key={tx.id} className="border-b border-gray-200 text-gray-800">
                                                                            <td className="py-2 pr-1 font-medium">{tx.date || formatDate(tx.timestamp)}</td>
                                                                            <td className="py-2 px-1 text-center">{tx.type || 'Cash'}</td>
                                                                            <td className="py-2 px-1 font-bold text-green-700 uppercase text-[10px] text-center">{tx.status}</td>
                                                                            <td className="py-2 pl-1 font-black text-right">₹{tx.amount}</td>
                                                                        </tr>
                                                                    ))
                                                                ) : (
                                                                    <tr>
                                                                        <td colSpan={4} className="py-4 text-center text-gray-500 italic font-medium">No transactions found.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="mt-12 pt-4 border-t-2 border-gray-900 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        This is a computer generated statement and does not require a physical signature.
                                    </div>
                                </div>

                                {/* Hidden Print Version */}
                                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none', zIndex: -50 }}>
                                    <div id="customer-report-print-content" style={{ width: '800px', background: '#ffffff', padding: '40px', fontFamily: 'Arial, sans-serif', color: '#111827' }}>
                                        <table style={{ width: '100%', borderBottom: '2px solid #111827', paddingBottom: '24px', marginBottom: '32px' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ verticalAlign: 'middle', width: '15%' }}>
                                                        <img src="/vasthara-logo.jpg" alt="Vastra Logo" style={{ width: '80px', height: 'auto', mixBlendMode: 'multiply', display: 'block' }} />
                                                    </td>
                                                    <td style={{ verticalAlign: 'middle', width: '45%' }}>
                                                        <h1 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '26px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 900 }}>SANTOSH INSTYLE VASTRA</h1>
                                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>Official Account Statement</p>
                                                    </td>
                                                    <td style={{ verticalAlign: 'top', width: '40%', textAlign: 'right' }}>
                                                        <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Date Generated</p>
                                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827' }}>{new Date().toLocaleDateString()}</p>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <table style={{ width: '100%', marginBottom: '40px' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ verticalAlign: 'top', width: '25%' }}>
                                                        <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer Name</p>
                                                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827', textTransform: 'uppercase' }}>{reportCustomer.firstName} {reportCustomer.lastName || ''}</p>
                                                    </td>
                                                    <td style={{ verticalAlign: 'top', width: '25%' }}>
                                                        <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer ID</p>
                                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#111827' }}>{reportCustomer.customerId || reportCustomer.id}</p>
                                                    </td>
                                                    <td style={{ verticalAlign: 'top', width: '25%' }}>
                                                        <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Phone Number</p>
                                                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>{reportCustomer.phone}</p>
                                                    </td>
                                                    <td style={{ verticalAlign: 'top', width: '25%' }}>
                                                        <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Account Created</p>
                                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#111827' }}>{reportCustomer.createdAt ? new Date(reportCustomer.createdAt).toLocaleDateString() : 'N/A'}</p>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {(reportSchemeTab === 'all' ? reportSchemes : reportSchemes.filter(s => (s.status || 'active') === reportSchemeTab)).map((scheme, idx) => (
                                            <div key={scheme.accountId} style={{ marginBottom: '32px', pageBreakInside: 'avoid' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db' }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ background: '#f3f4f6', padding: '12px 16px', borderBottom: '1px solid #d1d5db' }}>
                                                                <table style={{ width: '100%' }}>
                                                                    <tbody>
                                                                        <tr>
                                                                            <td style={{ verticalAlign: 'middle' }}>
                                                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 900, color: '#111827', textTransform: 'uppercase' }}>{scheme.schemeName || scheme.name}</h4>
                                                                                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>Account: {scheme.accountId}</p>
                                                                            </td>
                                                                            <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                                                                                <span style={{ 
                                                                                    display: 'inline-block', padding: '4px 12px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', 
                                                                                    background: scheme.isPreClosed ? '#b91c1c' : scheme.status === 'completed' ? '#15803d' : scheme.status === 'closed' ? '#374151' : '#111827',
                                                                                    color: '#ffffff'
                                                                                }}>
                                                                                    {scheme.isPreClosed ? 'Pre-Closed' : (scheme.status || 'Active')}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: '16px' }}>
                                                                <table style={{ width: '100%', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
                                                                    <tbody>
                                                                        <tr>
                                                                            <td style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Monthly Amount: <span style={{ color: '#15803d', fontWeight: 900 }}>₹{scheme.amount || scheme.monthlyAmount}</span></td>
                                                                            <td style={{ fontSize: '13px', fontWeight: 700, color: '#111827', textAlign: 'center' }}>Duration: <span style={{ fontWeight: 900 }}>{scheme.duration || 11} Months</span></td>
                                                                            <td style={{ fontSize: '13px', fontWeight: 700, color: '#111827', textAlign: 'right' }}>Total Paid: <span style={{ color: '#15803d', fontWeight: 900, fontSize: '16px' }}>₹{scheme.totalPaid || 0}</span></td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>

                                                                {(scheme.bonuses || scheme.gifts) && !scheme.isPreClosed && (
                                                                    <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', border: '1px dashed #d1d5db' }}>
                                                                        <p style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: 900, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>Bonuses & Gifts</p>
                                                                        {scheme.bonuses && <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 700, color: '#111827' }}>• {scheme.bonuses}</p>}
                                                                        {scheme.gifts && <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#111827' }}>• {scheme.gifts}</p>}
                                                                    </div>
                                                                )}

                                                                <p style={{ margin: '0 0 12px 0', fontSize: '10px', fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '2px' }}>Transaction Ledger</p>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                                                    <thead>
                                                                        <tr style={{ borderBottom: '2px solid #d1d5db' }}>
                                                                            <th style={{ padding: '8px 4px', fontWeight: 900, textTransform: 'uppercase', color: '#111827' }}>Date</th>
                                                                            <th style={{ padding: '8px 4px', fontWeight: 900, textTransform: 'uppercase', color: '#111827', textAlign: 'center' }}>Type</th>
                                                                            <th style={{ padding: '8px 4px', fontWeight: 900, textTransform: 'uppercase', color: '#111827', textAlign: 'center' }}>Status</th>
                                                                            <th style={{ padding: '8px 4px', fontWeight: 900, textTransform: 'uppercase', color: '#111827', textAlign: 'right' }}>Amount</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {reportTransactions[scheme.accountId] && reportTransactions[scheme.accountId].length > 0 ? (
                                                                            reportTransactions[scheme.accountId].map((tx: any) => (
                                                                                <tr key={tx.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                                                    <td style={{ padding: '8px 4px', fontWeight: 600, color: '#374151' }}>{tx.date || new Date(tx.timestamp).toLocaleDateString()}</td>
                                                                                    <td style={{ padding: '8px 4px', color: '#374151', textAlign: 'center' }}>{tx.type || 'Cash'}</td>
                                                                                    <td style={{ padding: '8px 4px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', fontSize: '10px', textAlign: 'center' }}>{tx.status}</td>
                                                                                    <td style={{ padding: '8px 4px', fontWeight: 900, color: '#111827', textAlign: 'right' }}>₹{tx.amount}</td>
                                                                                </tr>
                                                                            ))
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={4} style={{ padding: '16px 4px', textAlign: 'center', color: '#6b7280', fontStyle: 'italic', fontWeight: 600 }}>No transactions found.</td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))}

                                        <div style={{ marginTop: '48px', paddingTop: '16px', borderTop: '2px solid #111827', textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                            This is a computer generated statement and does not require a physical signature.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                );

            case 'staff_mgmt':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setActiveView('overview')} className="text-primary">
                                    <ChevronLeft size={24} />
                                </button>
                                <h2 className="text-xl font-display font-bold text-primary">Staff Authority Management</h2>
                            </div>
                            <button onClick={handleDownloadStaffCSV} className="p-2 text-accent bg-accent/10 rounded-xl hover:bg-accent/20 transition-all flex items-center gap-2 text-xs font-bold">
                                <Download size={18} />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                        </div>

                        {editingStaff ? (
                            <form onSubmit={handleUpdateStaffAuthority} className="space-y-4">
                                <h3 className="text-sm font-bold text-primary">Editing: {editingStaff.firstName} {editingStaff.lastName}</h3>
                                <Input label="Mobile" value={editingStaff.phone} readOnly className="opacity-60 bg-surface" />
                                <Input label="Employee ID (Referral Code)" value={editingStaff.empId || ''} onChange={e => setEditingStaff({ ...editingStaff, empId: e.target.value })} className="text-accent font-bold" />
                                <Input label="Assigned Branch" value={editingStaff.branch || ''} onChange={e => setEditingStaff({ ...editingStaff, branch: e.target.value })} />
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Access Level</label>
                                    <select
                                        className="w-full h-12 bg-white border border-border rounded-xl px-4 text-sm font-bold text-gray-900"
                                        value={editingStaff.accessLevel || 'standard'}
                                        onChange={e => setEditingStaff({ ...editingStaff, accessLevel: e.target.value })}
                                    >
                                        <option value="standard">Standard Field Staff</option>
                                        <option value="manager">Branch Manager</option>
                                        <option value="super">Super Staff</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <Button fullWidth variant="outline" onClick={() => setEditingStaff(null)}>Cancel</Button>
                                    <Button fullWidth type="submit" loading={loadingData}>Save Changes</Button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-3">
                                {staffList.map(staff => {


                                    return (
                                        <Card key={staff.id} className="p-4 border-none shadow-subtle flex justify-between items-center bg-white">
                                            <div>
                                                <p className="text-sm font-bold text-primary">{staff.firstName} {staff.lastName}</p>
                                                <p className="text-[10px] text-text-muted uppercase tracking-widest">EMP: {staff.empId || 'N/A'} • {staff.branch || 'No Branch'} • {staff.accessLevel || 'standard'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingStaff(staff)} className="p-2 text-accent bg-accent/10 rounded-xl hover:bg-accent/20 transition-all">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={async () => {
                                                        if (window.confirm(`Are you sure you want to delete staff account for ${staff.firstName}? This action cannot be undone.`)) {
                                                            setLoadingData(true);
                                                            try {
                                                                const { deleteUserFromDB } = await import('../services/db');
                                                                await deleteUserFromDB(staff.id);
                                                                showNotif('Staff account deleted successfully', 'success');
                                                                loadStaffList();
                                                            } catch (err) {
                                                                showNotif('Failed to delete staff account', 'error');
                                                            } finally {
                                                                setLoadingData(false);
                                                            }
                                                        }
                                                    }}
                                                    className="p-2 text-danger bg-danger/10 rounded-xl hover:bg-danger/20 transition-all"
                                                    title="Delete Staff Account"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                );

            case 'staff':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Staff Approvals & Rights</h2>
                        </div>
                        {approvalModalData?.isOpen ? (
                            <form onSubmit={confirmStaffApproval} className="space-y-4 bg-white p-6 rounded-2xl shadow-subtle border border-border">
                                <h3 className="text-xl font-bold text-primary mb-4">Approve Staff: {approvalModalData.request.name}</h3>
                                <Input 
                                    label="Assigned Branch" 
                                    value={approvalModalData.branch} 
                                    onChange={e => setApprovalModalData({...approvalModalData, branch: e.target.value})} 
                                />
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Access Level</label>
                                    <select
                                        className="w-full h-12 bg-white border border-border rounded-xl px-4 text-sm font-bold text-gray-900"
                                        value={approvalModalData.accessLevel}
                                        onChange={e => setApprovalModalData({...approvalModalData, accessLevel: e.target.value})}
                                    >
                                        <option value="standard">Standard Field Staff</option>
                                        <option value="super">Super Staff</option>
                                        <option value="manager">Branch Manager</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 pt-4 border-t border-border/50">
                                    <Button fullWidth variant="outline" type="button" onClick={() => setApprovalModalData(null)}>Cancel</Button>
                                    <Button fullWidth type="submit" loading={loadingData} className="bg-success text-white">Confirm Approval</Button>
                                </div>
                            </form>
                        ) : (
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
                                                <button onClick={() => handleStaffAction(staff.id, 'approve')} className="p-2 bg-success/10 text-success rounded-xl">
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button onClick={() => handleStaffAction(staff.id, 'reject')} className="p-2 bg-danger/10 text-danger rounded-xl">
                                                    <XCircle size={18} />
                                                </button>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}
                    </motion.div>
                );

            case 'redemptions':
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
                                    placeholder="Search Customer ID or Phone Number..."
                                    value={redemptionsSearch}
                                    onChange={e => setRedemptionsSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-primary uppercase tracking-wider text-xs">Pending Redemptions</h3>
                            </div>
                            
                            {(() => {
                                const filteredPendingSchemes = completedSchemes.filter((scheme: any) => {
                                    const query = redemptionsSearch.toLowerCase();
                                    const idMatch = scheme.customerId?.toLowerCase().includes(query) || scheme.userId?.toLowerCase().includes(query);
                                    const phoneMatch = scheme.userId?.toLowerCase().includes(query);
                                    return !query || idMatch || phoneMatch;
                                });

                                if (filteredPendingSchemes.length === 0) {
                                    return (
                                        <Card className="p-6 text-center border-dashed border-2">
                                            <p className="text-sm text-text-muted">No pending redemptions found matching your search.</p>
                                        </Card>
                                    );
                                }

                                return filteredPendingSchemes.map((scheme: any) => (
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
                                                            showNotif('Customer phone number not found. Cannot send OTP.', 'error');
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
                                                                showNotif('OTP sent to customer\'s phone', 'success');
                                                            } else {
                                                                showNotif('Failed to send OTP to customer', 'error');
                                                            }
                                                        } catch(e) {
                                                            showNotif('Error sending OTP', 'error');
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
                                ));
                            })()}

                            <div className="flex justify-between items-center mt-8 mb-4">
                                <h3 className="font-bold text-primary uppercase tracking-wider text-xs">Closed / Fulfilled Schemes</h3>
                            </div>

                            {(() => {
                                const filteredClosedSchemes = closedSchemes.filter(scheme => {
                                    const query = redemptionsSearch.toLowerCase();
                                    const idMatch = scheme.customerId?.toLowerCase().includes(query) || scheme.userId?.toLowerCase().includes(query);
                                    const phoneMatch = scheme.userId?.toLowerCase().includes(query);
                                    return !query || idMatch || phoneMatch;
                                });

                                if (filteredClosedSchemes.length === 0) {
                                    return (
                                        <Card className="p-6 text-center border-dashed border-2">
                                            <p className="text-sm text-text-muted">No closed schemes found matching your search.</p>
                                        </Card>
                                    );
                                }

                                return filteredClosedSchemes.map((scheme: any) => (
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
                                ));
                            })()}
                        </div>
                    </motion.div>
                );

            case 'settings':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Security Settings</h2>
                        </div>
                        <form onSubmit={handleUpdateSecurity} className="space-y-4">
                            <Input
                                label="Admin Username"
                                value={adminSettings.adminId}
                                onChange={e => setAdminSettings({ ...adminSettings, adminId: e.target.value })}
                            />
                            <Input
                                label="New Admin Password"
                                type="password"
                                value={adminSettings.password}
                                onChange={e => setAdminSettings({ ...adminSettings, password: e.target.value })}
                            />
                            <Input
                                label="Security PIN (4 Digits)"
                                type="password"
                                maxLength={4}
                                value={adminSettings.securityPin}
                                onChange={e => setAdminSettings({ ...adminSettings, securityPin: e.target.value })}
                            />
                            <Button fullWidth type="submit" loading={loadingData}>
                                <Save size={16} className="mr-2" /> Save Changes
                            </Button>

                            <div className="pt-8 border-t border-border/50 space-y-4">
                                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Database Maintenance</h3>
                                <Card className="p-4 bg-surface rounded-2xl border border-border/50 space-y-3">
                                    <div>
                                        <p className="text-sm font-bold text-primary">OTP Purge Utility</p>
                                        <p className="text-[10px] text-text-muted mt-1 leading-relaxed">Smartly scan and permanently delete old, expired, and verified OTPs from the database to save storage space.</p>
                                    </div>
                                    <Button 
                                        fullWidth 
                                        variant="outline" 
                                        type="button"
                                        onClick={async () => {
                                            const { purgeOldOTPsFromDB } = await import('../services/db');
                                            showNotif("Scanning and purging old OTPs...", "info");
                                            const deletedCount = await purgeOldOTPsFromDB();
                                            if (deletedCount >= 0) {
                                                showNotif(`Cleanup complete! Successfully deleted ${deletedCount} OTP records.`, "success");
                                            } else {
                                                showNotif("Failed to purge OTPs.", "error");
                                            }
                                        }}
                                        className="border-danger/30 text-danger hover:bg-danger/10 hover:border-danger transition-colors text-xs"
                                    >
                                        <Trash2 size={16} className="mr-2" /> Purge Old OTPs
                                    </Button>
                                </Card>
                            </div>

                            <div className="pt-8 border-t border-border/50 space-y-4">
                                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Add New Administrator</h3>
                                {!showAddAdmin ? (
                                    <Button variant="outline" fullWidth onClick={async () => {
                                        setShowAddAdmin(true);
                                        const list = await getAllAdminsFromDB();
                                        setAdminsList(list);
                                    }}>
                                        <Plus size={18} className="mr-2" /> ADD ANOTHER ADMIN
                                    </Button>
                                ) : (
                                    <div className="p-4 bg-surface rounded-2xl border border-border/50 space-y-4">
                                        <Input
                                            label="Admin Phone Number"
                                            value={newAdmin.adminId}
                                            onChange={e => setNewAdmin({ ...newAdmin, adminId: e.target.value })}
                                        />
                                        <Input
                                            label="Password"
                                            type="password"
                                            value={newAdmin.password}
                                            onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                            hint="Password must be at least 6 characters"
                                        />
                                        <Input
                                            label="Security PIN"
                                            type="password"
                                            maxLength={4}
                                            value={newAdmin.securityPin}
                                            onChange={e => setNewAdmin({ ...newAdmin, securityPin: e.target.value })}
                                        />
                                        <div className="flex gap-2">
                                            <Button fullWidth variant="outline" type="button" onClick={() => setShowAddAdmin(false)}>Cancel</Button>
                                            <Button fullWidth type="button" loading={loadingData} onClick={handleAddAdmin}>Create Admin</Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Admins list with Delete button — only shown to primary admin */}
                            {isPrimaryAdmin && (
                                <div className="pt-6 border-t border-border/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-danger uppercase tracking-[0.2em]">Manage Administrators</h3>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const list = await getAllAdminsFromDB();
                                                setAdminsList(list);
                                                showNotif(`Loaded ${list.length} admin(s)`);
                                            }}
                                            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                                        >
                                            ↻ Refresh
                                        </button>
                                    </div>
                                    {adminsList.length === 0 ? (
                                        <p className="text-xs text-text-muted py-2">No admins found. Click ↻ Refresh to reload.</p>
                                    ) : (
                                        adminsList
                                            .sort((a, b) => a.docId === 'main_admin' ? -1 : 1) // Keep primary at top
                                            .map((a: any) => (
                                                <div key={a.docId} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border/50">
                                                    <div>
                                                        <p className="text-sm font-bold text-primary">{a.adminId}</p>
                                                        <p className={cn("text-[10px] font-bold uppercase tracking-wider", a.docId === 'main_admin' ? "text-accent" : "text-text-muted")}>
                                                            {a.docId === 'main_admin' ? "Primary Admin" : "Secondary Admin"}
                                                        </p>
                                                    </div>
                                                    {a.docId !== 'main_admin' && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                await deleteAdminFromDB(a.docId);
                                                                const updated = await getAllAdminsFromDB();
                                                                setAdminsList(updated);
                                                                showNotif('Admin deleted successfully');
                                                            }}
                                                            className="p-2 bg-danger/10 text-danger rounded-xl hover:bg-danger/20 transition-colors"
                                                            title="Delete Admin"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                    )}
                                </div>
                            )}
                        </form>

                        {isPrimaryAdmin && (
                            <div className="mt-12 pt-8 border-t-2 border-danger/20 space-y-4">
                                <h3 className="text-sm font-black text-danger uppercase tracking-[0.2em] flex items-center gap-2">
                                    <AlertTriangle size={18} /> Danger Zone
                                </h3>
                                <p className="text-xs text-text-muted">
                                    This action is irreversible. It will delete all schemes, customers, transactions, and other app data, leaving only the primary admin account.
                                </p>
                                <Button 
                                    fullWidth 
                                    className="bg-danger text-white hover:bg-danger/80" 
                                    onClick={handleInitiateReset}
                                >
                                    RESET APP (CLEAR ALL DATA)
                                </Button>
                                
                                <ConfirmModal
                                    isOpen={showResetModal}
                                    title="DANGER: Reset Application Data"
                                    message="Are you absolutely sure? This will delete ALL customer data, schemes, transactions, and staff accounts. This action is IRREVERSIBLE."
                                    confirmText="YES, DELETE EVERYTHING"
                                    cancelText="CANCEL"
                                    onConfirm={handleResetApp}
                                    onCancel={() => setShowResetModal(false)}
                                />

                                <AnimatePresence>
                                    {showResetPinPrompt && (
                                        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={() => setShowResetPinPrompt(false)}
                                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                            />
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                                className="relative w-full max-w-sm bg-surface rounded-3xl shadow-2xl overflow-hidden border border-border/50 p-8 space-y-6"
                                            >
                                                <div className="text-center space-y-2">
                                                    <h3 className="text-xl font-display font-bold text-primary">Verify PIN to Reset</h3>
                                                    <p className="text-sm text-text-secondary">Enter your 4-digit PIN to confirm.</p>
                                                </div>

                                                <div className="flex justify-center gap-6">
                                                    {[0, 1, 2, 3].map((i) => (
                                                        <div
                                                            key={i}
                                                            className={cn(
                                                                "w-12 h-12 rounded-full border-2 border-border flex items-center justify-center transition-all",
                                                                resetPin[i] ? "bg-primary border-primary" : "bg-surface",
                                                                resetPinError && "border-danger animate-shake"
                                                            )}
                                                        >
                                                            {resetPin[i] && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                                        </div>
                                                    ))}
                                                </div>

                                                {resetPinError && (
                                                    <p className="text-center text-xs font-bold text-danger uppercase tracking-widest">
                                                        Incorrect PIN
                                                    </p>
                                                )}

                                                <div className="pt-4">
                                                    <NumericKeypad 
                                                        value={resetPin}
                                                        onChange={handleResetPinChange}
                                                    />
                                                </div>

                                                <button
                                                    onClick={() => setShowResetPinPrompt(false)}
                                                    className="absolute top-4 right-4 p-2 text-text-muted hover:bg-black/5 rounded-full transition-colors"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                );

            case 'tally': {
                const start = new Date(tallyStartDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(tallyEndDate);
                end.setHours(23, 59, 59, 999);
                
                const rangeTx = allTransactions.filter(t => {
                    // Use safeDate to properly handle Firestore Timestamp objects
                    const txDate = safeDate(t.timestamp);
                    const inRange = txDate >= start && txDate <= end;
                    // Only include CASH transactions in the tally
                    const isCash = !t.method || t.method.toUpperCase() === 'CASH';
                    return inRange && isCash;
                });
                const total = rangeTx.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
                
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setActiveView('overview')} className="text-primary"><ChevronLeft size={24} /></button>
                                <h2 className="text-xl font-display font-bold text-primary">Daily Cash Tally</h2>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    const el = document.getElementById('admin-tally-report-content');
                                    if (el) downloadAsPDF(el, 'Daily_Tally_Report');
                                }} className="p-2 text-accent bg-accent/10 rounded-xl hover:bg-accent/20 transition-all flex items-center gap-2 text-xs font-bold">
                                    <Printer size={18} />
                                    <span className="hidden sm:inline">PDF</span>
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

                        <div id="admin-tally-report-content" className="space-y-6">
                            <div className="bg-primary p-6 rounded-2xl text-white shadow-lg">
                                <p className="text-xs opacity-70 uppercase tracking-widest">Total Collected</p>
                                <p className="text-4xl font-bold">₹{total}</p>
                            </div>
                            <div className="space-y-3">
                                {rangeTx.length === 0 ? (
                                    <p className="text-center text-text-muted py-8">No transactions found for this date range.</p>
                                ) : (
                                    rangeTx.map((tx: any) => {
                                        return (
                                            <div key={tx.id} className="p-4 bg-white rounded-xl border border-border flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-bold">{tx.userName || 'Customer'}</p>
                                                    <p className="text-[10px] text-gray-500">{tx.schemeName || 'Scheme'}</p>
                                                    <p className="text-[9px] font-bold text-accent uppercase tracking-widest mt-1">
                                                        Collected by: {tx.recordedBy === 'admin' ? 'Admin' : (staffList.find(s => s.id === tx.recordedBy)?.firstName || tx.recordedBy || 'Unknown')}
                                                    </p>
                                                </div>
                                                <p className="font-bold text-primary">₹{tx.amount}</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            }

            case 'transactions':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={handleBack} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Download Transactions</h2>
                        </div>
                        <div className="space-y-6">
                            <p className="text-sm border-l-4 border-accent pl-3 text-text-secondary">
                                Select a custom date range to generate and download a full CSV report of all customer transactions.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Start Date"
                                    type="date"
                                    value={incentiveRange.start}
                                    onChange={(e) => setIncentiveRange({ ...incentiveRange, start: e.target.value })}
                                />
                                <Input
                                    label="End Date"
                                    type="date"
                                    value={incentiveRange.end}
                                    onChange={(e) => setIncentiveRange({ ...incentiveRange, end: e.target.value })}
                                />
                            </div>
                            <Button fullWidth onClick={handleFilterTransactions} loading={loadingData}>
                                Fetch Transactions
                            </Button>
                            {transactionReport.length > 0 && (
                                <>
                                    <p className="text-xs text-center text-success font-bold">
                                        ✓ {transactionReport.length} transactions found for selected period.
                                    </p>
                                    <Button
                                        fullWidth
                                        variant="outline"
                                        className="border-accent text-accent"
                                        onClick={handleDownloadCSV}
                                    >
                                        <FileText size={18} className="mr-2 inline" /> Download CSV Report
                                    </Button>
                                </>
                            )}
                            {transactionReport.length === 0 && !loadingData && incentiveRange.start && incentiveRange.end && (
                                <p className="text-sm text-center text-text-muted py-4">No transactions found for this period.</p>
                            )}
                        </div>
                    </motion.div>
                );

            case 'analytics':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={handleBack} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Analytics & Reports</h2>
                        </div>

                        {/* CHARTS */}
                        <div className="space-y-6">
                            <Card className="p-4 border-none shadow-subtle bg-white">
                                <h3 className="text-sm font-bold text-primary mb-4 uppercase tracking-widest">Current Month Revenue (By Scheme)</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analyticsData.monthlyRevenue}>
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                            <Tooltip 
                                                formatter={(value, name) => {
                                                    if (name === 'amount') return [`₹${value}`, 'Revenue'];
                                                    if (name === 'users') return [value, 'Users Paid'];
                                                    return [value, name];
                                                }}
                                                cursor={{ fill: '#f3f4f6' }} 
                                            />
                                            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            <Card className="p-4 border-none shadow-subtle bg-white">
                                <h3 className="text-sm font-bold text-primary mb-4 uppercase tracking-widest">Scheme Popularity</h3>
                                <div className="h-80 pb-6">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={analyticsData.schemePopularity} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} label>
                                                {analyticsData.schemePopularity.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>

                        <div className="mt-8 pt-8 border-t border-border/50 space-y-4">
                            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Bulk Data Export</h3>
                            <Button fullWidth onClick={handleExportCustomers} className="flex justify-center items-center gap-2">
                                <Download size={18} /> Export All Customers (Excel)
                            </Button>
                            <Button fullWidth variant="outline" onClick={handleExportSubscriptions} className="flex justify-center items-center gap-2">
                                <Download size={18} /> Export Subscriptions (Excel)
                            </Button>
                        </div>
                    </motion.div>
                );

            case 'defaulters':
                const now = new Date();
                const defaultersList = allPlans.filter(p => {
                    if (p.status === 'completed') return false;
                    const joinDate = new Date(p.joinedAt || p.enrollmentDate || now);
                    const monthsElapsed = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
                    const expectedPaid = Math.min(monthsElapsed + 1, Number(p.duration || 11));
                    return expectedPaid > (p.monthsPaid || 0);
                }).map(p => {
                    const u = usersList.find(user => user.id === p.userId || user.phone === p.userId) || {};
                    const joinDate = new Date(p.joinedAt || p.enrollmentDate || now);
                    const monthsElapsed = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
                    const expectedPaid = Math.min(monthsElapsed + 1, Number(p.duration || 11));
                    return {
                        ...p,
                        userName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown',
                        userPhone: u.phone || p.userId,
                        dueMonths: expectedPaid - (p.monthsPaid || 0)
                    };
                });

                const handleExportDefaulters = async () => {
                    if (!defaultersList.length) return showNotif("No defaulters to export", "error");
                    const headers = ["Customer Name", "Phone No", "Scheme Name", "Months Due", "Paid Installments", "Total Duration"];
                    
                    const sorted = [...defaultersList].sort((a, b) => a.userName.localeCompare(b.userName));

                    const rows = sorted.map(d => [
                        d.userName,
                        d.userPhone,
                        d.name || d.schemeName,
                        d.dueMonths,
                        d.monthsPaid || 0,
                        d.duration || 'N/A'
                    ]);

                    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Defaulters");
                    const base64 = workbookToBase64(wb, XLSX);
                    await downloadFile(base64, `defaulters_export_${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true);
                };

                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <div className="flex items-center gap-4">
                                <button onClick={handleBack} className="text-primary">
                                    <ChevronLeft size={24} />
                                </button>
                                <h2 className="text-xl font-display font-bold text-primary">Defaulter Tracking</h2>
                            </div>
                            <Button size="sm" onClick={handleExportDefaulters} variant="outline" className="flex items-center gap-2 px-3 py-1.5 h-auto text-xs">
                                <Download size={14} /> Export (Excel)
                            </Button>
                        </div>
                        
                        <div className="bg-danger/10 p-4 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="text-danger flex-shrink-0" size={20} />
                            <p className="text-xs text-danger font-bold">
                                Customers listed below have missed one or more monthly payments based on their join date.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {defaultersList.length > 0 ? defaultersList.map((d, idx) => (
                                <Card key={d.accountId || idx} className="p-4 border-none shadow-subtle bg-white flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-primary text-sm">{d.userName}</p>
                                        <p className="text-[10px] text-text-muted mt-0.5">{d.name || d.schemeName} • {d.userPhone}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-danger">{d.dueMonths} Month(s) Due</p>
                                        <p className="text-[10px] text-text-muted">Paid: {d.monthsPaid}/{d.duration}</p>
                                    </div>
                                </Card>
                            )) : (
                                <p className="text-sm text-center text-success py-8 font-bold flex flex-col items-center gap-2">
                                    <CheckCircle size={32} />
                                    No defaulters found!
                                </p>
                            )}
                        </div>
                    </motion.div>
                );

            case 'broadcast':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Broadcast Announcement</h2>
                        </div>
                        
                        <div className="bg-primary/10 p-4 rounded-xl flex items-start gap-3">
                            <Megaphone className="text-primary flex-shrink-0" size={20} />
                            <p className="text-xs text-primary font-bold">
                                Send a direct notification to customers. This will appear in their app's notification bell.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                variant={broadcastMode === 'all' ? 'primary' : 'outline'}
                                onClick={() => setBroadcastMode('all')}
                                className="flex-1"
                            >
                                Broadcast to All
                            </Button>
                            <Button
                                variant={broadcastMode === 'custom' ? 'primary' : 'outline'}
                                onClick={() => setBroadcastMode('custom')}
                                className="flex-1"
                            >
                                Custom Broadcast
                            </Button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!broadcastData.title || !broadcastData.message) return showNotif('Please fill both fields', 'error');
                            setLoadingData(true);
                            try {
                                const allU = await getAllUsersFromDB();
                                const targets = broadcastMode === 'all' ? allU : allU.filter(u => selectedUsersForBroadcast.includes(u.id));
                                
                                if (broadcastMode === 'custom' && targets.length === 0) {
                                    setLoadingData(false);
                                    return showNotif('Please select at least one customer', 'error');
                                }

                                await broadcastNotificationsToDB(targets.map(u => u.id), broadcastData.title, broadcastData.message, 'broadcast');
                                showNotif(`Broadcast sent to ${targets.length} customers!`, 'success');
                                setBroadcastData({ title: '', message: '' });
                                setSelectedUsersForBroadcast([]);
                                setActiveView('overview');
                            } catch (err) {
                                console.error(err);
                                showNotif('Failed to send broadcast.', 'error');
                            } finally {
                                setLoadingData(false);
                            }
                        }} className="space-y-4">
                            <Input
                                label="Announcement Title"
                                value={broadcastData.title}
                                onChange={e => setBroadcastData({ ...broadcastData, title: e.target.value })}
                                required
                            />
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Message Content</label>
                                <textarea
                                    className="w-full min-h-[100px] bg-white border border-border rounded-xl p-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={broadcastData.message}
                                    onChange={e => setBroadcastData({ ...broadcastData, message: e.target.value })}
                                    required
                                />
                            </div>

                            {broadcastMode === 'custom' && (
                                <div className="space-y-2 border border-border p-2 rounded-xl">
                                    <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-border flex-wrap gap-2">
                                        <span className="text-xs font-bold text-text-secondary uppercase">Select Customers</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const filteredUsers = usersList.filter((u: any) => `${u.firstName} ${u.lastName} ${u.phone}`.toLowerCase().includes(broadcastSearchQuery.toLowerCase()));
                                                const filteredIds = filteredUsers.map((u: any) => u.id);
                                                const allSelected = filteredIds.every((id: string) => selectedUsersForBroadcast.includes(id));
                                                
                                                if (allSelected && filteredIds.length > 0) {
                                                    setSelectedUsersForBroadcast(selectedUsersForBroadcast.filter(id => !filteredIds.includes(id)));
                                                } else {
                                                    setSelectedUsersForBroadcast(Array.from(new Set([...selectedUsersForBroadcast, ...filteredIds])));
                                                }
                                            }}
                                            className="text-xs text-accent font-bold hover:underline"
                                        >
                                            Select/Deselect Visible
                                        </button>
                                    </div>
                                    <div className="px-2 mb-2">
                                        <input 
                                            type="text" 
                                            placeholder="Search by name or phone..." 
                                            className="w-full text-sm p-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary"
                                            value={broadcastSearchQuery}
                                            onChange={(e) => setBroadcastSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                                        {usersList.length === 0 ? (
                                            <p className="text-sm text-text-muted text-center py-4">No customers found.</p>
                                        ) : (
                                            usersList
                                            .filter((u: any) => `${u.firstName} ${u.lastName} ${u.phone}`.toLowerCase().includes(broadcastSearchQuery.toLowerCase()))
                                            .map((u: any) => (
                                                <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-surface rounded-lg cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 text-primary border-border rounded focus:ring-primary"
                                                        checked={selectedUsersForBroadcast.includes(u.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedUsersForBroadcast([...selectedUsersForBroadcast, u.id]);
                                                            } else {
                                                                setSelectedUsersForBroadcast(selectedUsersForBroadcast.filter(id => id !== u.id));
                                                            }
                                                        }}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-primary">{u.firstName} {u.lastName}</span>
                                                        <span className="text-xs text-text-secondary">{u.phone}</span>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <Button fullWidth type="submit" loading={loadingData} className="flex justify-center items-center gap-2">
                                <Megaphone size={18} /> {broadcastMode === 'all' ? 'SEND BROADCAST TO ALL' : `SEND TO ${selectedUsersForBroadcast.length} CUSTOMERS`}
                            </Button>
                        </form>
                    </motion.div>
                );

            case 'referral_report':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setActiveView('overview')} className="text-primary">
                                    <ChevronLeft size={24} />
                                </button>
                                <h2 className="text-xl font-display font-bold text-primary">Incentive Referral Report</h2>
                            </div>
                            {referralReportData.length > 0 && (
                                <button
                                    onClick={handleExportReferralExcel}
                                    className="p-2 text-accent bg-accent/10 rounded-xl hover:bg-accent/20 transition-all flex items-center gap-2 text-xs font-bold"
                                >
                                    <Download size={18} />
                                    <span className="hidden sm:inline">Export Excel</span>
                                </button>
                            )}
                        </div>

                        <div className="bg-accent/10 p-4 rounded-xl flex items-start gap-3">
                            <Users className="text-accent flex-shrink-0" size={20} />
                            <p className="text-xs text-accent font-bold">
                                Shows all scheme enrollments where a staff referral code was used, filtered by enrollment date range.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap gap-4 bg-surface p-4 rounded-xl border border-border items-end">
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wider">From Date</label>
                                <input
                                    type="date"
                                    value={referralMonthStart}
                                    onChange={e => setReferralMonthStart(e.target.value)}
                                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wider">To Date</label>
                                <input
                                    type="date"
                                    value={referralMonthEnd}
                                    onChange={e => setReferralMonthEnd(e.target.value)}
                                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div className="w-full sm:w-auto mt-2 sm:mt-0">
                                <Button onClick={handleFetchReferralReport} loading={loadingReferrals} className="w-full sm:w-auto">
                                    <Search size={16} className="mr-2" /> Fetch Report
                                </Button>
                            </div>
                        </div>

                        {referralReportData.length > 0 && (
                            <>
                                {/* Summary by employee */}
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Summary by Employee</h3>
                                    {(() => {
                                        const summaryMap: Record<string, { name: string; count: number; incentiveTotal: number }> = {};
                                        referralReportData.forEach(r => {
                                            if (!summaryMap[r.referrerEmpId]) summaryMap[r.referrerEmpId] = { name: r.referrerName, count: 0, incentiveTotal: 0 };
                                            summaryMap[r.referrerEmpId].count++;
                                            summaryMap[r.referrerEmpId].incentiveTotal += Number(r.incentiveAmt || 0);
                                        });
                                        return Object.entries(summaryMap).map(([empId, { name, count, incentiveTotal }]) => (
                                            <Card key={empId} className="p-4 border-none shadow-subtle bg-white flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-primary text-sm">{name}</p>
                                                    <p className="text-[10px] text-text-muted uppercase tracking-widest">EMP ID: {empId}</p>
                                                    <p className="text-[10px] text-text-muted mt-0.5">{count} referral{count !== 1 ? 's' : ''}</p>
                                                </div>
                                                <div className="text-right">
                                                    {incentiveTotal > 0 ? (
                                                        <>
                                                            <p className="text-xl font-black text-success">₹{incentiveTotal.toLocaleString()}</p>
                                                            <p className="text-[10px] text-text-muted uppercase tracking-widest">Incentive Earned</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-2xl font-black text-accent">{count}</p>
                                                            <p className="text-[10px] text-text-muted uppercase tracking-widest">Referrals</p>
                                                        </>
                                                    )}
                                                </div>
                                            </Card>
                                        ));
                                    })()}
                                </div>

                                {/* Detailed list */}
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

                        {referralReportData.length === 0 && !loadingReferrals && referralMonthStart && (
                            <p className="text-sm text-center text-text-muted py-8">No referral data for this period. Click "Fetch Report" to load.</p>
                        )}
                    </motion.div>
                );

            case 'audit_logs':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">System Audit Logs</h2>
                        </div>
                        
                        <div className="bg-primary/10 p-4 rounded-xl flex items-start gap-3">
                            <ShieldAlert className="text-primary flex-shrink-0" size={20} />
                            <p className="text-xs text-primary font-bold">
                                Immutable record of administrative actions taken within the system.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {auditLogs.length > 0 ? auditLogs.map((log) => (
                                <Card key={log.id} className="p-4 border-none shadow-subtle bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-bold text-sm text-primary">{log.action}</p>
                                        <p className="text-[10px] text-text-muted flex items-center gap-1"><Clock size={10} /> {new Date(log.timestamp).toLocaleString()}</p>
                                    </div>
                                    <p className="text-xs text-gray-700 mb-2 break-all">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</p>
                                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">Performed By</span>
                                        <span className="text-xs font-bold text-primary">{getActorName(log.performedBy)} ({log.role})</span>
                                    </div>
                                </Card>
                            )) : (
                                <p className="text-sm text-center text-text-muted py-8">No audit logs found.</p>
                            )}
                        </div>
                    </motion.div>
                );

            default:
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8 pb-10">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => navigate('/profile')} className="p-2 -ml-2 text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <Shield className="text-accent" size={28} />
                            <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Admin Console</h1>
                        </div>

                        {/* Schemes & Cash */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Core Operations</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Card onClick={() => setActiveView('create_scheme')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                        <Plus size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Create Scheme</p>
                                </Card>
                                <Card onClick={() => setActiveView('manage_schemes')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                        <FileText size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Manage Schemes</p>
                                </Card>
                                <Card onClick={() => setActiveView('deposit')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95 col-span-2">
                                    <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center">
                                        <HandCoins size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Manual Cash Receipt</p>
                                </Card>
                                <Card onClick={() => setActiveView('create_customer')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                        <UserCheck size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Create Customer</p>
                                </Card>
                                <Card onClick={() => setActiveView('enroll_customer')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                        <PlusCircle size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Enroll Customer</p>
                                </Card>
                                <Card onClick={() => setActiveView('transactions')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center">
                                        <FileText size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Transactions</p>
                                </Card>
                                <Card onClick={() => setActiveView('tally')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                        <FileText size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Daily Cash Tally</p>
                                </Card>
                                <Card onClick={() => setActiveView('redemptions')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95 col-span-2">
                                    <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                        <Printer size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Scheme Redemptions</p>
                                </Card>
                            </div>
                        </div>

                        {/* People Management */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Team & Members</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Card onClick={() => { loadStaffList(); setActiveView('staff_mgmt'); }} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Shield size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Staff Rights</p>
                                </Card>
                                <Card onClick={() => setActiveView('staff')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                        <Users size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Approvals</p>
                                </Card>
                                <Card onClick={() => setActiveView('customer_update')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Smartphone size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Customer Phone Update</p>
                                </Card>
                                <Card onClick={() => setActiveView('customer_report')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                                        <FileText size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Customer Report</p>
                                </Card>
                            </div>
                        </div>

                        {/* Reporting & Risk */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Reports & Risk</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Card onClick={() => setActiveView('analytics')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <BarChart2 size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Analytics</p>
                                </Card>
                                <Card onClick={() => setActiveView('defaulters')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-danger">Defaulter Tracking</p>
                                </Card>
                                <Card onClick={() => { setReferralReportData([]); setActiveView('referral_report'); }} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95 col-span-2">
                                    <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                                        <Users size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Incentive Referral Report</p>
                                </Card>
                            </div>
                        </div>

                        {/* Comm & Security */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Platform Tools</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Card onClick={() => setActiveView('broadcast')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95 col-span-2">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Megaphone size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-primary">Broadcast Announcement</p>
                                </Card>
                                {isPrimaryAdmin && (
                                    <Card onClick={() => { loadAuditLogs(); setActiveView('audit_logs'); }} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface transition-all active:scale-95 col-span-2">
                                        <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                                            <ShieldAlert size={24} />
                                        </div>
                                        <p className="text-xs font-bold text-danger">Security & Audit Logs</p>
                                    </Card>
                                )}
                            </div>
                        </div>

                        {isPrimaryAdmin && (
                            <div className="pt-4 border-t border-border/50">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 ml-1">Account Security</h3>
                                <Button
                                    variant="outline"
                                    fullWidth
                                    className="border-primary/20 text-primary py-6"
                                    onClick={async () => {
                                        const list = await getAllAdminsFromDB();
                                        setAdminsList(list);
                                        setActiveView('settings');
                                    }}
                                >
                                    <Shield size={18} className="mr-2" /> MANAGE PASSWORD & PIN
                                </Button>
                            </div>
                        )}
                    </motion.div>
                );
        }
    };

    if (viewMode === 'personal') {
        return <Home />;
    }

    if (user?.role !== 'admin') {
        const allowedManagerViews = ['transactions', 'analytics', 'defaulters'];
        if (!allowedManagerViews.includes(activeView as string)) {
            return <Navigate to="/staff" replace />;
        }
    }

    return (
        <div className="page-transition-wrapper p-6 pb-24">
            <AnimatePresence>
                <Notification
                    isVisible={!!notification}
                    message={notification?.message || ''}
                    type={notification?.type || 'success'}
                    onClose={() => setNotification(null)}
                />
                <ConfirmModal
                    isOpen={!!idToDelete}
                    title="Delete Scheme?"
                    message="Are you sure you want to remove this scheme? This action cannot be undone."
                    confirmText="Delete Now"
                    type="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setIdToDelete(null)}
                />
                <ConfirmModal
                    isOpen={depositOTPModalOpen}
                    title="Customer Authorization Required"
                    message="An OTP has been sent to the customer's registered mobile number. Please ask the customer for the OTP and enter it below to confirm this manual cash deposit."
                    confirmText={loadingData ? "Verifying..." : "Verify & Deposit"}
                    type="danger"
                    onConfirm={confirmDepositWithOTP}
                    onCancel={() => {
                        setDepositOTPModalOpen(false);
                        setDepositOTP('');
                    }}
                >
                    <div className="mt-4">
                        <Input
                            label="Enter 6-digit OTP"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={depositOTP}
                            onChange={(e) => setDepositOTP(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                        />
                    </div>
                </ConfirmModal>
                <ConfirmModal
                    isOpen={fulfillmentOTPModalOpen}
                    title="Process Fulfillment Verification"
                    message="An OTP has been sent to the customer's registered mobile number. Please ask the customer for the OTP and enter it below to confirm fulfillment."
                    confirmText={loadingData ? "Verifying..." : "Verify & Fulfill"}
                    type="danger"
                    onConfirm={async () => {
                        if (!fulfillmentOTP || fulfillmentOTP.length !== 6) {
                            showNotif('Please enter a valid 6-digit OTP', 'error');
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
                                showNotif('Invalid or expired OTP', 'error');
                                setLoadingData(false);
                                return;
                            }
                            
                            const success = await markSchemeAsRedeemed(fulfillmentTarget.id, user!.id);
                            if (success) {
                                const txs = await getTransactionsFromDB(fulfillmentTarget.userId, fulfillmentTarget.accountId);
                                showNotif('Scheme marked as closed and fulfilled!', 'success');
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
                                showNotif('Failed to fulfill scheme', 'error');
                            }
                        } catch (error) {
                            showNotif('Error verifying OTP', 'error');
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
                <ConfirmModal
                    isOpen={adminPreCloseModalOpen}
                    title="Pre-close Verification"
                    message={`An OTP has been sent to ${reportCustomer?.phone}. Please ask the customer for the OTP and enter it below to confirm pre-close of ${adminPreCloseTarget?.schemeName || adminPreCloseTarget?.name}. Note: NO bonuses or gifts will be provided for pre-closed schemes.`}
                    confirmText={loadingData ? "Verifying..." : "Verify & Pre-close"}
                    type="danger"
                    onConfirm={handleVerifyAdminPreClose}
                    onCancel={() => {
                        setAdminPreCloseModalOpen(false);
                        setAdminPreCloseOTP('');
                        setAdminPreCloseTarget(null);
                    }}
                >
                    <div className="mt-4">
                        <Input
                            label="Enter 6-digit OTP"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={adminPreCloseOTP}
                            onChange={(e) => setAdminPreCloseOTP(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                        />
                    </div>
                </ConfirmModal>
            </AnimatePresence>
            <AnimatePresence mode="wait">
                {renderView()}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
