import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/Auth/AuthProvider';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import Contact from './components/Contact';
import TransferSimulator from './components/TransferSimulator';
import PaymentMethods from './components/PaymentMethods';
import LocalPayments from './components/LocalPayments';
import CountryFlags from './components/CountryFlags';
import TopTransferFlows from './components/TopTransferFlows';
import AuthForm from './components/Auth/AuthForm';
import TransferForm from './components/TransferForm';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import LegalNotice from './pages/LegalNotice';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Procedures from './pages/Procedures';
import PasswordResetForm from './components/Auth/PasswordResetForm';
import PromoMessage from "./components/PromoMessage";
import DiscountPopup from "./components/DiscountPopup";
import TransferAlertPopup from "./components/TransferAlertPopup";

function HomePage() {
  return (
    <Layout>
      {/* <DiscountPopup /> ✅ Popup s'affiche au chargement */}
     
      {/* <TransferAlertPopup /> */}
      <div className="flex flex-col lg:flex-row px-4 md:px-16 py-12 gap-10 items-start">
        <div className="order-2 lg:order-none w-full lg:w-1/2">
          <Hero />
        </div>
        {/*<PromoMessage />*/}
        <div className=" order-1 lg:order-none w-full lg:w-1/2">
          <TransferSimulator />
        </div>
      </div>
      <TopTransferFlows />
      <CountryFlags />
      <HowItWorks />
      <PaymentMethods />
      <LocalPayments />
      <Contact />
    </Layout>
  );
}

function App() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Écouter les messages du Service Worker
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_AVAILABLE') {
        setUpdateAvailable(true);
      }
    });
  }, []);

  const handleUpdate = () => {
    // Recharger la page pour activer la nouvelle version
    window.location.reload();
  };

  return (
    <Router>
      <AuthProvider>
        {updateAvailable && (
          <div className="fixed bottom-4 left-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg shadow-lg z-50 flex justify-between items-center">
            <p>Une nouvelle version est disponible !</p>
            <button
              onClick={handleUpdate}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              Mettre à jour
            </button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<Layout><AuthForm /></Layout>} />
          <Route path="/reset-password" element={<PasswordResetForm />} />
          <Route path="/mentions-legales" element={<Layout><LegalNotice /></Layout>} />
          <Route path="/politique-de-confidentialite" element={<Layout><PrivacyPolicy /></Layout>} />
          <Route path="/conditions-generales" element={<Layout><TermsOfService /></Layout>} />
          <Route path="/Procedures" element={<Layout><Procedures /></Layout>} />
          <Route 
            path="/transfer" 
            element={
              <ProtectedRoute>
                <Layout><TransferForm /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Layout><AdminDashboard /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Layout><Profile /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;