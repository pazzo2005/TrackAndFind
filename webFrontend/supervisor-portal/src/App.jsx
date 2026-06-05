import React, { useState } from 'react';
import AdminConfigPage from './screens/AdminConfigPage'; // Fixed import name matching
import LiveAIScanPage from './screens/LiveAiPageScan';   // Points to your exact file spelling
import './index.css';

export default function App() {
  const [configuredBayId, setConfiguredBayId] = useState(null);

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
            onArmScanner={(bayId) => setConfiguredBayId(bayId)} 
          />
        ) : (
          /* PAGE 2: Mounted immediately upon successful database configuration sync */
          <LiveAIScanPage 
            activeBay={configuredBayId} 
            onBack={() => setConfiguredBayId(null)} 
          />
        )}
      </main>
    </div>
  );
}