# Implementation Plan - Dynamic Loading Bay Management

We will implement dynamic CRUD management for Loading Bays (Bay Doors) across the Backend, Web Portal, and Mobile app. This removes hardcoded bay selections and allows supervisors to register/remove loading terminal gates dynamically.

## Proposed Changes

### 1. Spring Boot Backend

#### [MODIFY] [VerificationController.java](file:///c:/Users/DELL/Downloads/warehouse/warehouse/src/main/java/com/findAndVerify/warehouse/Controller/VerificationController.java)
Add three endpoints for Bay Door routing:
- `GET /api/bays`: Returns the list of all registered bay doors (`List<BayDoorRouting>`).
- `POST /api/bays`: Registers a new bay door slot. Accepts `{ "bayDoorId": "..." }`.
- `DELETE /api/bays/{bayDoorId}`: Removes a bay door slot from the system.

---

### 2. Web Portal Frontend

#### [MODIFY] [AdminConfigPage.jsx](file:///c:/Users/DELL/Downloads/warehouse/webFrontend/supervisor-portal/src/screens/AdminConfigPage.jsx)
1. **Dynamic Dropdowns**: Fetch bay doors dynamically from `GET /api/bays` on mount, instead of hardcoding `BAY_DOOR_01`, `02`, `03` options.
2. **Master CRUD Screen**:
   - Add a form to register a new Bay Door (input slot ID).
   - Display a list/table of currently registered bay doors with a "Remove" button.

---

### 3. Mobile Frontend App

#### [MODIFY] [App.js](file:///c:/Users/DELL/Downloads/warehouse/frontend/warehouse-mobile/src/App.js)
1. **CRUD State Variables**: Add states for `bayDoors`, `newBayId`, and CRUD message fields.
2. **Dynamic Provisioning**: Fetch bay doors dynamically from `GET /api/bays` on connection and load them into the Config tab Picker.
3. **Master CRUD Screen (Fleet tab)**:
   - Rename the tab/view section to **Fleet & Bay Manager**.
   - Add a form to register a new Loading Bay.
   - Display a scrollable list of registered bays with a "Remove" button.

---

## Verification Plan

### Automated Steps
- Compile backend on host (`.\mvnw.cmd clean package -DskipTests`).
- Rebuild backend-api container and recreate (`docker-compose build backend-api`, `docker-compose up -d --force-recreate backend-api`).

### Manual Verification
1. Open [http://localhost/](http://localhost/) and verify that the active bay doors are loaded dynamically.
2. Add a new Bay Door `BAY_DOOR_04`. Verify it shows up in the configuration slot dropdowns immediately on both Web and Mobile.
3. Remove `BAY_DOOR_04` and check that it disappears from all selectors.
