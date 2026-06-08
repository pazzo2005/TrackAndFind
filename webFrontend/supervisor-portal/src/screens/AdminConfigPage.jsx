import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AiGatewayTerminal from '../components/AiGateway/AiGatewayTerminal';

export default function AdminConfigPage({ onArmScanner }) {
  const [activeTab, setActiveTab] = useState('config'); // config, master, aiGateway
  
  // Tab 1: Configuration Mapping state
  const [selectedBay, setSelectedBay] = useState(() => {
    return localStorage.getItem('selectedBay') || '';
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
  const [bays, setBays] = useState([]);
  const [newBayId, setNewBayId] = useState('');

  // Tab 4: Database Config state
  const [dbMode, setDbMode] = useState(() => {
    return localStorage.getItem('db_mode') || 'local';
  });
  const [dbHost, setDbHost] = useState(() => {
    return localStorage.getItem('db_host') || '';
  });
  const [dbName, setDbName] = useState(() => {
    return localStorage.getItem('db_name') || '';
  });
  const [dbUser, setDbUser] = useState(() => {
    return localStorage.getItem('db_user') || '';
  });
  const [dbPass, setDbPass] = useState(() => {
    return localStorage.getItem('db_pass') || '';
  });
  const [dbPort, setDbPort] = useState(() => {
    return localStorage.getItem('db_port') || '5432';
  });
  const [dbMessage, setDbMessage] = useState('');
  const [dbIsError, setDbIsError] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);


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

  const fetchBays = () => {
    axios.get("http://localhost:8080/api/bays")
      .then(res => {
        setBays(res.data);
        const storedBay = localStorage.getItem('selectedBay');
        if (storedBay && res.data.some(b => b.bayDoorId === storedBay)) {
          setSelectedBay(storedBay);
        } else if (res.data && res.data.length > 0) {
          setSelectedBay(res.data[0].bayDoorId);
          localStorage.setItem('selectedBay', res.data[0].bayDoorId);
        } else {
          setSelectedBay('');
        }
      })
      .catch(err => console.error("Error fetching bays:", err));
  };

  useEffect(() => {
    fetchTrucks();
    fetchBays();
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

  const handleAddBay = async (e) => {
    e.preventDefault();
    if (!newBayId.trim()) {
      setCrudError(true);
      setCrudMessage('Bay Door ID is required.');
      return;
    }

    setCrudMessage('Registering new Loading Bay Terminal...');
    setCrudError(false);

    try {
      const res = await axios.post('http://localhost:8080/api/bays', {
        bayDoorId: newBayId.trim().toUpperCase()
      });

      if (res.status === 200 || res.data.status === 'SUCCESS') {
        setCrudError(false);
        setCrudMessage(`Success: registered ${newBayId.trim().toUpperCase()} to database.`);
        setNewBayId('');
        fetchBays(); // refresh list
      }
    } catch (err) {
      console.error(err);
      setCrudError(true);
      setCrudMessage('Error registering bay door: check database connection or duplicate keys.');
    }
  };

  const handleDeleteBay = async (bayId) => {
    setCrudMessage(`Deregistering loading bay ${bayId}...`);
    setCrudError(false);

    try {
      const res = await axios.delete(`http://localhost:8080/api/bays/${bayId}`);
      if (res.status === 200 || res.data.status === 'SUCCESS') {
        setCrudError(false);
        setCrudMessage(`Success: removed ${bayId} from database.`);
        fetchBays(); // refresh list
      }
    } catch (err) {
      console.error(err);
      setCrudError(true);
      setCrudMessage('Error deleting bay: database connection error.');
    }
  };

  const handleSaveDbConfig = async (e) => {
    e.preventDefault();
    setDbLoading(true);
    setDbMessage('Updating database connection engine...');
    setDbIsError(false);

    let targetUrl = '';
    let targetUser = '';
    let targetPass = '';

    if (dbMode === 'local') {
      targetUrl = 'jdbc:postgresql://postgres-db:5432/warehouse_ledger';
      targetUser = 'warehouse_admin';
      targetPass = 'supersecretpassword';
    } else {
      if (!dbHost.trim() || !dbName.trim() || !dbUser.trim() || !dbPass.trim()) {
        setDbIsError(true);
        setDbMessage('All cloud database fields are required.');
        setDbLoading(false);
        return;
      }
      targetUrl = `jdbc:postgresql://${dbHost.trim()}:${dbPort.trim()}/${dbName.trim()}?sslmode=require`;
      targetUser = dbUser.trim();
      targetPass = dbPass.trim();
    }

    try {
      const response = await axios.post('http://localhost:8080/api/config/database', {
        dbUrl: targetUrl,
        username: targetUser,
        password: targetPass
      });

      if (response.status === 200 || response.data.status === 'SUCCESS') {
        localStorage.setItem('db_mode', dbMode.trim());
        localStorage.setItem('db_host', dbHost.trim());
        localStorage.setItem('db_name', dbName.trim());
        localStorage.setItem('db_user', dbUser.trim());
        localStorage.setItem('db_pass', dbPass.trim());
        localStorage.setItem('db_port', dbPort.trim());

        setDbIsError(false);
        setDbMessage(`Success: Database pool switched to ${dbMode === 'local' ? 'Local' : 'Cloud'} database.`);
        fetchTrucks();
      }
    } catch (error) {
      console.error(error);
      setDbIsError(true);
      setDbMessage(error.response?.data?.message || 'Database connection test failed. Reverting changes.');
    } finally {
      setDbLoading(false);
    }
  };


  return (
    <div className="card-container">
      <div className={`dashboard-card ${activeTab === 'aiGateway' || activeTab === 'master' ? 'wide-card' : ''}`}>
        
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
          <button 
            type="button" 
            onClick={() => setActiveTab('dbConfig')} 
            className={`tab-btn ${activeTab === 'dbConfig' ? 'active-tab' : ''}`}
          >
            Database Settings
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
                  {bays.length === 0 ? (
                    <option value="">-- No Bays Available --</option>
                  ) : (
                    bays.map(b => (
                      <option key={b.bayDoorId} value={b.bayDoorId}>
                        {b.bayDoorId} {b.activeTruckId ? `(Hosting ${b.activeTruckId})` : '(Idle)'}
                      </option>
                    ))
                  )}
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
            <p className="card-desc">Add or remove active transport fleet registrations and loading bays.</p>
            
            <div className="crud-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '20px' }}>
              
              {/* Fleet Column */}
              <div>
                <h4 style={{ color: '#66fcf1', borderBottom: '1px solid #1f2833', paddingBottom: '8px', marginBottom: '15px', marginTop: 0 }}>Fleet Manager</h4>
                <form onSubmit={handleAddTruck} className="crud-form" style={{ marginBottom: '20px' }}>
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
                  <button type="submit" className="action-btn sync-btn" style={{ height: '40px' }}>
                    Register Truck
                  </button>
                </form>

                <div className="master-data-list">
                  <label>Current Trucks</label>
                  <div className="crud-table-container">
                    <table className="crud-table">
                      <thead>
                        <tr>
                          <th>Truck ID</th>
                          <th>Driver</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {truck.map(t => (
                          <tr key={t.truckId}>
                            <td>{t.truckId}</td>
                            <td>{t.driverName}</td>
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

              {/* Bays Column */}
              <div>
                <h4 style={{ color: '#66fcf1', borderBottom: '1px solid #1f2833', paddingBottom: '8px', marginBottom: '15px', marginTop: 0 }}>Loading Bay Manager</h4>
                <form onSubmit={handleAddBay} className="crud-form" style={{ marginBottom: '20px' }}>
                  <div className="form-group">
                    <label>Bay Door Terminal ID</label>
                    <input 
                      type="text" 
                      value={newBayId} 
                      onChange={(e) => setNewBayId(e.target.value)} 
                      placeholder="e.g. BAY_DOOR_04" 
                      className="crud-input"
                    />
                  </div>
                  <div style={{ height: '124px' }}></div>
                  <button type="submit" className="action-btn sync-btn" style={{ height: '40px' }}>
                    Register Bay Door
                  </button>
                </form>

                <div className="master-data-list">
                  <label>Current Bays</label>
                  <div className="crud-table-container">
                    <table className="crud-table">
                      <thead>
                        <tr>
                          <th>Bay Door ID</th>
                          <th>Active Truck</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bays.map(b => (
                          <tr key={b.bayDoorId}>
                            <td>{b.bayDoorId}</td>
                            <td>{b.activeTruckId || 'Idle'}</td>
                            <td>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteBay(b.bayDoorId)} 
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

            </div>

            {crudMessage && (
              <div className={`status-toast ${crudError ? 'error-text' : 'success-text'}`} style={{ marginTop: '20px' }}>
                {crudMessage}
              </div>
            )}
          </div>
        )}

        {activeTab === 'aiGateway' && (
          <AiGatewayTerminal />
        )}

        {activeTab === 'dbConfig' && (
          <div>
            <h3>4. Dynamic Database Settings</h3>
            <p className="card-desc">Configure the active ledger storage engine (Local on-premise or Cloud database).</p>

            <form onSubmit={handleSaveDbConfig}>
              <div className="form-group">
                <label>Database Storage Mode</label>
                <select value={dbMode} onChange={(e) => setDbMode(e.target.value)}>
                  <option value="local">On-Premise PostgreSQL (Local Container)</option>
                  <option value="cloud">Cloud PostgreSQL (Neon / External Cloud DB)</option>
                </select>
              </div>

              {dbMode === 'cloud' && (
                <div style={{ marginTop: '15px' }}>
                  <div className="form-group">
                    <label>Cloud Database Host</label>
                    <input 
                      type="text" 
                      value={dbHost} 
                      onChange={(e) => setDbHost(e.target.value)} 
                      placeholder="e.g. ep-hidden-sky-aoutcfq1.aws.neon.tech" 
                      className="crud-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Database Name</label>
                    <input 
                      type="text" 
                      value={dbName} 
                      onChange={(e) => setDbName(e.target.value)} 
                      placeholder="e.g. neondb" 
                      className="crud-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Database Username</label>
                    <input 
                      type="text" 
                      value={dbUser} 
                      onChange={(e) => setDbUser(e.target.value)} 
                      placeholder="e.g. neondb_owner" 
                      className="crud-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Database Password</label>
                    <input 
                      type="password" 
                      value={dbPass} 
                      onChange={(e) => setDbPass(e.target.value)} 
                      placeholder="Enter password" 
                      className="crud-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Database Port</label>
                    <input 
                      type="text" 
                      value={dbPort} 
                      onChange={(e) => setDbPort(e.target.value)} 
                      placeholder="5432" 
                      className="crud-input"
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="action-btn sync-btn" style={{ marginTop: '15px' }} disabled={dbLoading}>
                {dbLoading ? 'Connecting...' : 'Apply Configuration'}
              </button>
            </form>

            {dbMessage && (
              <div className={`status-toast ${dbIsError ? 'error-text' : 'success-text'}`} style={{ marginTop: '15px' }}>
                {dbMessage}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}