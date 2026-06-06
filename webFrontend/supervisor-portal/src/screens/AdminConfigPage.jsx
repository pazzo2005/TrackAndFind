import React, { useState ,useEffect} from 'react';
import axios from 'axios';

// 1. FIXED: Destructure the onArmScanner prop callback from App.jsx
export default function AdminConfigPage({ onArmScanner }) {
  const [selectedBay, setSelectedBay] = useState(() => {
    return localStorage.getItem('selectedBay') || 'BAY_DOOR_01';
  });
  const [selectedTruck, setSelectedTruck] = useState(() => {
    return localStorage.getItem('selectedTruck') || '';
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);


  const[truck,setTruck] = useState([]);

  useEffect(()=>{
    axios.get("http://localhost:8080/api/trucks")
    .then(res => {
      setTruck(res.data);
      const storedTruck = localStorage.getItem('selectedTruck');
      if (storedTruck && res.data.some(t => t.truckId === storedTruck)) {
        setSelectedTruck(storedTruck);
      } else if (res.data && res.data.length > 0) {
        setSelectedTruck(res.data[0].truckId);
        localStorage.setItem('selectedTruck', res.data[0].truckId);
      }
    });
  },[]);

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
        localStorage.setItem('selectedBay', selectedBay);
        localStorage.setItem('selectedTruck', selectedTruck);
        
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

  const handleResetManifest = async () => {
    setStatusMessage('Resetting manifest database ledger...');
    setIsError(false);

    try {
      const response = await axios.post('http://localhost:8080/api/config/reset-manifest');
      if (response.data.status === 'SUCCESS') {
        setStatusMessage('Success: Dispatched packages archived. Active manifest ready for re-testing!');
        setIsError(false);
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
            <select value={selectedBay} onChange={(e) => {
              const val = e.target.value;
              setSelectedBay(val);
              localStorage.setItem('selectedBay', val);
            }}>
              <option value="BAY_DOOR_01">Loading Bay Door 1 (Gate 1)</option>
              <option value="BAY_DOOR_02">Loading Bay Door 2 (Gate 2)</option>
              <option value="BAY_DOOR_03">Loading Bay Door 3 (Gate 3)</option>
            </select>
          </div>

          <div className="form-group">
            <label>2. Assign Docked Inbound Delivery Truck</label>
            <select value ={selectedTruck} onChange={(e) => {
              const val = e.target.value;
              setSelectedTruck(val);
              localStorage.setItem('selectedTruck', val);
            }}>
              {
                truck.map(t=>(
                  <option key={t.truckId} value={t.truckId}>
                    {t.truckId} ({t.driverName})
                  </option>
                ))
              }

            </select>
          </div>

          <button type="submit" className="action-btn sync-btn">
            Publish Route Mapping Configuration
          </button>

          <button type="button" onClick={handleResetManifest} className="action-btn secondary-btn" style={{ marginTop: '10px', width: '100%', borderColor: '#66fcf1', color: '#66fcf1' }}>
            Refresh Record
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