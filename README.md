# POLARIS — Polar Command & Operations Management System

> **Lead Full-Stack Engineering Implementation**  
> Faithfully built to mirror the Stitch Design System (`projects/14846320351983593312`) and Polar Command PRD specifications.

---

## Architecture Overview

```
React (Vite + Tailwind v4 + Leaflet + Recharts + Lucide)
        ↓ (Axios HTTP + Socket.IO WebSockets)
Express.js REST API (Node.js)
        ↓
Controller & Automation Layer (node-cron + cross-module events)
        ↓
Mongoose ODM (14 schemas with indexes & pre-save hooks)
        ↓
MongoDB (Bases, Users, Expeditions, Cargo, Inventory, Assets, Personnel, Tasks, Incidents, Alerts)
```

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **MongoDB**: Local MongoDB daemon running at `mongodb://127.0.0.1:27017` or MongoDB Atlas connection string.

### 2. Backend Setup
```bash
cd server
npm install
# Seed the database with 8 demo users, 4 stations, expeditions, cargo, and active critical emergency
npm run seed
# Start backend server (Port 8002)
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
# Start Vite development server (Port 5173 with proxy to 8002)
npm run dev
```

Visit: `http://localhost:5173`

---

## Verified Demo Credentials (All 8 Roles)

| Role | Email | Password |
|---|---|---|
| **SuperAdmin** | `admin@polaris.aq` | `Polaris@2026` |
| **ExpeditionManager** | `expeditions@polaris.aq` | `Polaris@2026` |
| **LogisticsCoordinator** | `logistics@polaris.aq` | `Polaris@2026` |
| **InventoryManager** | `inventory@polaris.aq` | `Polaris@2026` |
| **BaseOfficer** | `base.maitri@polaris.aq` | `Polaris@2026` |
| **MedicalOfficer** | `medical@polaris.aq` | `Polaris@2026` |
| **PersonnelManager** | `personnel@polaris.aq` | `Polaris@2026` |
| **Viewer** | `viewer@polaris.aq` | `Polaris@2026` |

*Tip: Quick one-click demo logins are available directly on the login screen.*

---

## 4 Polar Bases Configured
1. **Maitri Station** (Schirmacher Oasis, Queen Maud Land, Antarctica: -70.767°, 11.733°)
2. **Bharati Station** (Larsemann Hills, East Antarctica: -69.407°, 76.191°)
3. **Himadri Station** (Ny-Ålesund, Svalbard, Arctic: 78.924°, 11.928°)
4. **RV Bharati** (Southern Ocean Research Vessel: -65.200°, 45.300°)

---

## Implemented Modules & Stitch Alignment
1. **Home & Landing**: Hero telemetry, live feed stats, command CTA.
2. **Auth & Access**: Role switcher, cryptographic password authentication, token refresh.
3. **Command Dashboard**: 4 KPI cards, circular readiness donut gauge, ongoing expeditions, interactive Leaflet polar map with dark theme and radar scan, cargo overview, active emergency widget, real-time activity stream.
4. **Expeditions Directory & Details**: Status pipeline, progress bars, scientific objectives, milestone tracking.
5. **Cargo Tracking**: Pipeline stages (Draft, Loading, InTransit, Arrived, Delivered, Delayed), QR code generation, status update modal triggering backend inventory updates.
6. **Cryogenic Inventory**: Sub-zero fuel bladders, low-stock threshold alerts, inter-base stock transfers.
7. **Polar Assets**: Heavy tracked machinery (PistenBully, Hägglunds), turbine maintenance loggers.
8. **Personnel Roster**: Medical clearance status, skills tags, emergency contacts.
9. **Emergency Incident Command**: Priority emergency triage, live action timeline, declare emergency protocol.
10. **Alerts Center**: Unread count tracking, severity filters, mark-as-read acknowledgement.
11. **Predictive Analytics**: Recharts visualizations for readiness progression, fuel reserves, and supply chain status.
12. **Report Center**: Automated CSV report generator and download across all modules.
13. **User Administration**: Provisioning and RBAC control (SuperAdmin exclusive).
