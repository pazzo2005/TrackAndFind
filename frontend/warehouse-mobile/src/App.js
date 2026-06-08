import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';

export default function App() {
  const [activeTab, setActiveTab] = useState('config'); // config, fleet, scanner, ai
  const scrollViewRef = useRef(null);
  const [laptopIp, setLaptopIp] = useState('192.168.1.100'); // Change to your local machine IP
  const [isIpLocked, setIsIpLocked] = useState(false);

  // Config States
  const [selectedBay, setSelectedBay] = useState('');
  const [selectedTruck, setSelectedTruck] = useState('');
  const [trucks, setTrucks] = useState([]);
  const [bays, setBays] = useState([]);
  const [configMessage, setConfigMessage] = useState('');
  const [configSuccess, setConfigSuccess] = useState(true);

  // Fleet CRUD States
  const [newTruckId, setNewTruckId] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newBayId, setNewBayId] = useState('');
  const [crudMessage, setCrudMessage] = useState('');
  const [crudSuccess, setCrudSuccess] = useState(true);

  // Camera Scanner States
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerActive, setScannerActive] = useState(false);
  const [scanStatus, setScanStatus] = useState('IDLE'); // IDLE, PROCESSING, VALID, MISMATCH, DUPLICATE
  const [scanMessage, setScanMessage] = useState('Armed. Align QR code in camera view.');
  const [scannedId, setScannedId] = useState('');

  // AI Gateway States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [aiError, setAiError] = useState('');

  // Active database state dynamically synced from backend
  const [dbHost, setDbHost] = useState('postgres-db');
  const [dbUser, setDbUser] = useState('warehouse_admin');
  const [dbPass, setDbPass] = useState('supersecretpassword');
  const [dbName, setDbName] = useState('warehouse_ledger');
  const [dbPort, setDbPort] = useState(5432);

  // Database Configuration Inputs
  const [dbMode, setDbMode] = useState('local'); // local, cloud
  const [dbHostInput, setDbHostInput] = useState('');
  const [dbNameInput, setDbNameInput] = useState('');
  const [dbUserInput, setDbUserInput] = useState('');
  const [dbPassInput, setDbPassInput] = useState('');
  const [dbPortInput, setDbPortInput] = useState('5432');
  const [dbConfigMessage, setDbConfigMessage] = useState('');
  const [dbConfigSuccess, setDbConfigSuccess] = useState(true);
  const [dbLoading, setDbLoading] = useState(false);

  const navigateToTab = (tabName) => {
    setActiveTab(tabName);
    const index = tabName === 'config' ? 0 : tabName === 'fleet' ? 1 : tabName === 'scanner' ? 2 : 3;
    scrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: true });
    
    // Stop camera if navigating away from scanner
    if (tabName !== 'scanner') {
      setScannerActive(false);
    }
  };

  const handleScrollEnd = (e) => {
    const contentOffset = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    const tabs = ['config', 'fleet', 'scanner', 'ai'];
    const tabName = tabs[index];
    setActiveTab(tabName);
    
    // Stop camera if swiped away from scanner
    if (tabName !== 'scanner') {
      setScannerActive(false);
    }
  };

  // Fetch Bays from Spring Boot
  const fetchBaysList = async () => {
    try {
      const res = await axios.get(`http://${laptopIp}:8080/api/bays`, { timeout: 3000 });
      setBays(res.data);
      if (res.data && res.data.length > 0) {
        const storedBay = selectedBay;
        if (!storedBay || !res.data.some(b => b.bayDoorId === storedBay)) {
          setSelectedBay(res.data[0].bayDoorId);
        }
      } else {
        setSelectedBay('');
      }
    } catch (err) {
      console.error("Failed to fetch loading bays:", err);
    }
  };

  // Fetch Trucks from Spring Boot
  const fetchTrucksList = async () => {
    try {
      const res = await axios.get(`http://${laptopIp}:8080/api/trucks`, { timeout: 3000 });
      setTrucks(res.data);
      if (res.data && res.data.length > 0) {
        if (!selectedTruck || !res.data.some(t => t.truckId === selectedTruck)) {
          setSelectedTruck(res.data[0].truckId);
        }
      } else {
        setSelectedTruck('');
      }

      await fetchBaysList();

      // Sync active database settings from backend dynamically
      try {
        const dbRes = await axios.get(`http://${laptopIp}:8080/api/config/database`, { timeout: 3000 });
        if (dbRes.data.status === 'SUCCESS') {
          setDbHost(dbRes.data.host);
          setDbUser(dbRes.data.username);
          setDbPass(dbRes.data.password);
          setDbName(dbRes.data.databaseName);
          setDbPort(dbRes.data.port);

          // Pre-populate input fields
          setDbHostInput(dbRes.data.host);
          setDbUserInput(dbRes.data.username);
          setDbPassInput(dbRes.data.password);
          setDbNameInput(dbRes.data.databaseName);
          setDbPortInput(dbRes.data.port ? dbRes.data.port.toString() : '5432');
          setDbMode(dbRes.data.isCloud ? 'cloud' : 'local');
        }
      } catch (dbErr) {
        console.warn("Failed to synchronize active database configuration metadata:", dbErr);
      }

      setConfigMessage('Logistics database connected.');
      setConfigSuccess(true);
    } catch (err) {
      console.error(err);
      setConfigMessage('Connection Error: Could not reach Spring Boot API.');
      setConfigSuccess(false);
    }
  };

  useEffect(() => {
    if (isIpLocked) {
      fetchTrucksList();
    }
  }, [isIpLocked, laptopIp]);

  // Handle Assign Truck to Bay
  const handleAssignMapping = async () => {
    setConfigMessage('Publishing mapping route...');
    try {
      const res = await axios.put(`http://${laptopIp}:8080/api/config/assign-truck`, {
        bayDoorId: selectedBay,
        truckId: selectedTruck
      });
      if (res.status === 200 || res.data.status === 'SUCCESS') {
        setConfigSuccess(true);
        setConfigMessage(`Success: Bay ${selectedBay} locked to ${selectedTruck}`);
      }
    } catch (err) {
      console.error(err);
      setConfigSuccess(false);
      setConfigMessage('API Error: Failed to publish mapping.');
    }
  };

  // Handle Add Truck
  const handleAddTruck = async () => {
    if (!newTruckId.trim() || !newDriverName.trim() || !newDestination.trim()) {
      setCrudSuccess(false);
      setCrudMessage('All truck registration fields are required.');
      return;
    }

    setCrudMessage('Registering new logistics fleet...');
    setCrudSuccess(false);

    try {
      const res = await axios.post(`http://${laptopIp}:8080/api/trucks`, {
        truckId: newTruckId.trim().toUpperCase(),
        driverName: newDriverName.trim(),
        destinationCity: newDestination.trim()
      });

      if (res.status === 200 || res.data.status === 'SUCCESS') {
        setCrudSuccess(true);
        setCrudMessage(`Success: registered ${newTruckId} to database.`);
        setNewTruckId('');
        setNewDriverName('');
        setNewDestination('');
        fetchTrucksList(); // refresh trucks list and dropdowns
      }
    } catch (err) {
      console.error(err);
      setCrudSuccess(false);
      setCrudMessage('Error registering truck: duplicate key or database connection error.');
    }
  };

  // Handle Delete Truck
  const handleDeleteTruck = async (truckId) => {
    setCrudMessage(`Deregistering truck ${truckId}...`);
    setCrudSuccess(false);

    try {
      const res = await axios.delete(`http://${laptopIp}:8080/api/trucks/${truckId}`);
      if (res.status === 200 || res.data.status === 'SUCCESS') {
        setCrudSuccess(true);
        setCrudMessage(`Success: removed ${truckId} from database.`);
        fetchTrucksList(); // refresh trucks list and dropdowns
      }
    } catch (err) {
      console.error(err);
      setCrudSuccess(false);
      setCrudMessage('Error deleting truck: check active assignments.');
    }
  };

  // Handle Add Loading Bay
  const handleAddBay = async () => {
    if (!newBayId.trim()) {
      setCrudSuccess(false);
      setCrudMessage('Bay Door ID is required.');
      return;
    }

    setCrudMessage('Registering new Loading Bay Door...');
    setCrudSuccess(false);

    try {
      const res = await axios.post(`http://${laptopIp}:8080/api/bays`, {
        bayDoorId: newBayId.trim().toUpperCase()
      });

      if (res.status === 200 || res.data.status === 'SUCCESS') {
        setCrudSuccess(true);
        setCrudMessage(`Success: registered ${newBayId.trim().toUpperCase()} to database.`);
        setNewBayId('');
        fetchTrucksList(); // refresh bays list
      }
    } catch (err) {
      console.error(err);
      setCrudSuccess(false);
      setCrudMessage('Error registering bay door: duplicate key or connection error.');
    }
  };

  // Handle Delete Loading Bay
  const handleDeleteBay = async (bayId) => {
    setCrudMessage(`Deregistering loading bay ${bayId}...`);
    setCrudSuccess(false);

    try {
      const res = await axios.delete(`http://${laptopIp}:8080/api/bays/${bayId}`);
      if (res.status === 200 || res.data.status === 'SUCCESS') {
        setCrudSuccess(true);
        setCrudMessage(`Success: removed ${bayId} from database.`);
        fetchTrucksList(); // refresh bays list
      }
    } catch (err) {
      console.error(err);
      setCrudSuccess(false);
      setCrudMessage('Error deleting loading bay: connection error.');
    }
  };

  // Handle Reset Manifest
  const handleResetManifest = async () => {
    setConfigMessage('Resetting manifest database ledger...');
    try {
      const res = await axios.post(`http://${laptopIp}:8080/api/config/reset-manifest`);
      if (res.data.status === 'SUCCESS') {
        setConfigSuccess(true);
        setConfigMessage('Success: Active manifest reset for re-testing!');
        fetchTrucksList(); // refresh dropdown lists
      }
    } catch (err) {
      console.error(err);
      setConfigSuccess(false);
      setConfigMessage('API Error: Failed to reset manifest.');
    }
  };

  // Handle Save Database Configuration
  const handleSaveDbConfig = async () => {
    setDbLoading(true);
    setDbConfigMessage('Updating database connection pool...');
    setDbConfigSuccess(true);

    let targetUrl = '';
    let targetUser = '';
    let targetPass = '';

    if (dbMode === 'local') {
      targetUrl = 'jdbc:postgresql://postgres-db:5432/warehouse_ledger';
      targetUser = 'warehouse_admin';
      targetPass = 'supersecretpassword';
    } else {
      if (!dbHostInput.trim() || !dbNameInput.trim() || !dbUserInput.trim() || !dbPassInput.trim()) {
        setDbConfigSuccess(false);
        setDbConfigMessage('All cloud database fields are required.');
        setDbLoading(false);
        return;
      }
      targetUrl = `jdbc:postgresql://${dbHostInput.trim()}:${dbPortInput.trim()}/${dbNameInput.trim()}?sslmode=require`;
      targetUser = dbUserInput.trim();
      targetPass = dbPassInput.trim();
    }

    try {
      const response = await axios.post(`http://${laptopIp}:8080/api/config/database`, {
        dbUrl: targetUrl,
        username: targetUser,
        password: targetPass
      });

      if (response.status === 200 || response.data.status === 'SUCCESS') {
        setDbConfigSuccess(true);
        setDbConfigMessage(`Success: Database pool switched to ${dbMode === 'local' ? 'Local' : 'Cloud'} database.`);
        
        // Update local gateway states
        setDbHost(dbHostInput);
        setDbUser(targetUser);
        setDbPass(targetPass);
        setDbName(dbNameInput);
        setDbPort(parseInt(dbPortInput));
        
        fetchTrucksList(); // refresh data
      }
    } catch (error) {
      console.error(error);
      setDbConfigSuccess(false);
      setDbConfigMessage(error.response?.data?.message || 'Database connection test failed. Reverting.');
    } finally {
      setDbLoading(false);
    }
  };

  // Handle Scan Verification
  const handleBarcodeScanned = async ({ data }) => {
    const match = data.match(/PKG-\d+/);
    if (!match) return; // Ignore non-package IDs

    const packageId = match[0];
    setScannedId(packageId);
    setScannerActive(false);
    setScanStatus('PROCESSING');
    setScanMessage('Verifying package routing with backend...');

    try {
      const res = await axios.post(`http://${laptopIp}:8080/api/verify`, {
        packageId: packageId,
        bayDoorId: selectedBay
      });
      
      const { status, message } = res.data;
      setScanStatus(status); // VALID, MISMATCH, DUPLICATE
      setScanMessage(message);
    } catch (err) {
      console.error(err);
      setScanStatus('MISMATCH');
      setScanMessage(err.response?.data?.message || 'Verification failed: Connection Timeout.');
    }
  };

  // Handle AI Query
  const handleAiQuery = async () => {
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiError('');
    setAiResults(null);

    try {
      const res = await axios.post(`http://${laptopIp}:3000/api/v1/query`, {
        targetTable: ["loading_manifest", "archived_manifest", "truck_inventory", "bay_door_routing"],
        intent: aiPrompt.trim(),
        clientDB: {
          host: dbHost,
          username: dbUser,
          password: dbPass,
          databaseName: dbName,
          port: dbPort
        }
      });

      if (res.data.success) {
        setAiResults(res.data);
      } else {
        setAiError(res.data.error || 'Parsing error.');
      }
    } catch (err) {
      console.error(err);
      setAiError(err.response?.data?.error || 'Security Blocked: Unauthorized DB command.');
    } finally {
      setAiLoading(false);
    }
  };

  // Render scan status styles
  const getStatusStyle = () => {
    if (scanStatus === 'VALID') return styles.statusValid;
    if (scanStatus === 'MISMATCH') return styles.statusMismatch;
    if (scanStatus === 'DUPLICATE') return styles.statusDuplicate;
    return styles.statusIdle;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0c10" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TANKLOGIX MOBILE GATEWAY</Text>
        <Text style={styles.headerSub}>Edge Vision Subsystem</Text>
      </View>

      {/* Connection IP Lock Bar */}
      <View style={styles.ipBar}>
        <Text style={styles.ipLabel}>Laptop LAN IP:</Text>
        <TextInput
          style={styles.ipInput}
          value={laptopIp}
          onChangeText={setLaptopIp}
          placeholder="e.g. 192.168.1.15"
          placeholderTextColor="#8892b0"
          editable={!isIpLocked}
        />
        <TouchableOpacity 
          style={[styles.ipBtn, isIpLocked ? styles.ipBtnLocked : null]} 
          onPress={() => setIsIpLocked(!isIpLocked)}
        >
          <Text style={styles.ipBtnText}>{isIpLocked ? 'Unlock' : 'Connect'}</Text>
        </TouchableOpacity>
      </View>

      {!isIpLocked ? (
        <View style={styles.centered}>
          <Text style={styles.promptText}>Please enter your laptop's Local IP address and click Connect to initialize the mobile client.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          
          {/* Main Body Tabs */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            style={{ flex: 1 }}
          >
            {/* TAB 1: Config */}
            <View style={{ width: screenWidth }}>
              <ScrollView contentContainerStyle={styles.tabContent}>
                <Text style={styles.sectionTitle}>1. Gate Provisioning</Text>
                <Text style={styles.descText}>Select terminal loading bay door and assign arriving carrier.</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Select Loading Bay</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={selectedBay}
                      style={styles.picker}
                      onValueChange={(itemValue) => setSelectedBay(itemValue)}
                      dropdownIconColor="#66fcf1"
                    >
                      {bays.length === 0 ? (
                        <Picker.Item label="-- No Bays Configured --" value="" />
                      ) : (
                        bays.map(b => (
                          <Picker.Item 
                            key={b.bayDoorId} 
                            label={`${b.bayDoorId} ${b.activeTruckId ? `(Hosting ${b.activeTruckId})` : '(Idle)'}`} 
                            value={b.bayDoorId} 
                          />
                        ))
                      )}
                    </Picker>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Assign Docked Truck</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={selectedTruck}
                      style={styles.picker}
                      onValueChange={(itemValue) => setSelectedTruck(itemValue)}
                      dropdownIconColor="#66fcf1"
                    >
                      {trucks.map(t => (
                        <Picker.Item key={t.truckId} label={`${t.truckId} (${t.driverName})`} value={t.truckId} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <TouchableOpacity style={styles.btnAction} onPress={handleAssignMapping}>
                  <Text style={styles.btnText}>Lock Gate Route Mapping</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnStart, { marginTop: 10 }]} 
                  onPress={handleResetManifest}
                >
                  <Text style={[styles.btnText, { color: '#66fcf1' }]}>Refresh Record & Reset Manifest</Text>
                </TouchableOpacity>

                {configMessage ? (
                  <Text style={[styles.messageText, configSuccess ? styles.textSuccess : styles.textError]}>
                    {configMessage}
                  </Text>
                ) : null}

                {/* Database Settings Section */}
                <Text style={[styles.sectionTitle, { marginTop: 35 }]}>Database Storage Settings</Text>
                <Text style={styles.descText}>Hot-swap active ledger database configuration dynamically.</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Database Mode</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={dbMode}
                      style={styles.picker}
                      onValueChange={(itemValue) => setDbMode(itemValue)}
                      dropdownIconColor="#66fcf1"
                    >
                      <Picker.Item label="On-Premise (Local Container)" value="local" />
                      <Picker.Item label="Cloud PostgreSQL (Neon/External)" value="cloud" />
                    </Picker>
                  </View>
                </View>

                {dbMode === 'cloud' && (
                  <View style={styles.crudFormContainer}>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Cloud Database Host</Text>
                      <TextInput
                        style={styles.crudInput}
                        value={dbHostInput}
                        onChangeText={setDbHostInput}
                        placeholder="e.g. ep-hidden-sky.neon.tech"
                        placeholderTextColor="#8892b0"
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Database Name</Text>
                      <TextInput
                        style={styles.crudInput}
                        value={dbNameInput}
                        onChangeText={setDbNameInput}
                        placeholder="e.g. neondb"
                        placeholderTextColor="#8892b0"
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Database Username</Text>
                      <TextInput
                        style={styles.crudInput}
                        value={dbUserInput}
                        onChangeText={setDbUserInput}
                        placeholder="e.g. neondb_owner"
                        placeholderTextColor="#8892b0"
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Database Password</Text>
                      <TextInput
                        style={styles.crudInput}
                        value={dbPassInput}
                        onChangeText={setDbPassInput}
                        placeholder="Enter password"
                        placeholderTextColor="#8892b0"
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Database Port</Text>
                      <TextInput
                        style={styles.crudInput}
                        value={dbPortInput}
                        onChangeText={setDbPortInput}
                        placeholder="5432"
                        placeholderTextColor="#8892b0"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.btnAction} 
                  onPress={handleSaveDbConfig}
                  disabled={dbLoading}
                >
                  {dbLoading ? (
                    <ActivityIndicator color="#0b0c10" />
                  ) : (
                    <Text style={styles.btnText}>Apply DB Configuration</Text>
                  )}
                </TouchableOpacity>

                {dbConfigMessage ? (
                  <Text style={[styles.messageText, dbConfigSuccess ? styles.textSuccess : styles.textError]}>
                    {dbConfigMessage}
                  </Text>
                ) : null}

              </ScrollView>
            </View>

            {/* TAB 2: Fleet & Bay CRUD */}
            <View style={{ width: screenWidth }}>
              <ScrollView contentContainerStyle={styles.tabContent}>
                <Text style={styles.sectionTitle}>2. Fleet & Bay Manager</Text>
                <Text style={styles.descText}>Register or deregister inbound logistics fleet and loading bays.</Text>

                {/* SECTION A: FLEET CRUD */}
                <Text style={[styles.label, { fontSize: 13, borderBottomWidth: 1, borderBottomColor: '#1f2833', paddingBottom: 6, marginBottom: 12 }]}>Fleet Management</Text>
                <View style={styles.crudFormContainer}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Truck Serial ID</Text>
                    <TextInput
                      style={styles.crudInput}
                      value={newTruckId}
                      onChangeText={setNewTruckId}
                      placeholder="e.g. TRUCK_D"
                      placeholderTextColor="#8892b0"
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Driver Full Name</Text>
                    <TextInput
                      style={styles.crudInput}
                      value={newDriverName}
                      onChangeText={setNewDriverName}
                      placeholder="e.g. Sunil Kumar"
                      placeholderTextColor="#8892b0"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Destination City</Text>
                    <TextInput
                      style={styles.crudInput}
                      value={newDestination}
                      onChangeText={setNewDestination}
                      placeholder="e.g. Mumbai"
                      placeholderTextColor="#8892b0"
                    />
                  </View>

                  <TouchableOpacity style={styles.btnAction} onPress={handleAddTruck}>
                    <Text style={styles.btnText}>Register Logistics Fleet</Text>
                  </TouchableOpacity>
                </View>

                {/* Fleet list section */}
                <View style={styles.fleetListContainer}>
                  <Text style={styles.label}>Active System Fleet Registrations</Text>
                  {trucks && trucks.length > 0 ? (
                    trucks.map(t => (
                      <View key={t.truckId} style={styles.truckCard}>
                        <View style={styles.truckCardDetails}>
                          <Text style={styles.truckIdText}>{t.truckId}</Text>
                          <Text style={styles.truckDriverText}>Driver: {t.driverName}</Text>
                          <Text style={styles.truckDestText}>Dest: {t.destinationCity}</Text>
                        </View>
                        <TouchableOpacity style={styles.btnDeleteTruck} onPress={() => handleDeleteTruck(t.truckId)}>
                          <Text style={styles.btnDeleteText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noResultsText}>No fleets currently registered.</Text>
                  )}
                </View>

                {/* SECTION B: BAYS CRUD */}
                <Text style={[styles.label, { fontSize: 13, borderBottomWidth: 1, borderBottomColor: '#1f2833', paddingBottom: 6, marginBottom: 12, marginTop: 20 }]}>Loading Bay Management</Text>
                <View style={styles.crudFormContainer}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Bay Door Terminal ID</Text>
                    <TextInput
                      style={styles.crudInput}
                      value={newBayId}
                      onChangeText={setNewBayId}
                      placeholder="e.g. BAY_DOOR_04"
                      placeholderTextColor="#8892b0"
                      autoCapitalize="characters"
                    />
                  </View>

                  <TouchableOpacity style={styles.btnAction} onPress={handleAddBay}>
                    <Text style={styles.btnText}>Register Loading Bay</Text>
                  </TouchableOpacity>
                </View>

                {/* Bays list section */}
                <View style={styles.fleetListContainer}>
                  <Text style={styles.label}>Active System Loading Bays</Text>
                  {bays && bays.length > 0 ? (
                    bays.map(b => (
                      <View key={b.bayDoorId} style={styles.truckCard}>
                        <View style={styles.truckCardDetails}>
                          <Text style={styles.truckIdText}>{b.bayDoorId}</Text>
                          <Text style={styles.truckDriverText}>Status: {b.activeTruckId ? `Hosting ${b.activeTruckId}` : 'Idle'}</Text>
                        </View>
                        <TouchableOpacity style={styles.btnDeleteTruck} onPress={() => handleDeleteBay(b.bayDoorId)}>
                          <Text style={styles.btnDeleteText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noResultsText}>No loading bays currently registered.</Text>
                  )}
                </View>

                {crudMessage ? (
                  <Text style={[styles.messageText, crudSuccess ? styles.textSuccess : styles.textError, { marginTop: 15 }]}>
                    {crudMessage}
                  </Text>
                ) : null}
              </ScrollView>
            </View>

            {/* TAB 3: Scanner */}
            <View style={{ width: screenWidth, flex: 1 }}>
              <View style={styles.tabContentFull}>
                <Text style={styles.sectionTitle}>3. Live Scanner Terminal</Text>
                <Text style={styles.descText}>Active Bay: <Text style={{ color: '#66fcf1', fontWeight: 'bold' }}>{selectedBay}</Text></Text>

                {scannerActive ? (
                  <View style={styles.cameraContainer}>
                    <CameraView
                      style={StyleSheet.absoluteFillObject}
                      onBarcodeScanned={handleBarcodeScanned}
                    />
                    <View style={styles.scannerReticle} />
                  </View>
                ) : (
                  <View style={[styles.statusPanel, getStatusStyle()]}>
                    <Text style={styles.statusTitle}>
                      {scanStatus === 'PROCESSING' ? 'CHECKING...' : scanStatus}
                    </Text>
                    <Text style={styles.statusMessage}>{scanMessage}</Text>
                    {scannedId ? (
                      <Text style={styles.scannedIdText}>Last Package Scanned: {scannedId}</Text>
                    ) : null}
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.btnAction, scannerActive ? styles.btnStop : styles.btnStart]} 
                  onPress={() => {
                    if (!permission || !permission.granted) {
                      requestPermission();
                    } else {
                      setScannerActive(!scannerActive);
                      setScanStatus('IDLE');
                      setScanMessage('Armed. Align QR code in camera view.');
                    }
                  }}
                >
                  <Text style={styles.btnText}>{scannerActive ? 'Stop Scanner' : 'Arm Camera Scanner'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* TAB 4: AI Gateway */}
            <View style={{ width: screenWidth }}>
              <ScrollView contentContainerStyle={styles.tabContent}>
                <Text style={styles.sectionTitle}>4. AI Data Access Gateway</Text>
                <Text style={styles.descText}>Query the database ledger using plain language.</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Ask Database (Ollama/Gemma)</Text>
                  <TextInput
                    style={styles.aiInput}
                    value={aiPrompt}
                    onChangeText={setAiPrompt}
                    placeholder="e.g. Show all active trucks or get pending packages"
                    placeholderTextColor="#8892b0"
                    multiline
                  />
                </View>

                <TouchableOpacity style={styles.btnAction} onPress={handleAiQuery} disabled={aiLoading}>
                  {aiLoading ? (
                    <ActivityIndicator color="#0b0c10" />
                  ) : (
                    <Text style={styles.btnText}>Compile AI Intent Query</Text>
                  )}
                </TouchableOpacity>

                {aiError ? (
                  <View style={styles.aiErrorBox}>
                    <Text style={styles.textError}>{aiError}</Text>
                  </View>
                ) : null}

                {aiResults ? (
                  <View style={styles.aiResultsContainer}>
                    <View style={styles.sqlBox}>
                      <Text style={styles.sqlBoxLabel}>COMPILED SQL (SQLGUARD ENFORCED)</Text>
                      <Text style={styles.sqlBoxQuery}>{aiResults.compiledQuery}</Text>
                    </View>

                    <Text style={styles.resultsLabel}>RESULTS ({aiResults.recordsCount})</Text>
                    
                    {aiResults.data && aiResults.data.length > 0 ? (
                      <ScrollView horizontal>
                        <View>
                          {/* Table Header */}
                          <View style={styles.tableHeaderRow}>
                            {Object.keys(aiResults.data[0]).map(key => (
                              <Text key={key} style={styles.tableHeaderCell}>{key.toUpperCase()}</Text>
                            ))}
                          </View>
                          {/* Table Rows */}
                          {aiResults.data.map((row, idx) => (
                            <View key={idx} style={styles.tableBodyRow}>
                              {Object.values(row).map((val, colIdx) => (
                                <Text key={colIdx} style={styles.tableBodyCell}>
                                  {val === null ? 'NULL' : val.toString()}
                                </Text>
                              ))}
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    ) : (
                      <Text style={styles.noResultsText}>No records returned.</Text>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </ScrollView>

          {/* Bottom Tabs Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'config' ? styles.tabItemActive : null]}
              onPress={() => navigateToTab('config')}
            >
              <Text style={[styles.tabText, activeTab === 'config' ? styles.tabTextActive : null]}>Config</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'fleet' ? styles.tabItemActive : null]}
              onPress={() => navigateToTab('fleet')}
            >
              <Text style={[styles.tabText, activeTab === 'fleet' ? styles.tabTextActive : null]}>Fleet & Bay</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'scanner' ? styles.tabItemActive : null]}
              onPress={() => navigateToTab('scanner')}
            >
              <Text style={[styles.tabText, activeTab === 'scanner' ? styles.tabTextActive : null]}>Scanner</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'ai' ? styles.tabItemActive : null]}
              onPress={() => navigateToTab('ai')}
            >
              <Text style={[styles.tabText, activeTab === 'ai' ? styles.tabTextActive : null]}>AI Gateway</Text>
            </TouchableOpacity>
          </View>

        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  header: {
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2833',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: '#66fcf1',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  ipBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#151a22',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2833',
  },
  ipLabel: {
    color: '#66fcf1',
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 8,
  },
  ipInput: {
    flex: 1,
    height: 35,
    backgroundColor: '#1f2833',
    color: '#ffffff',
    borderRadius: 4,
    paddingLeft: 10,
    fontSize: 13,
  },
  ipBtn: {
    backgroundColor: '#66fcf1',
    paddingHorizontal: 12,
    height: 35,
    justifyContent: 'center',
    borderRadius: 4,
    marginLeft: 8,
  },
  ipBtnLocked: {
    backgroundColor: '#e74c3c',
  },
  ipBtnText: {
    color: '#0b0c10',
    fontWeight: 'bold',
    fontSize: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  promptText: {
    color: '#8892b0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  tabContent: {
    padding: 20,
    paddingBottom: 80,
  },
  tabContentFull: {
    flex: 1,
    padding: 20,
    paddingBottom: 80,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  descText: {
    color: '#8892b0',
    fontSize: 12,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#66fcf1',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: '#1f2833',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    color: '#ffffff',
    height: 50,
  },
  btnAction: {
    backgroundColor: '#66fcf1',
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: {
    color: '#0b0c10',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnStart: {
    backgroundColor: '#1f2833',
    borderWidth: 1,
    borderColor: '#66fcf1',
  },
  btnStop: {
    backgroundColor: '#e74c3c',
  },
  messageText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 15,
  },
  textSuccess: {
    color: '#2ecc71',
  },
  textError: {
    color: '#e74c3c',
  },
  cameraContainer: {
    flex: 1,
    minHeight: 250,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1f2833',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scannerReticle: {
    width: 160,
    height: 160,
    borderWidth: 2,
    borderColor: '#66fcf1',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  statusPanel: {
    flex: 1,
    minHeight: 250,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  statusIdle: {
    backgroundColor: '#151a22',
    borderColor: '#1f2833',
  },
  statusValid: {
    backgroundColor: 'rgba(46, 204, 113, 0.05)',
    borderColor: '#2ecc71',
  },
  statusMismatch: {
    backgroundColor: 'rgba(231, 76, 60, 0.05)',
    borderColor: '#e74c3c',
  },
  statusDuplicate: {
    backgroundColor: 'rgba(241, 196, 15, 0.05)',
    borderColor: '#f1c40f',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8892b0',
    marginBottom: 10,
    letterSpacing: 1,
  },
  statusMessage: {
    color: '#a8b2d1',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  scannedIdText: {
    color: '#66fcf1',
    fontSize: 12,
    marginTop: 15,
    fontWeight: 'bold',
  },
  aiInput: {
    backgroundColor: '#1f2833',
    color: '#ffffff',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  aiErrorBox: {
    backgroundColor: 'rgba(231, 76, 60, 0.05)',
    padding: 10,
    borderRadius: 6,
    marginTop: 15,
  },
  aiResultsContainer: {
    marginTop: 20,
  },
  sqlBox: {
    backgroundColor: '#0b0c10',
    borderWidth: 1,
    borderColor: '#1f2833',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  sqlBoxLabel: {
    color: '#66fcf1',
    fontSize: 8,
    fontWeight: 'bold',
  },
  sqlBoxQuery: {
    color: '#2ecc71',
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 4,
  },
  resultsLabel: {
    color: '#66fcf1',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noResultsText: {
    color: '#8892b0',
    fontSize: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#151a22',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2833',
  },
  tableHeaderCell: {
    color: '#66fcf1',
    fontWeight: 'bold',
    fontSize: 10,
    padding: 10,
    width: 100,
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2833',
  },
  tableBodyCell: {
    color: '#ffffff',
    fontSize: 11,
    padding: 10,
    width: 100,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1f2833',
    backgroundColor: '#0b0c10',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#66fcf1',
  },
  tabText: {
    color: '#8892b0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#66fcf1',
  },
  crudFormContainer: {
    backgroundColor: '#151a22',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2833',
    marginBottom: 20,
  },
  crudInput: {
    backgroundColor: '#1f2833',
    color: '#ffffff',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    height: 40,
  },
  fleetListContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  truckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151a22',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2833',
    marginBottom: 10,
  },
  truckCardDetails: {
    flex: 1,
  },
  truckIdText: {
    color: '#66fcf1',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  truckDriverText: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 2,
  },
  truckDestText: {
    color: '#8892b0',
    fontSize: 11,
  },
  btnDeleteTruck: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderWidth: 1,
    borderColor: '#e74c3c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  btnDeleteText: {
    color: '#e74c3c',
    fontSize: 11,
    fontWeight: 'bold',
  }
});