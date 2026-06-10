import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchemeProvider } from './context/SchemeContext';
import { NotificationProvider } from './context/NotificationContext';
import './i18n/config';

// Layout Components
import { Navbar } from './components/Layout/Navbar';
import { BottomNav } from './components/Layout/BottomNav';
import { SideDrawer } from './components/Layout/SideDrawer';

// Pages
import Login from './pages/Login';
import StartPage from './pages/StartPage';
import Signup from './pages/Signup';
import OTPVerify from './pages/OTPVerify';
import PINSetup from './pages/PINSetup';
import PINLogin from './pages/PINLogin';
import SecuritySettings from './pages/SecuritySettings';
import Home from './pages/Home';
import KnowMore from './pages/KnowMore';
import SchemesList from './pages/SchemesList';
import JoinScheme from './pages/JoinScheme';
import Profile from './pages/Profile';
import MySchemes from './pages/MySchemes';
import Transactions from './pages/Transactions';
import PlanDetail from './pages/PlanDetail';
import PayEMI from './pages/PayEMI';
import ContactUs from './pages/ContactUs';
import OurStores from './pages/OurStores';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import Notifications from './pages/NotificationsPage'; // Notifications Route

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()!;
  
  if (loading) return null; // Wait for auth to load
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isUnlocked } = useAuth()!;
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Admins bypass the customer PIN setup flow as they use a primary administrative PIN
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  const userHasPinInDB = !!user.pin;

  // If the user has NOT set up a PIN yet, force them to set it up.
  if (!userHasPinInDB) {
    if (location.pathname !== '/set-pin') {
      return <Navigate to="/set-pin" replace />;
    }
    return <>{children}</>;
  }

  // User HAS a PIN. Are they unlocked?
  if (!isUnlocked) {
    // If not unlocked, they must go to pin-login to verify.
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const hideNavs = ['/', '/login', '/signup', '/otp-verify', '/set-pin', '/pin-login'].includes(location.pathname);

  return (
    <div className="mobile-container">
      {!hideNavs && <Navbar onMenuClick={() => setIsMenuOpen(true)} />}
      <SideDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className={!hideNavs ? 'pt-16 pb-20' : ''}>
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/" element={<StartPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/otp-verify" element={<OTPVerify />} />
            <Route path="/pin-login" element={<PINLogin />} />

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
                <SchemesList />
              </ProtectedRoute>
            } />

            <Route path="/scheme-join" element={
              <ProtectedRoute>
                <JoinScheme />
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
                <MySchemes />
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

            <Route path="/contact" element={
              <ProtectedRoute>
                <ContactUs />
              </ProtectedRoute>
            } />

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
      </main>

      {!hideNavs && <BottomNav />}
    </div>
  );
};

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <SchemeProvider>
            <AppContent />
          </SchemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
