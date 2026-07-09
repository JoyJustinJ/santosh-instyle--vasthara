import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProgramProvider } from './context/ProgramContext';
import { NotificationProvider } from './context/NotificationContext';
import './i18n/config';
import { ErrorBoundary } from './components/UI/ErrorBoundary';

// Layout Components
import { Navbar } from './components/Layout/Navbar';
import { BottomNav } from './components/Layout/BottomNav';
import { SideDrawer } from './components/Layout/SideDrawer';

// Pages (Lazy Loaded)
const Login = React.lazy(() => import('./pages/Login'));
const StartPage = React.lazy(() => import('./pages/StartPage'));
const Signup = React.lazy(() => import('./pages/Signup'));
const OTPVerify = React.lazy(() => import('./pages/OTPVerify'));
const PINSetup = React.lazy(() => import('./pages/PINSetup'));
const PINLogin = React.lazy(() => import('./pages/PINLogin'));
const CompleteProfile = React.lazy(() => import('./pages/CompleteProfile'));
const SecuritySettings = React.lazy(() => import('./pages/SecuritySettings'));
const Home = React.lazy(() => import('./pages/Home'));
const KnowMore = React.lazy(() => import('./pages/KnowMore'));
const ProgramsList = React.lazy(() => import('./pages/ProgramsList'));
const JoinProgram = React.lazy(() => import('./pages/JoinProgram'));
const Profile = React.lazy(() => import('./pages/Profile'));
const MyPrograms = React.lazy(() => import('./pages/MyPrograms'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const PlanDetail = React.lazy(() => import('./pages/PlanDetail'));
const PayEMI = React.lazy(() => import('./pages/PayEMI'));
const ContactUs = React.lazy(() => import('./pages/ContactUs'));
const OurStores = React.lazy(() => import('./pages/OurStores'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const StaffDashboard = React.lazy(() => import('./pages/StaffDashboard'));
const Notifications = React.lazy(() => import('./pages/NotificationsPage'));
const AboutUs = React.lazy(() => import('./pages/AboutUs'));
const TermsConditions = React.lazy(() => import('./pages/TermsConditions'));
const RefundPolicy = React.lazy(() => import('./pages/RefundPolicy'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const ProgramRules = React.lazy(() => import('./pages/ProgramRules'));

// Fallback Loading Component
const PageLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
    <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin"></div>
  </div>
);

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()!;
  
  if (loading) return <PageLoader />;
  
  if (!user || (user.role !== 'admin' && user.accessLevel !== 'manager')) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RootRedirect = () => {
  const { user, loading } = useAuth()!;
  
  if (loading) return <PageLoader />;
  
  if (user) {
    if (user.role === 'admin' || user.accessLevel === 'manager') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/home" replace />;
  }
  
  return <StartPage />;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isUnlocked } = useAuth()!;
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Admins bypass the customer PIN setup flow as they use a primary administrative PIN
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  // Enforce profile completion ONLY for users who signed up via Google
  const isProfileComplete = user.phone && user.address && user.state && user.city && user.pincode;
  if (user.accountCreatedVia === 'google' && !isProfileComplete) {
    if (location.pathname !== '/complete-profile') {
      return <Navigate to="/complete-profile" replace />;
    }
    return <>{children}</>;
  }

  const userHasPin = !!user.pin || !!localStorage.getItem('vastra_pin');

  if (!userHasPin) {
    if (location.pathname !== '/set-pin') {
      return <Navigate to="/set-pin" replace />;
    }
    return <>{children}</>;
  }

  // If the user HAS a PIN but is NOT unlocked, force them to pin-login
  if (userHasPin && !isUnlocked) {
    if (location.pathname !== '/pin-login') {
      return <Navigate to="/pin-login" replace />;
    }
    return <>{children}</>;
  }

  // User HAS a PIN and IS unlocked. 
  // If they somehow try to go to /set-pin or /pin-login, let them pass but normally they shouldn't.
  return <>{children}</>;
};

const AppContent = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth()!;

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capacitor Hardware Back Button Handler
    // Store the specific listener handle so cleanup only removes THIS listener,
    // leaving other native listeners (pause/resume etc.) intact.
    let backButtonHandle: { remove: () => Promise<void> } | null = null;

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        const pathname = window.location.pathname;
        const isAtRoot = pathname === '/' || pathname === '/home' || pathname === '/login' || pathname === '/signup';

        if (!canGoBack || isAtRoot) {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      }).then(handle => {
        backButtonHandle = handle;
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Remove ONLY the back button listener, not all Capacitor listeners
      if (backButtonHandle) {
        backButtonHandle.remove();
      }
    };
  }, []);

  const publicPages = ['/about', '/terms', '/privacy', '/refund-policy', '/program-rules', '/contact'];
  const hideNavs = ['/', '/login', '/signup', '/otp-verify', '/set-pin', '/pin-login', '/complete-profile'].includes(location.pathname) || (!user && publicPages.includes(location.pathname));

  return (
    <div className="mobile-container">
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-danger text-white px-4 py-2 flex items-center justify-center gap-2 shadow-md"
          >
            <WifiOff size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">No Internet Connection</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!hideNavs && <Navbar onMenuClick={() => setIsMenuOpen(true)} />}
      <SideDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className={!hideNavs ? 'pt-16 pb-20' : ''}>
        <React.Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <Routes location={location}>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/otp-verify" element={<OTPVerify />} />
              <Route path="/pin-login" element={<PINLogin />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/terms" element={<TermsConditions />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/program-rules" element={<ProgramRules />} />

              <Route path="/admin" element={
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              } />
              <Route path="/staff" element={
                <ProtectedRoute>
                  <StaffDashboard />
                </ProtectedRoute>
              } />

              <Route path="/complete-profile" element={
                <ProtectedRoute>
                  <CompleteProfile />
                </ProtectedRoute>
              } />

              <Route path="/set-pin" element={
                <ProtectedRoute>
                  <PINSetup />
                </ProtectedRoute>
              } />

              <Route path="/home" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />

              <Route path="/scheme-info" element={
                <ProtectedRoute>
                  <KnowMore />
                </ProtectedRoute>
              } />

              <Route path="/schemes-list" element={
                <ProtectedRoute>
                  <ProgramsList />
                </ProtectedRoute>
              } />

              <Route path="/scheme-join" element={
                <ProtectedRoute>
                  <JoinProgram />
                </ProtectedRoute>
              } />

              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />

              <Route path="/profile/security" element={
                <ProtectedRoute>
                  <SecuritySettings />
                </ProtectedRoute>
              } />

              <Route path="/transactions" element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              } />

              <Route path="/my-schemes" element={
                <ProtectedRoute>
                  <MyPrograms />
                </ProtectedRoute>
              } />

              <Route path="/plan-detail/:accountId" element={
                <ProtectedRoute>
                  <PlanDetail />
                </ProtectedRoute>
              } />

              <Route path="/pay-emi" element={
                <ProtectedRoute>
                  <PayEMI />
                </ProtectedRoute>
              } />

              <Route path="/contact" element={<ContactUs />} />

              <Route path="/stores" element={
                <ProtectedRoute>
                  <OurStores />
                </ProtectedRoute>
              } />

              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />

            </Routes>
          </AnimatePresence>
        </React.Suspense>
      </main>

      {!hideNavs && <BottomNav />}
    </div>
  );
};

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <NotificationProvider>
            <ProgramProvider>
              <AppContent />
            </ProgramProvider>
          </NotificationProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
