const fs = require('fs');
const path = require('path');
const readline = require('readline');

// In-memory fallback dataset so POLARIS is 100% operational even without a running local MongoDB instance
let mockBases = [
  {
    _id: '67cda0000000000000000001',
    name: 'Maitri Station',
    code: 'MAITRI',
    location: 'Schirmacher Oasis, Queen Maud Land, Antarctica',
    coordinates: { lat: -70.767, lng: 11.733 },
    type: 'Permanent Station',
    capacity: 65,
    currentPersonnel: 38,
    status: 'Operational',
    elevationMeters: 117,
  },
  {
    _id: '67cda0000000000000000002',
    name: 'Bharati Station',
    code: 'BHARATI',
    location: 'Larsemann Hills, East Antarctica',
    coordinates: { lat: -69.407, lng: 76.191 },
    type: 'Permanent Station',
    capacity: 72,
    currentPersonnel: 44,
    status: 'Operational',
    elevationMeters: 35,
  },
  {
    _id: '67cda0000000000000000003',
    name: 'Himadri Station',
    code: 'HIMADRI',
    location: 'Ny-Ålesund, Spitsbergen, Svalbard (Arctic)',
    coordinates: { lat: 78.924, lng: 11.928 },
    type: 'Research Station',
    capacity: 25,
    currentPersonnel: 14,
    status: 'Operational',
    elevationMeters: 15,
  },
  {
    _id: '67cda0000000000000000004',
    name: 'RV Bharati',
    code: 'RV-BHARATI',
    location: 'Southern Ocean (Off Princess Astrid Coast)',
    coordinates: { lat: -65.2, lng: 45.3 },
    type: 'Mobile Vessel',
    capacity: 50,
    currentPersonnel: 28,
    status: 'Operational',
    elevationMeters: 0,
  },
];

let mockUsers = [
  { _id: '67cda1000000000000000001', name: 'Commander Sarah Jenkins', email: 'admin@polaris.aq', role: 'SuperAdmin', isActive: true },
  { _id: '67cda1000000000000000002', name: 'Dr. Rajesh Sharma', email: 'expeditions@polaris.aq', role: 'ExpeditionManager', isActive: true },
  { _id: '67cda1000000000000000003', name: 'Elena Rostova', email: 'logistics@polaris.aq', role: 'LogisticsCoordinator', isActive: true },
  { _id: '67cda1000000000000000004', name: 'Marcus Vance', email: 'inventory@polaris.aq', role: 'InventoryManager', isActive: true },
  { _id: '67cda1000000000000000005', name: 'Capt. Thomas Lindqvist', email: 'base.maitri@polaris.aq', role: 'BaseOfficer', isActive: true },
  { _id: '67cda1000000000000000006', name: 'Dr. Maya Patel', email: 'medical@polaris.aq', role: 'MedicalOfficer', isActive: true },
  { _id: '67cda1000000000000000007', name: 'Sofia Al-Mansoor', email: 'personnel@polaris.aq', role: 'PersonnelManager', isActive: true },
  { _id: '67cda1000000000000000008', name: 'General Staff Observer', email: 'viewer@polaris.aq', role: 'Viewer', isActive: true },
];

let mockExpeditions = [
  {
    _id: '67cda2000000000000000001',
    code: 'INAE-44',
    name: '44th Indian Antarctic Expedition',
    baseName: 'Bharati Station',
    status: 'Active',
    startDate: '2025-11-15T00:00:00.000Z',
    endDate: '2026-12-20T00:00:00.000Z',
    readinessScore: 87,
    riskLevel: 'Moderate',
    progress: 75,
    aiRiskPrediction: 'Low probability of delay. Weather window optimal for next 7 days.',
    objectives: ['Drill 120m ice core at Amery Ice Shelf', 'Upgrade Bharati wind turbine farm', 'Map penguin colonies with UAV'],
    milestones: [
      { title: 'Base Camp Setup', dueDate: '2025-12-01', status: 'Completed' },
      { title: 'Traverse to Amery Ridge', dueDate: '2026-02-15', status: 'Completed' },
      { title: 'Subglacial Ice Core Extraction', dueDate: '2026-05-30', status: 'InProgress' },
    ],
    budget: { allocated: 4500000, spent: 2850000 },
  },
  {
    _id: '67cda2000000000000000002',
    code: 'LARSEM-2026',
    name: 'Larsemann Hills Structural Bedrock Survey',
    baseName: 'Bharati Station',
    status: 'Active',
    startDate: '2026-01-10T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    readinessScore: 62,
    riskLevel: 'High',
    progress: 41,
    aiRiskPrediction: '74-knot gusts causing 3-day delay. Sheltering at Refuge Pod 3.',
    objectives: ['Sustain wintering team of 25 personnel', 'Maintain ozone observation Dobson spectrophotometer'],
    milestones: [
      { title: 'Lake Pipeline Heat-Tracing', dueDate: '2026-02-01', status: 'Completed' },
      { title: 'Fuel Delivery Convoy from Coast', dueDate: '2026-03-05', status: 'Pending' },
    ],
    budget: { allocated: 3800000, spent: 1900000 },
  },
  {
    _id: '67cda2000000000000000003',
    code: 'ARCTIC-2026',
    name: 'Ny-Ålesund Spring Atmospheric Survey',
    baseName: 'Himadri Station',
    status: 'Planning',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-09-30T00:00:00.000Z',
    readinessScore: 45,
    riskLevel: 'Low',
    progress: 0,
    aiRiskPrediction: 'Awaiting sensor bench calibration. No environmental risks.',
    objectives: ['Deploy multi-wavelength micro-pulse lidar', 'Quantify organic aerosols during snow melt'],
    milestones: [
      { title: 'Sensor Bench Calibration', dueDate: '2026-03-20', status: 'InProgress' },
    ],
    budget: { allocated: 1200000, spent: 180000 },
  },
  {
    _id: '67cda2000000000000000004',
    code: 'RESUP-26',
    name: 'Bharati Resupply Convoy',
    baseName: 'Bharati Station',
    status: 'Active',
    startDate: '2026-02-01T00:00:00.000Z',
    endDate: '2026-03-15T00:00:00.000Z',
    readinessScore: 94,
    riskLevel: 'Low',
    progress: 92,
    aiRiskPrediction: 'Clear corridor. Docking expected in 2h 15m.',
    objectives: ['Antarctic Station Critical Fuel & Cryo-Logistics'],
    milestones: [
      { title: 'Depart Coast', dueDate: '2026-02-02', status: 'Completed' },
      { title: 'Arrival at Station', dueDate: '2026-03-10', status: 'InProgress' },
    ],
    budget: { allocated: 800000, spent: 650000 },
  },
];

let mockCargo = [
  {
    _id: '67cda3000000000000000001',
    trackingNumber: 'CRG-2026-001',
    title: 'Emergency Fuel Bladder Resupply (Jet A-1)',
    category: 'Fuel',
    priority: 'Urgent',
    status: 'InTransit',
    weightKg: 4200,
    items: [{ name: 'Jet A-1 Fuel Drum', quantity: 20, unit: 'Drums' }],
  },
  {
    _id: '67cda3000000000000000002',
    trackingNumber: 'CRG-2026-002',
    title: 'Replacement Caterpillar Generator Crankshaft',
    category: 'Equipment',
    priority: 'Critical',
    status: 'Delayed',
    weightKg: 850,
    items: [{ name: 'Heavy Alternator CAT 3406', quantity: 1, unit: 'Units' }],
  },
  {
    _id: '67cda3000000000000000003',
    trackingNumber: 'CRG-2026-003',
    title: 'Deep Ice Core Samples Cryo-Shipper',
    category: 'Scientific',
    priority: 'High',
    status: 'Loading',
    weightKg: 320,
    items: [{ name: 'Cryogenic Specimen Containers (-80°C)', quantity: 4, unit: 'Vessels' }],
  },
  {
    _id: '67cda3000000000000000004',
    trackingNumber: 'CRG-2026-004',
    title: 'Cold-Lab Spares ATX-103',
    category: 'Equipment',
    priority: 'Low',
    status: 'Delivered',
    weightKg: 140,
    items: [{ name: 'Spares', quantity: 2, unit: 'Crates' }],
  },
];

let mockInventory = [
  {
    _id: '67cda4000000000000000001',
    name: 'Aviation Turbine Fuel (Jet A-1 Polar Grade)',
    sku: 'FUEL-JET-A1-01',
    category: 'Fuel',
    baseName: 'Maitri Station',
    quantity: 2400,
    unit: 'Liters',
    minThreshold: 5000,
    locationDetails: 'Bunker Tank Alpha-3',
    status: 'LowStock',
  },
  {
    _id: '67cda4000000000000000002',
    name: 'Arctic Heavy Diesel (Pour Point -45°C)',
    sku: 'FUEL-DSL-45-02',
    category: 'Fuel',
    baseName: 'Maitri Station',
    quantity: 18500,
    unit: 'Liters',
    minThreshold: 12000,
    locationDetails: 'Main Fuel Bladder 1',
    status: 'InStock',
  },
  {
    _id: '67cda4000000000000000003',
    name: 'Emergency Blood Plasma Units (O-Neg & AB+)',
    sku: 'MED-PLASMA-01',
    category: 'Medical',
    baseName: 'Bharati Station',
    quantity: 12,
    unit: 'Packs',
    minThreshold: 25,
    locationDetails: 'Infirmary Cryo-Vault',
    status: 'LowStock',
  },
  {
    _id: '67cda4000000000000000004',
    name: 'High-Calorie Polar Trekking MREs (4500 kcal)',
    sku: 'FOOD-MRE-01',
    category: 'Rations',
    baseName: 'Bharati Station',
    quantity: 1420,
    unit: 'Packs',
    minThreshold: 400,
    locationDetails: 'Food Store Modular Bay 4',
    status: 'InStock',
  },
];

let mockAssets = [
  {
    _id: '67cda5000000000000000001',
    assetTag: 'AST-VEH-01',
    name: 'PistenBully 300 Polar Snow Groomer',
    baseName: 'Bharati Station',
    category: 'Vehicle',
    model: 'Kässbohrer PB300 Polar',
    condition: 'Good',
    status: 'Operational',
    nextMaintenanceDate: '2026-05-15T00:00:00.000Z',
  },
  {
    _id: '67cda5000000000000000002',
    assetTag: 'AST-PWR-01',
    name: 'Main Station Prime Generator #1',
    baseName: 'Maitri Station',
    category: 'PowerGenerator',
    model: 'Caterpillar 3406 DITA',
    condition: 'Fair',
    status: 'Maintenance',
    nextMaintenanceDate: '2026-03-01T00:00:00.000Z',
  },
];

let mockPersonnel = [
  { _id: '67cda6000000000000000001', name: 'Dr. Rajesh Sharma', employeeId: 'POL-0101', role: 'Lead Glaciologist', department: 'Science', baseName: 'Bharati Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+91-9876543210', skills: ['Ice Core Sampling', 'Cryosphere Modeling'] },
  { _id: '67cda6000000000000000002', name: 'Dr. Maya Patel', employeeId: 'POL-0102', role: 'Chief Medical Officer', department: 'Medical', baseName: 'Bharati Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+91-9876543211', skills: ['Hypothermia Protocol', 'Tele-Surgery'] },
  { _id: '67cda6000000000000000003', name: 'Elena Rostova', employeeId: 'POL-0103', role: 'Logistics Flight Director', department: 'Logistics', baseName: 'Bharati Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+7-9123456789', skills: ['Air Delivery Drop', 'Cargo Manifest'] },
  { _id: '67cda6000000000000000004', name: 'Capt. Thomas Lindqvist', employeeId: 'POL-0106', role: 'Station Base Commander', department: 'Command', baseName: 'Maitri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+46-701234567', skills: ['Ice Navigation', 'Hazard Mitigation'] },
];

let mockTasks = [
  {
    _id: '67cda7000000000000000001',
    title: 'Emergency Generator Fuel Line Inspection',
    description: 'Check fuel lines for ice crystallization and verify heat trace tape is functioning on Generator #1.',
    priority: 'Critical',
    status: 'InProgress',
    dueDate: '2026-03-12T00:00:00.000Z',
    assignedToName: 'Vikram Sengupta',
  },
  {
    _id: '67cda7000000000000000002',
    title: 'Quarterly Inventory Audit - Medical Cryo Vault',
    description: 'Verify all plasma units, anti-venom, and antibiotics batches against digital manifests.',
    priority: 'High',
    status: 'Overdue',
    dueDate: '2026-03-09T00:00:00.000Z',
    assignedToName: 'Dr. Maya Patel',
  },
];

let mockIncidents = [
  {
    _id: '67cda8000000000000000001',
    incidentNumber: 'INC-2026-001',
    title: 'Catastrophic Gale & Generator #1 Overheat Alarm',
    description: 'Sudden wind gusts of 68 knots accompanied by ambient -44°C temp caused turbine icing and tripped secondary generator at Maitri Station.',
    type: 'Facility',
    severity: 'Critical',
    status: 'Active',
    baseName: 'Maitri Station',
    reporterName: 'Commander Sarah Jenkins',
    actions: [
      { description: 'Switched living quarters to Emergency Battery Array', performedBy: 'Capt. Thomas Lindqvist', timestamp: new Date(Date.now() - 40 * 60 * 1000) },
      { description: 'Isolated Auxiliary Diesel Unit #2 for manual bypass', performedBy: 'Vikram Sengupta', timestamp: new Date(Date.now() - 15 * 60 * 1000) },
    ],
  },
];

let mockAlerts = [
  {
    _id: '67cda9000000000000000001',
    title: 'CRITICAL: Severe Generator Fault at Maitri Station',
    message: 'Station Prime Generator #1 is in Maintenance mode during severe winter gale. Immediate auxiliary power check required.',
    type: 'Emergency',
    severity: 'Critical',
    module: 'Incidents',
    isRead: false,
    createdAt: new Date(),
  },
  {
    _id: '67cda9000000000000000002',
    title: 'LOW STOCK: Aviation Turbine Fuel below threshold',
    message: 'Maitri Station Jet A-1 Fuel is at 2,400L (Minimum threshold: 5,000L). Convoy CRG-2026-001 currently in transit.',
    type: 'LowStock',
    severity: 'High',
    module: 'Inventory',
    isRead: false,
    createdAt: new Date(),
  },
  {
    _id: '67cda9000000000000000003',
    title: 'DELAYED: Cargo CRG-2026-002 Grounded',
    message: 'Replacement Generator Crankshaft cargo grounded at Cape Darnley due to 65-knot gale winds.',
    type: 'CargoDelay',
    severity: 'High',
    module: 'Cargo',
    isRead: false,
    createdAt: new Date(),
  },
  {
    _id: '67cda9000000000000000004',
    title: 'WEATHER ALERT: Blizzard Cat 3 approaching Larsemann Hills',
    message: 'Extreme wind (74 kt gusts) causing whiteout conditions. LARSEM-2026 expedition sheltered in place.',
    type: 'Weather',
    severity: 'Critical',
    module: 'Expeditions',
    isRead: false,
    createdAt: new Date(),
  },
];

const initMockDataFromCSV = async () => {
  return new Promise((resolve, reject) => {
    const csvPath = path.resolve(__dirname, '../../../../polaris_cargo_delay.csv');
    if (!fs.existsSync(csvPath)) {
      console.log('[Sync] CSV not found, using static mock data.');
      return resolve();
    }
    
    // Clear out some existing mock arrays
    mockExpeditions.length = 0;
    mockCargo.length = 0;
    mockAlerts.length = 0;
    mockIncidents.length = 0;
    
    let lineCount = 0;
    const rl = readline.createInterface({
      input: fs.createReadStream(csvPath),
      crlfDelay: Infinity
    });
    
    rl.on('line', (line) => {
      lineCount++;
      if (lineCount === 1) return; // skip header
      if (lineCount > 500) return; // Only parse top 500 to keep it manageable in memory for mocks
      
      const parts = line.split(',');
      if (parts.length < 15) return;
      
      // date,shipping_mode,order_region,market,category,quantity,sales,scheduled_days,max_temp_c,min_temp_c,precip_mm,ice_extent,weather_severity,ice_severity,delayed
      const [date, shippingMode, orderRegion, market, category, quantity, sales, scheduledDays, maxTemp, minTemp, precip, iceExtent, weatherSev, iceSev, delayed] = parts;
      
      const isDelayed = delayed === '1';
      const riskLevel = weatherSev === 'High' || iceSev === 'High' ? 'Critical' : weatherSev === 'Medium' ? 'Moderate' : 'Low';
      const readiness = isDelayed ? Math.floor(Math.random() * 40 + 20) : Math.floor(Math.random() * 20 + 80);
      
      // Expeditions
      if (lineCount % 15 === 0) {
        mockExpeditions.push({
          _id: '67cda200000' + lineCount.toString().padStart(13, '0'),
          code: `${orderRegion.substring(0,3).toUpperCase()}-${lineCount}`,
          name: `${market} ${category} Survey`,
          baseName: lineCount % 2 === 0 ? 'Maitri Station' : 'Bharati Station',
          status: isDelayed ? 'Active' : 'Completed',
          startDate: new Date(date),
          endDate: new Date(new Date(date).getTime() + parseInt(scheduledDays) * 86400000),
          readinessScore: readiness,
          riskLevel: riskLevel,
          objectives: [`Survey ${category} impact in ${orderRegion}`],
          milestones: [{ title: 'Deployment', dueDate: date, status: 'Completed' }],
          budget: { allocated: parseInt(sales) * 10, spent: parseInt(sales) * 5 },
          personnel: [{},{},{},{}], // Add some dummy personnel
          progress: isDelayed ? Math.floor(Math.random() * 40) : 100
        });
      }
      
      // Cargo
      if (lineCount % 10 === 0) {
        mockCargo.push({
          _id: '67cda300000' + lineCount.toString().padStart(13, '0'),
          trackingNumber: `CRG-2026-${lineCount}`,
          title: `${category} Resupply - ${orderRegion}`,
          category: category,
          priority: riskLevel === 'Critical' ? 'Urgent' : 'High',
          status: isDelayed ? 'Delayed' : 'InTransit',
          weightKg: parseInt(quantity) * 100,
          items: [{ name: category + ' Crate', quantity: parseInt(quantity), unit: 'Crates' }],
          shippingMode: shippingMode
        });
      }
      
      // Alerts
      if (isDelayed && riskLevel === 'Critical') {
        mockAlerts.push({
          _id: '67cda900000' + lineCount.toString().padStart(13, '0'),
          title: `${weatherSev} Weather Alert in ${orderRegion}`,
          message: `Severe conditions reported: Max Temp ${maxTemp}°C, ${precip}mm precip. ${category} cargo delayed.`,
          type: 'Weather',
          severity: 'Critical',
          module: 'Expeditions',
          isRead: false,
          createdAt: new Date(date),
        });
      }
      
    });
    
    rl.on('close', () => {
      console.log(`[Sync] Demo data synchronized from CSV. Loaded ${mockExpeditions.length} expeditions, ${mockCargo.length} cargo items, ${mockAlerts.length} alerts.`);
      resolve();
    });
  });
};

module.exports = {
  mockBases,
  mockUsers,
  mockExpeditions,
  mockCargo,
  mockInventory,
  mockAssets,
  mockPersonnel,
  mockTasks,
  mockIncidents,
  mockAlerts,
  initMockDataFromCSV
};
