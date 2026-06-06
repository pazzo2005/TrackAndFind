import React, { useState, useEffect } from 'react';
import AdminConfigPage from './screens/AdminConfigPage'; // Fixed import name matching
import LiveAIScanPage from './screens/LiveAiPageScan';   // Points to your exact file spelling
import './index.css';

export default function App() {
  const [configuredBayId, setConfiguredBayId] = useState(null);

  // Sync state with URL hash to support browser navigation (back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/scan')) {
        const parts = hash.split('/');
        if (parts.length > 2) {
          setConfiguredBayId(parts[2]);
          return;
        }
      }
      setConfiguredBayId(null);
    };

    // Run on initial mount
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleArmScanner = (bayId) => {
    window.location.hash = `#/scan/${bayId}`;
  };

  const handleBack = () => {
    window.location.hash = '#/';
  };

  return (
    <div className="web-dashboard-layout">
      <header className="dashboard-header">
        <h1>INTELLIGENT ROUTING & AI VERIFICATION GATEWAY</h1>
        <p>Computer Vision Matrix Processing Subsystem — Problem Statement 1</p>
      </header>

      <main className="view-viewport">
        {!configuredBayId ? (
          /* PAGE 1: Mounted if no bay door routing layer has been configured yet */
          <AdminConfigPage 
            onArmScanner={handleArmScanner} 
          />
        ) : (
          /* PAGE 2: Mounted immediately upon successful database configuration sync */
          <LiveAIScanPage 
            activeBay={configuredBayId} 
            onBack={handleBack} 
          />
        )}
      </main>
    </div>
  );
}