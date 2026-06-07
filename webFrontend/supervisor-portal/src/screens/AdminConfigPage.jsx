import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminConfigPage({ onArmScanner }) {
  const [activeTab, setActiveTab] = useState('config'); // config, master, aiGateway
  
  // Tab 1: Configuration Mapping state
  const [selectedBay, setSelectedBay] = useState(() => {
    return localStorage.getItem('selectedBay') || 'BAY_DOOR_01';
  });
  const [selectedTruck, setSelectedTruck] = useState(() => {
    return localStorage.getItem('selectedTruck') || '';
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [truck, setTruck] = useState([]);

  // Tab 2: Master CRUD state
  const [newTruckId, setNewTruckId] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [crudMessage, setCrudMessage] = useState('');
  const [crudError, setCrudError] = useState(false);

  // Tab 3: AI Gateway state
  const [aiIntent, setAiIntent] = useState('');
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Fetch all trucks
  const fetchTrucks = () => {
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
      })
      .catch(err => console.error("Error fetching trucks:", err));
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

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

      if (response.status === 200 || response.data.status === 'SUCCESS') {
        setIsError(false);
        setStatusMessage(`Success: Bay Door ${selectedBay} is now actively locked to ${selectedTruck}`);
        localStorage.setItem('selectedBay', selectedBay);
        localStorage.setItem('selectedTruck', selectedTruck);
        
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

  // CRUD Actions
  const handleAddTruck = async (e) => {
    e.preventDefault();
    if (!newTruckId.trim() || !newDriverName.trim() || !newDestination.trim()) {
      setCrudError(true);
      setCrudMessage('All truck registration fields are required.');
      return;
    }

    setCrudMessage('Registering new logistics engine...');
    setCrudError(false);

    try {
      const res = await axios.post('http://localhost:8080/api/trucks', {
        truckId: newTruckId.trim().toUpperCase(),
        driverName: newDriverName.trim(),
        destinationCity: newDestination.trim()
      });

      if (res.status === 200 || res.data.status === 'SUCCESS') {
        setCrudError(false);
        setCrudMessage(`Success: registered ${newTruckId} to database.`);
        setNewTruckId('');
        setNewDriverName('');
        setNewDestination('');
        fetchTrucks(); // refresh list
      }
    } catch (err) {
      console.error(err);
      setCrudError(true);
      setCrudMessage('Error registering truck: duplicate key or database connection error.');
    }
  };

  const handleDeleteTruck = async (truckId) => {
    setCrudMessage(`Deregistering truck ${truckId}...`);
    setCrudError(false);

    try {
      const res = await axios.delete(`http://localhost:8080/api/trucks/${truckId}`);
      if (res.status === 200 || res.data.status === 'SUCCESS') {
        setCrudError(false);
        setCrudMessage(`Success: removed ${truckId} from database.`);
        fetchTrucks(); // refresh list
      }
    } catch (err) {
      console.error(err);
      setCrudError(true);
      setCrudMessage('Error deleting truck: check active bay door assignments.');
    }
  };

  // AI Gateway Action
  const handleAiQuery = async (e) => {
    e.preventDefault();
    if (!aiIntent.trim()) return;

    setAiLoading(true);
    setAiError('');
    setAiResults(null);

    try {
      const res = await axios.post('http://localhost:3000/api/v1/query', {
        targetTable: ["loading_manifest", "archived_manifest", "truck_inventory", "bay_door_routing"],
        intent: aiIntent.trim(),
        clientDB: {
          host: "postgres-db",
          username: "warehouse_admin",
          password: "supersecretpassword",
          databaseName: "warehouse_ledger",
          port: 5432
        }
      });

      if (res.data.success) {
        setAiResults(res.data);
      } else {
        setAiError(res.data.error || 'Unknown query parsing failure.');
      }
    } catch (err) {
      console.error(err);
      setAiError(err.response?.data?.error || 'Security baseline check failed: Destructive or non-read action detected.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="card-container">
      <div className={`dashboard-card ${activeTab === 'aiGateway' ? 'wide-card' : ''}`}>
        
        {/* Navigation Tabs */}
        <div className="tab-navigation">
          <button 
            type="button" 
            onClick={() => setActiveTab('config')} 
            className={`tab-btn ${activeTab === 'config' ? 'active-tab' : ''}`}
          >
            Provision Terminal
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('master')} 
            className={`tab-btn ${activeTab === 'master' ? 'active-tab' : ''}`}
          >
            Master Data CRUD
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('aiGateway')} 
            className={`tab-btn ${activeTab === 'aiGateway' ? 'active-tab' : ''}`}
          >
            AI Access Gateway
          </button>
        </div>

        {activeTab === 'config' && (
          <div>
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
                <select value={selectedTruck} onChange={(e) => {
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
        )}

        {activeTab === 'master' && (
          <div>
            <h3>2. Master Data Management</h3>
            <p className="card-desc">Add or remove active transport fleet registrations.</p>
            
            <form onSubmit={handleAddTruck} className="crud-form" style={{ marginBottom: '25px' }}>
              <div className="form-group">
                <label>Truck Serial ID</label>
                <input 
                  type="text" 
                  value={newTruckId} 
                  onChange={(e) => setNewTruckId(e.target.value)} 
                  placeholder="e.g. TRUCK_D" 
                  className="crud-input"
                />
              </div>
              <div className="form-group">
                <label>Driver Full Name</label>
                <input 
                  type="text" 
                  value={newDriverName} 
                  onChange={(e) => setNewDriverName(e.target.value)} 
                  placeholder="e.g. Sunil Kumar"
                  className="crud-input"
                />
              </div>
              <div className="form-group">
                <label>Destination City</label>
                <input 
                  type="text" 
                  value={newDestination} 
                  onChange={(e) => setNewDestination(e.target.value)} 
                  placeholder="e.g. Mumbai"
                  className="crud-input"
                />
              </div>

              <button type="submit" className="action-btn sync-btn">
                Register Logistics Engine
              </button>
            </form>

            {crudMessage && (
              <div className={`status-toast ${crudError ? 'error-text' : 'success-text'}`} style={{ marginBottom: '20px' }}>
                {crudMessage}
              </div>
            )}

            <div className="master-data-list">
              <label>Current Registrations in System</label>
              <div className="crud-table-container">
                <table className="crud-table">
                  <thead>
                    <tr>
                      <th>Truck ID</th>
                      <th>Driver</th>
                      <th>Destination</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {truck.map(t => (
                      <tr key={t.truckId}>
                        <td>{t.truckId}</td>
                        <td>{t.driverName}</td>
                        <td>{t.destinationCity}</td>
                        <td>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteTruck(t.truckId)} 
                            className="delete-row-btn"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'aiGateway' && (
          <div>
            <h3>3. AI Data Access Gateway Terminal</h3>
            <p className="card-desc">Interact with the database using natural language queries (Text-to-SQL + SQLGuard Firewall).</p>

            <form onSubmit={handleAiQuery} className="ai-terminal-form" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label>Enter Operational Intent (Natural Language)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={aiIntent} 
                    onChange={(e) => setAiIntent(e.target.value)} 
                    placeholder="e.g. Show all active trucks or get count of pending packages"
                    className="crud-input"
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="action-btn sync-btn" style={{ width: '120px' }} disabled={aiLoading}>
                    {aiLoading ? 'Thinking...' : 'Compile'}
                  </button>
                </div>
              </div>
            </form>

            {aiError && (
              <div className="status-toast error-text" style={{ padding: '10px', background: 'rgba(231, 76, 60, 0.05)', borderRadius: '6px', textAlign: 'left', fontSize: '12px', lineHeight: '18px' }}>
                {aiError}
              </div>
            )}

            {aiResults && (
              <div className="ai-response-panel">
                <div className="sql-box" style={{ background: '#0b0c10', border: '1px solid #1f2833', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
                  <label style={{ fontSize: '9px', color: '#66fcf1' }}>COMPILED SQL (SQLGUARD APPROVED)</label>
                  <code style={{ color: '#2ecc71', fontSize: '13px', fontFamily: 'monospace', display: 'block', wordBreak: 'break-all', marginTop: '5px' }}>
                    {aiResults.compiledQuery}
                  </code>
                </div>

                <label style={{ color: '#66fcf1', fontSize: '10px' }}>
                  EXTRACTED RECORDS ({aiResults.recordsCount})
                </label>
                
                {aiResults.data && aiResults.data.length > 0 ? (
                  <div className="crud-table-container" style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '10px' }}>
                    <table className="crud-table">
                      <thead>
                        <tr>
                          {Object.keys(aiResults.data[0]).map(key => (
                            <th key={key}>{key.toUpperCase()}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {aiResults.data.map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).map((val, colIdx) => (
                              <td key={colIdx}>{val === null ? 'NULL' : val.toString()}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#8892b0', fontSize: '12px', marginTop: '10px' }}>No records returned by query.</p>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}