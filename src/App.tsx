import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchemeProvider } from './context/SchemeContext';
import './i18n/config';

// Layout Components
import { Navbar } from './components/Layout/Navbar';
import { BottomNav } from './components/Layout/BottomNav';
import { SideDrawer } from './components/Layout/SideDrawer';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import OTPVerify from './pages/OTPVerify';
import PINSetup from './pages/PINSetup';
import PINLogin from './pages/PINLogin';
import Home from './pages/Home';
import KnowMore from './pages/KnowMore';
import SchemesList from './pages/SchemesList';
import JoinScheme from './pages/JoinScheme';
import Profile from './pages/Profile';
import MySchemes from './pages/MySchemes';
import PlanDetail from './pages/PlanDetail';
import PayEMI from './pages/PayEMI';
import ContactUs from './pages/ContactUs';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import StaffDashboard from './pages/StaffDashboard';

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const isAdmin = localStorage.getItem('is_admin_authenticated') === 'true';
  if (!isAdmin) return <Navigate to="/admin-login" replace />;
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isUnlocked } = useAuth()!;
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  const hasPin = localStorage.getItem('vasthara_pin');

  // If user has a PIN but hasn't unlocked the app yet, redirect to PIN login
  if (hasPin && !isUnlocked && location.pathname !== '/pin-login') {
    return <Navigate to="/pin-login" replace />;
  }

  // If user doesn't have a PIN, they must set one
  if (!hasPin && location.pathname !== '/set-pin') {
    return <Navigate to="/set-pin" replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const hideNavs = ['/login', '/signup', '/otp-verify', '/set-pin', '/pin-login', '/admin', '/staff', '/admin-login'].includes(location.pathname);

  return (
    <div className="mobile-container">
      {!hideNavs && <Navbar onMenuClick={() => setIsMenuOpen(true)} />}
      <SideDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className={!hideNavs ? 'pt-16 pb-20' : ''}>
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/otp-verify" element={<OTPVerify />} />
            <Route path="/pin-login" element={<PINLogin />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            } />
            <Route path="/staff" element={<StaffDashboard />} />


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

            <Route path="/" element={<Navigate to="/home" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {!hideNavs && <BottomNav />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SchemeProvider>
        <AppContent />
      </SchemeProvider>
    </AuthProvider>
  );
}
