import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import WhatsAppBubble from './WhatsAppBubble';
import CookieConsent from './CookieConsent';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      <WhatsAppBubble />
      <CookieConsent />
    </div>
  );
};

export default Layout;