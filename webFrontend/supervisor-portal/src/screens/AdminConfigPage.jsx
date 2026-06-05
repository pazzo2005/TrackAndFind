import React, { useState } from 'react';
import axios from 'axios';

// 1. FIXED: Destructure the onArmScanner prop callback from App.jsx
export default function AdminConfigPage({ onArmScanner }) {
  const [selectedBay, setSelectedBay] = useState('BAY_DOOR_01');
  const [selectedTruck, setSelectedTruck] = useState('TRUCK_A');
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const API_URL = 'http://localhost:8080/api/config/assign-truck';

  const handleAssignRoute = async (e) => {
    e.preventDefault();
    setStatusMessage('Syncing configuration ledger...');
    setIsError(false);

    try {
      const response = await axios.put(API_URL, {
        bayDoorId: selectedBay,
        truckId: selectedTruck
      });

      // Check if your Spring Boot backend returns dynamic response text or a general 200 OK code
      if (response.status === 200 || response.data.status === 'SUCCESS') {
        setIsError(false);
        setStatusMessage(`Success: Bay Door ${selectedBay} is now actively locked to ${selectedTruck}`);
        
        // 2. FIXED: Fire the navigation engine immediately on a successful API response!
        if (typeof onArmScanner === 'function') {
          onArmScanner(selectedBay);
        }
      }
    } catch (error) {
      console.error(error);
      setIsError(true);
      setStatusMessage('Network Sync Error: Could not reach Spring Boot system engine.');
    }
  };

  return (
    <div className="card-container">
      <div className="dashboard-card">
        <h3>1. Admin Gateway Configurator</h3>
        <p className="card-desc">Provision physical warehouse terminal doors to arriving logistics fleets.</p>
        
        <form onSubmit={handleAssignRoute}>
          <div className="form-group">
            <label>1. Select Target Loading Bay Terminal Slot</label>
            <select value={selectedBay} onChange={(e) => setSelectedBay(e.target.value)}>
              <option value="BAY_DOOR_01">Loading Bay Door 1 (Gate 1)</option>
              <option value="BAY_DOOR_02">Loading Bay Door 2 (Gate 2)</option>
              <option value="BAY_DOOR_03">Loading Bay Door 3 (Gate 3)</option>
            </select>
          </div>

          <div className="form-group">
            <label>2. Assign Docked Inbound Delivery Truck</label>
            <select value={selectedTruck} onChange={(e) => setSelectedTruck(e.target.value)}>
              <option value="TRUCK_A">Truck Engine A (Destination: Chennai)</option>
              <option value="TRUCK_B">Truck Engine B (Destination: Bangalore)</option>
              <option value="TRUCK_C">Truck Engine C (Destination: Mumbai)</option>
            </select>
          </div>

          <button type="submit" className="action-btn sync-btn">
            Publish Route Mapping Configuration
          </button>
        </form>

        {statusMessage && (
          <div className={`status-toast ${isError ? 'error-text' : 'success-text'}`}>
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}