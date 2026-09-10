const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MONGO_URI } = require('../config/env');

const User = require('../models/User');
const Base = require('../models/Base');
const Personnel = require('../models/Personnel');
const Expedition = require('../models/Expedition');
const Cargo = require('../models/Cargo');
const Inventory = require('../models/Inventory');
const Asset = require('../models/Asset');
const Task = require('../models/Task');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const ActivityLog = require('../models/ActivityLog');
const MovementLog = require('../models/MovementLog');
const MaintenanceRecord = require('../models/MaintenanceRecord');

const seedData = async () => {
  try {
    console.log(`[POLARIS SEED] Connecting to MongoDB (${MONGO_URI})...`);
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('[POLARIS SEED] Connected. Cleaning existing database...');

    await Promise.all([
      User.deleteMany({}),
      Base.deleteMany({}),
      Personnel.deleteMany({}),
      Expedition.deleteMany({}),
      Cargo.deleteMany({}),
      Inventory.deleteMany({}),
      Asset.deleteMany({}),
      Task.deleteMany({}),
      Incident.deleteMany({}),
      Alert.deleteMany({}),
      ActivityLog.deleteMany({}),
      MovementLog.deleteMany({}),
      MaintenanceRecord.deleteMany({}),
    ]);

    console.log('[POLARIS SEED] Seeding Bases...');
    const bases = await Base.create([
      {
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
    ]);

    const bMaitri = bases[0];
    const bBharati = bases[1];
    const bHimadri = bases[2];
    const bVessel = bases[3];

    console.log('[POLARIS SEED] Seeding Users with hashed passwords...');
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('Polaris@2026', salt);

    const users = await User.create([
      {
        name: 'Commander Sarah Jenkins',
        email: 'admin@polaris.aq',
        password: defaultPassword,
        role: 'SuperAdmin',
        baseId: bBharati._id,
        isActive: true,
      },
      {
        name: 'Dr. Rajesh Sharma',
        email: 'expeditions@polaris.aq',
        password: defaultPassword,
        role: 'ExpeditionManager',
        baseId: bMaitri._id,
        isActive: true,
      },
      {
        name: 'Elena Rostova',
        email: 'logistics@polaris.aq',
        password: defaultPassword,
        role: 'LogisticsCoordinator',
        baseId: bBharati._id,
        isActive: true,
      },
      {
        name: 'Marcus Vance',
        email: 'inventory@polaris.aq',
        password: defaultPassword,
        role: 'InventoryManager',
        baseId: bMaitri._id,
        isActive: true,
      },
      {
        name: 'Capt. Thomas Lindqvist',
        email: 'base.maitri@polaris.aq',
        password: defaultPassword,
        role: 'BaseOfficer',
        baseId: bMaitri._id,
        isActive: true,
      },
      {
        name: 'Dr. Maya Patel',
        email: 'medical@polaris.aq',
        password: defaultPassword,
        role: 'MedicalOfficer',
        baseId: bBharati._id,
        isActive: true,
      },
      {
        name: 'Sofia Al-Mansoor',
        email: 'personnel@polaris.aq',
        password: defaultPassword,
        role: 'PersonnelManager',
        baseId: bBharati._id,
        isActive: true,
      },
      {
        name: 'General Staff Observer',
        email: 'viewer@polaris.aq',
        password: defaultPassword,
        role: 'Viewer',
        baseId: bHimadri._id,
        isActive: true,
      },
    ]);

    const uAdmin = users[0];
    const uExpMgr = users[1];

    console.log('[POLARIS SEED] Seeding Personnel...');
    const personnelList = await Personnel.create([
      { name: 'Dr. Rajesh Sharma', employeeId: 'POL-0101', role: 'Lead Glaciologist', department: 'Science', base: bBharati._id, baseName: 'Bharati Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+91-9876543210', skills: ['Ice Core Sampling', 'Cryosphere Modeling'] },
      { name: 'Dr. Maya Patel', employeeId: 'POL-0102', role: 'Chief Medical Officer', department: 'Medical', base: bBharati._id, baseName: 'Bharati Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+91-9876543211', skills: ['Hypothermia Protocol', 'Tele-Surgery'] },
      { name: 'Elena Rostova', employeeId: 'POL-0103', role: 'Logistics Flight Director', department: 'Logistics', base: bBharati._id, baseName: 'Bharati Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+7-9123456789', skills: ['Air Delivery Drop', 'Cargo Manifest'] },
      { name: 'Vikram Sengupta', employeeId: 'POL-0104', role: 'Chief Electrical Engineer', department: 'Operations', base: bBharati._id, baseName: 'Bharati Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+91-9876543212', skills: ['Turbine Overhaul', 'Microgrid'] },
      { name: 'Dr. Aris Thorne', employeeId: 'POL-0105', role: 'Atmospheric Physicist', department: 'Science', base: bBharati._id, baseName: 'Bharati Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+44-7700900123', skills: ['LIDAR Sensing', 'Ozone Profiling'] },
      { name: 'Capt. Thomas Lindqvist', employeeId: 'POL-0106', role: 'Station Base Commander', department: 'Command', base: bMaitri._id, baseName: 'Maitri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+46-701234567', skills: ['Ice Navigation', 'Hazard Mitigation'] },
      { name: 'Marcus Vance', employeeId: 'POL-0107', role: 'Quartermaster & Fuel Officer', department: 'Logistics', base: bMaitri._id, baseName: 'Maitri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+1-2025550144', skills: ['Fuel Cryo-storage', 'Inventory ERP'] },
      { name: 'Dr. Astrid Lindholm', employeeId: 'POL-0108', role: 'Geomagnetician', department: 'Science', base: bMaitri._id, baseName: 'Maitri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+47-98765432', skills: ['Magnetometry', 'Aurora Telemetry'] },
      { name: 'Dmitri Voronov', employeeId: 'POL-0109', role: 'Heavy Machinery Tech', department: 'Operations', base: bMaitri._id, baseName: 'Maitri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+7-9876543210', skills: ['PistenBully Repair', 'Hydraulics'] },
      { name: 'Sanjay Deshmukh', employeeId: 'POL-0110', role: 'Communications Specialist', department: 'Operations', base: bMaitri._id, baseName: 'Maitri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+91-9876543213', skills: ['SATCOM', 'HF Long Range Radio'] },
      { name: 'Dr. Ingrid Hansen', employeeId: 'POL-0111', role: 'Arctic Marine Biologist', department: 'Science', base: bHimadri._id, baseName: 'Himadri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+47-12345678', skills: ['Plankton Trawling', 'DNA Barcoding'] },
      { name: 'Lars Olofsson', employeeId: 'POL-0112', role: 'Field Safety Officer', department: 'Operations', base: bHimadri._id, baseName: 'Himadri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+47-23456789', skills: ['Polar Bear Defense', 'Glacier Rescue'] },
      { name: 'Priya Nambiar', employeeId: 'POL-0113', role: 'Aerosol Scientist', department: 'Science', base: bHimadri._id, baseName: 'Himadri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+91-9876543214', skills: ['Spectrophotometry', 'Black Carbon'] },
      { name: 'Capt. Robert Falcon', employeeId: 'POL-0114', role: 'Master Navigator', department: 'Command', base: bVessel._id, baseName: 'RV Bharati', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+44-7700900456', skills: ['Icebreaker Pilotage', 'Sonar Bathymetry'] },
      { name: 'Dr. Chloe Dubois', employeeId: 'POL-0115', role: 'Oceanographer', department: 'Science', base: bVessel._id, baseName: 'RV Bharati', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+33-612345678', skills: ['CTD Rosette', 'Ocean Currents'] },
      { name: 'Tenzing Sherpa', employeeId: 'POL-0116', role: 'Crevasse Rescue Specialist', department: 'Operations', base: bBharati._id, baseName: 'Bharati Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+977-980123456', skills: ['Alpine Mountaineering', 'Deep Rigging'] },
      { name: 'Dr. Alexei Mikhailov', employeeId: 'POL-0117', role: 'Seismologist', department: 'Science', base: bMaitri._id, baseName: 'Maitri Station', status: 'Leave', medicalClearance: 'Cleared', emergencyContact: '+7-9876543211', skills: ['Broadband Seismometer', 'Inversion'] },
      { name: 'Ananya Roy', employeeId: 'POL-0118', role: 'Field Paramedic', department: 'Medical', base: bMaitri._id, baseName: 'Maitri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+91-9876543215', skills: ['Frostbite Debridement', 'Emergency Triage'] },
      { name: 'Klaus Mueller', employeeId: 'POL-0119', role: 'Instrumentation Engineer', department: 'Operations', base: bHimadri._id, baseName: 'Himadri Station', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+49-151234567', skills: ['PLC Automation', 'Cold Sensors'] },
      { name: 'Sunil Gavaskar', employeeId: 'POL-0120', role: 'Vessel Chief Mate', department: 'Operations', base: bVessel._id, baseName: 'RV Bharati', status: 'Active', medicalClearance: 'Cleared', emergencyContact: '+91-9876543216', skills: ['Deck Cranes', 'Sea Ice Mooring'] },
    ]);

    console.log('[POLARIS SEED] Seeding Expeditions...');
    const expeditions = await Expedition.create([
      {
        code: 'INAE-44',
        name: '44th Indian Antarctic Expedition',
        base: bBharati._id,
        baseName: 'Bharati Station',
        leadScientist: personnelList[0]._id,
        status: 'Active',
        startDate: new Date('2025-11-15'),
        endDate: new Date('2026-12-20'),
        readinessScore: 87,
        objectives: ['Drill 120m ice core at Amery Ice Shelf', 'Upgrade Bharati wind turbine farm', 'Map penguin colonies with UAV'],
        budget: { allocated: 4500000, spent: 2850000 },
        riskLevel: 'Moderate',
        milestones: [
          { title: 'Base Camp Setup', dueDate: new Date('2025-12-01'), status: 'Completed' },
          { title: 'Traverse to Amery Ridge', dueDate: new Date('2026-02-15'), status: 'Completed' },
          { title: 'Subglacial Ice Core Extraction', dueDate: new Date('2026-05-30'), status: 'InProgress' },
          { title: 'Final Specimen Extraction & Return', dueDate: new Date('2026-11-15'), status: 'Pending' },
        ],
      },
      {
        code: 'INAE-45',
        name: '45th Wintering Research Mission',
        base: bMaitri._id,
        baseName: 'Maitri Station',
        leadScientist: personnelList[5]._id,
        status: 'Active',
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-12-31'),
        readinessScore: 62,
        objectives: ['Sustain wintering team of 25 personnel', 'Maintain ozone observation Dobson spectrophotometer', 'Inspect Priyadarshini water lake quality'],
        budget: { allocated: 3800000, spent: 1900000 },
        riskLevel: 'High',
        milestones: [
          { title: 'Priyadarshini Lake Pipeline Heat-Tracing', dueDate: new Date('2026-02-01'), status: 'Completed' },
          { title: 'Fuel Delivery Convoy from Coast', dueDate: new Date('2026-03-05'), status: 'Pending' },
          { title: 'Mid-Winter Solstice Scientific Review', dueDate: new Date('2026-06-21'), status: 'Pending' },
        ],
      },
      {
        code: 'ARCTIC-2026',
        name: 'Ny-Ålesund Spring Atmospheric Survey',
        base: bHimadri._id,
        baseName: 'Himadri Station',
        leadScientist: personnelList[10]._id,
        status: 'Planning',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-09-30'),
        readinessScore: 45,
        objectives: ['Deploy multi-wavelength micro-pulse lidar', 'Quantify organic aerosols during snow melt'],
        budget: { allocated: 1200000, spent: 180000 },
        riskLevel: 'Low',
        milestones: [
          { title: 'Sensor Bench Calibration in Tromsø', dueDate: new Date('2026-03-20'), status: 'InProgress' },
          { title: 'Air Freight to Longyearbyen', dueDate: new Date('2026-04-05'), status: 'Pending' },
        ],
      },
      {
        code: 'SO-DEEP-2026',
        name: 'Southern Ocean Hydrographic & Krill Transect',
        base: bVessel._id,
        baseName: 'RV Bharati',
        leadScientist: personnelList[14]._id,
        status: 'Active',
        startDate: new Date('2026-01-05'),
        endDate: new Date('2026-04-20'),
        readinessScore: 94,
        objectives: ['60 CTD hydrographic profiles across 60°S', 'Bio-acoustic krill biomass estimation'],
        budget: { allocated: 2600000, spent: 2100000 },
        riskLevel: 'Low',
        milestones: [
          { title: 'Cape Town Departure & Equipment Wet-Test', dueDate: new Date('2026-01-10'), status: 'Completed' },
          { title: 'Line 60°S Acoustic Scan Completed', dueDate: new Date('2026-02-28'), status: 'Completed' },
          { title: 'Deep Bottom Moorings Recovery', dueDate: new Date('2026-03-18'), status: 'InProgress' },
        ],
      },
      {
        code: 'INAE-43',
        name: '43rd Annual Scientific Campaign',
        base: bBharati._id,
        baseName: 'Bharati Station',
        leadScientist: personnelList[0]._id,
        status: 'Completed',
        startDate: new Date('2024-11-20'),
        endDate: new Date('2025-11-10'),
        readinessScore: 100,
        objectives: ['Solar geomagnetic storm recording', 'Coastal iceberg calving telemetry'],
        budget: { allocated: 4100000, spent: 4050000 },
        riskLevel: 'Low',
        milestones: [
          { title: 'Yearly Wrap-up & Mission Debrief', dueDate: new Date('2025-11-10'), status: 'Completed' },
        ],
      },
    ]);

    console.log('[POLARIS SEED] Seeding Inventory Items...');
    const inventoryItems = await Inventory.create([
      // Fuel & Energy (Maitri - intentional low stock to trigger demo alert!)
      { name: 'Aviation Turbine Fuel (Jet A-1 Polar Grade)', sku: 'FUEL-JET-A1-01', category: 'Fuel', base: bMaitri._id, baseName: 'Maitri Station', quantity: 2400, unit: 'Liters', minThreshold: 5000, unitCost: 4.8, locationDetails: 'Bunker Tank Alpha-3', status: 'LowStock' },
      { name: 'Arctic Heavy Diesel (Pour Point -45°C)', sku: 'FUEL-DSL-45-02', category: 'Fuel', base: bMaitri._id, baseName: 'Maitri Station', quantity: 18500, unit: 'Liters', minThreshold: 12000, unitCost: 3.2, locationDetails: 'Main Fuel Bladder 1', status: 'InStock' },
      { name: 'Liquid Nitrogen De-waxed Propane', sku: 'FUEL-LPG-CYL-03', category: 'Fuel', base: bBharati._id, baseName: 'Bharati Station', quantity: 82, unit: 'Cylinders', minThreshold: 20, unitCost: 180.0, locationDetails: 'External Cryo Rack B', status: 'InStock' },
      { name: 'Jet A-1 Polar Grade Fuel', sku: 'FUEL-JET-A1-04', category: 'Fuel', base: bBharati._id, baseName: 'Bharati Station', quantity: 28000, unit: 'Liters', minThreshold: 8000, unitCost: 4.8, locationDetails: 'Fuel Depot Delta', status: 'InStock' },
      
      // Medical & First Aid (Bharati & Maitri)
      { name: 'Emergency Blood Plasma Units (O-Neg & AB+)', sku: 'MED-PLASMA-01', category: 'Medical', base: bBharati._id, baseName: 'Bharati Station', quantity: 12, unit: 'Packs', minThreshold: 25, unitCost: 320.0, locationDetails: 'Infirmary Cryo-Vault', status: 'LowStock' },
      { name: 'EpiPen Auto-Injectors 0.3mg', sku: 'MED-EPI-02', category: 'Medical', base: bBharati._id, baseName: 'Bharati Station', quantity: 45, unit: 'Units', minThreshold: 15, unitCost: 110.0, locationDetails: 'First Response Cabinet A', status: 'InStock' },
      { name: 'Advanced Frostbite Debridement Kit', sku: 'MED-FRST-03', category: 'Medical', base: bMaitri._id, baseName: 'Maitri Station', quantity: 8, unit: 'Kits', minThreshold: 10, unitCost: 240.0, locationDetails: 'Trauma Bay 2', status: 'LowStock' },
      { name: 'Portable Automated External Defibrillator (AED)', sku: 'MED-AED-04', category: 'Medical', base: bHimadri._id, baseName: 'Himadri Station', quantity: 4, unit: 'Units', minThreshold: 2, unitCost: 1850.0, locationDetails: 'Station Commons Wall Mount', status: 'InStock' },

      // Food & Rations
      { name: 'High-Calorie Polar Trekking MREs (4500 kcal)', sku: 'FOOD-MRE-01', category: 'Rations', base: bBharati._id, baseName: 'Bharati Station', quantity: 1420, unit: 'Packs', minThreshold: 400, unitCost: 18.5, locationDetails: 'Food Store Modular Bay 4', status: 'InStock' },
      { name: 'Freeze-Dried Nutrient Protein Stews', sku: 'FOOD-FRZ-02', category: 'Rations', base: bMaitri._id, baseName: 'Maitri Station', quantity: 890, unit: 'Cans', minThreshold: 300, unitCost: 24.0, locationDetails: 'Pantry B Block', status: 'InStock' },
      { name: 'Emergency Lifeboat Ration Biscuits', sku: 'FOOD-LFT-03', category: 'Rations', base: bVessel._id, baseName: 'RV Bharati', quantity: 340, unit: 'Boxes', minThreshold: 100, unitCost: 12.0, locationDetails: 'Muster Station Lockers', status: 'InStock' },

      // Vehicle Parts & Equipment
      { name: 'PistenBully 300 Rubber Track Cleats', sku: 'PART-PST-TRK-01', category: 'SpareParts', base: bBharati._id, baseName: 'Bharati Station', quantity: 16, unit: 'Units', minThreshold: 8, unitCost: 650.0, locationDetails: 'Workshop Hangar Shelf G', status: 'InStock' },
      { name: 'Snowmobile Drive Belts Kevlar-Reinforced', sku: 'PART-SNW-BLT-02', category: 'SpareParts', base: bMaitri._id, baseName: 'Maitri Station', quantity: 3, unit: 'Units', minThreshold: 10, unitCost: 145.0, locationDetails: 'Garage Bin 14', status: 'LowStock' },
      { name: 'Heavy Alternator 24V 150A for Cat Diesel', sku: 'PART-ALT-CAT-03', category: 'SpareParts', base: bBharati._id, baseName: 'Bharati Station', quantity: 4, unit: 'Units', minThreshold: 2, unitCost: 1100.0, locationDetails: 'Powerhouse Reserve Stacks', status: 'InStock' },

      // Extreme Weather Apparel
      { name: 'Polar Extreme Goose Down Parkas (-60°C)', sku: 'GEAR-PARKA-01', category: 'Equipment', base: bBharati._id, baseName: 'Bharati Station', quantity: 42, unit: 'Pieces', minThreshold: 15, unitCost: 850.0, locationDetails: 'Locker Wing East', status: 'InStock' },
      { name: 'Battery-Heated Glacier Boots (Size 42-45)', sku: 'GEAR-BOOTS-02', category: 'Equipment', base: bMaitri._id, baseName: 'Maitri Station', quantity: 18, unit: 'Pairs', minThreshold: 10, unitCost: 420.0, locationDetails: 'Equipment Room 3', status: 'InStock' },
      { name: 'VHF Heavy Duty Handheld Radios (Sub-zero rated)', sku: 'GEAR-VHF-03', category: 'Equipment', base: bHimadri._id, baseName: 'Himadri Station', quantity: 14, unit: 'Units', minThreshold: 5, unitCost: 310.0, locationDetails: 'Comms Rack A', status: 'InStock' },
    ]);

    console.log('[POLARIS SEED] Seeding Assets...');
    const assets = await Asset.create([
      {
        name: 'PistenBully 300 Polar Snow Groomer',
        assetTag: 'AST-VEH-01',
        category: 'Vehicle',
        base: bBharati._id,
        baseName: 'Bharati Station',
        model: 'Kässbohrer PB300 Polar',
        serialNumber: 'PB-2023-88741',
        status: 'Operational',
        condition: 'Good',
        nextMaintenanceDate: new Date('2026-05-15'),
        maintenanceIntervalDays: 90,
        specifications: { engine: 'Cummins QSC 8.3L', horsePower: '330 hp', tracks: 'All-steel climbing tracks' },
      },
      {
        name: 'Main Station Prime Generator #1',
        assetTag: 'AST-PWR-01',
        category: 'PowerGenerator',
        base: bMaitri._id,
        baseName: 'Maitri Station',
        model: 'Caterpillar 3406 DITA',
        serialNumber: 'CAT-3406-9921',
        status: 'Maintenance',
        condition: 'Fair',
        nextMaintenanceDate: new Date('2026-03-01'), // Past due! Demo maintenance trigger
        maintenanceIntervalDays: 30,
        specifications: { output: '250 kVA', fuelType: 'Arctic Diesel', runHours: 14200 },
      },
      {
        name: 'Hägglunds Bv206 All-Terrain Tracked Carrier',
        assetTag: 'AST-VEH-02',
        category: 'Vehicle',
        base: bMaitri._id,
        baseName: 'Maitri Station',
        model: 'BAE Systems Bv206',
        serialNumber: 'BV-982-1044',
        status: 'Operational',
        condition: 'Good',
        nextMaintenanceDate: new Date('2026-06-10'),
        maintenanceIntervalDays: 120,
        specifications: { capacity: '17 passengers or 2250 kg', amphibious: 'Yes' },
      },
      {
        name: 'Tropospheric LIDAR Profiler System',
        assetTag: 'AST-SCI-01',
        category: 'Scientific',
        base: bBharati._id,
        baseName: 'Bharati Station',
        model: 'Leosphere Windcube 200S',
        serialNumber: 'LIDAR-882-FR',
        status: 'Operational',
        condition: 'Excellent',
        nextMaintenanceDate: new Date('2026-08-01'),
        maintenanceIntervalDays: 180,
        specifications: { wavelength: '1543 nm', pulseRate: '20 kHz', range: '10 km' },
      },
      {
        name: 'Skidoo Expedition Extreme 850 E-TEC',
        assetTag: 'AST-VEH-03',
        category: 'Vehicle',
        base: bHimadri._id,
        baseName: 'Himadri Station',
        model: 'BRP Skidoo 850',
        serialNumber: 'BRP-SKI-2024-09',
        status: 'Operational',
        condition: 'Good',
        nextMaintenanceDate: new Date('2026-04-12'),
        maintenanceIntervalDays: 60,
        specifications: { displacement: '849 cc', topSpeed: '115 km/h' },
      },
      {
        name: 'Inmarsat Global Xpress SATCOM Radome',
        assetTag: 'AST-COM-01',
        category: 'Communication',
        base: bBharati._id,
        baseName: 'Bharati Station',
        model: 'Cobham Sailor 900 GX',
        serialNumber: 'CB-900GX-44',
        status: 'Operational',
        condition: 'Excellent',
        nextMaintenanceDate: new Date('2026-09-01'),
        maintenanceIntervalDays: 365,
        specifications: { band: 'Ka-band', reflectorDiameter: '1.03 m', heatedRadome: 'True' },
      },
      {
        name: 'Marine Multibeam Echo Sounder',
        assetTag: 'AST-NAV-01',
        category: 'Scientific',
        base: bVessel._id,
        baseName: 'RV Bharati',
        model: 'Kongsberg EM 122',
        serialNumber: 'KNG-EM122-11',
        status: 'Operational',
        condition: 'Good',
        nextMaintenanceDate: new Date('2026-07-20'),
        maintenanceIntervalDays: 180,
        specifications: { depthRange: 'Full ocean (11000m)', beamWidth: '1x1 degree' },
      },
      {
        name: 'Snowmobile Bombardier Tundra 550',
        assetTag: 'AST-VEH-04',
        category: 'Vehicle',
        base: bMaitri._id,
        baseName: 'Maitri Station',
        model: 'Bombardier 550F',
        serialNumber: 'BRP-550-9901',
        status: 'Decommissioned',
        condition: 'Poor',
        nextMaintenanceDate: new Date('2026-01-01'),
        maintenanceIntervalDays: 30,
        specifications: { engine: 'Rotax 550', notes: 'Stripped for spare parts' },
      },
    ]);

    console.log('[POLARIS SEED] Seeding Cargo...');
    const cargos = await Cargo.create([
      {
        trackingNumber: 'CRG-2026-001',
        title: 'Emergency Fuel Bladder Resupply (Jet A-1)',
        originBase: bBharati._id,
        destinationBase: bMaitri._id,
        currentBase: bBharati._id,
        currentCoordinates: { lat: -70.1, lng: 42.5 },
        status: 'InTransit',
        priority: 'Urgent',
        category: 'Fuel',
        weightKg: 4200,
        volumeM3: 6.5,
        items: [
          { name: 'Jet A-1 Fuel Drum', quantity: 20, unit: 'Drums', inventoryItemId: inventoryItems[0]._id },
        ],
        timeline: [
          { status: 'Draft', timestamp: new Date('2026-03-01T08:00:00Z'), note: 'Manifest created by Logistics' },
          { status: 'Loading', timestamp: new Date('2026-03-02T10:30:00Z'), note: 'Loaded onto polar convoy' },
          { status: 'InTransit', timestamp: new Date('2026-03-03T06:00:00Z'), note: 'Convoy departed Bharati waypoint Alpha' },
        ],
      },
      {
        trackingNumber: 'CRG-2026-002',
        title: 'Replacement Caterpillar Generator Crankshaft',
        originBase: bVessel._id,
        destinationBase: bMaitri._id,
        currentBase: bVessel._id,
        currentCoordinates: { lat: -67.5, lng: 30.2 },
        status: 'Delayed', // Intentional demo scenario
        priority: 'Critical',
        category: 'Equipment',
        weightKg: 850,
        volumeM3: 1.8,
        items: [
          { name: 'Heavy Alternator CAT 3406', quantity: 1, unit: 'Units' },
          { name: 'High-tensile Gasket Set', quantity: 5, unit: 'Sets' },
        ],
        timeline: [
          { status: 'Draft', timestamp: new Date('2026-02-25T08:00:00Z'), note: 'Manifest approved' },
          { status: 'InTransit', timestamp: new Date('2026-02-28T12:00:00Z'), note: 'Departed via helicopter sling load' },
          { status: 'Delayed', timestamp: new Date('2026-03-04T15:00:00Z'), note: 'Blizzard gale winds (65 knots) forced pilot grounding at Cape Darnley' },
        ],
      },
      {
        trackingNumber: 'CRG-2026-003',
        title: 'Deep Ice Core Samples Cryo-Shipper',
        originBase: bBharati._id,
        destinationBase: bVessel._id,
        currentBase: bBharati._id,
        currentCoordinates: { lat: -69.407, lng: 76.191 },
        status: 'Loading',
        priority: 'High',
        category: 'Scientific',
        weightKg: 320,
        volumeM3: 2.1,
        items: [
          { name: 'Cryogenic Specimen Containers (-80°C)', quantity: 4, unit: 'Vessels' },
        ],
        timeline: [
          { status: 'Draft', timestamp: new Date('2026-03-05T09:00:00Z'), note: 'Prepared by Dr. Sharma' },
          { status: 'Loading', timestamp: new Date('2026-03-07T11:00:00Z'), note: 'Cryo-temperature verified at -82.4°C' },
        ],
      },
      {
        trackingNumber: 'CRG-2026-004',
        title: 'Winter Fresh Food & High-Calorie Rations',
        originBase: bVessel._id,
        destinationBase: bBharati._id,
        currentBase: bBharati._id,
        currentCoordinates: { lat: -69.407, lng: 76.191 },
        status: 'Delivered',
        priority: 'Standard',
        category: 'Food',
        weightKg: 2800,
        volumeM3: 5.2,
        items: [
          { name: 'Fresh Apples & Oranges (Insulated)', quantity: 50, unit: 'Crates' },
          { name: 'Frozen Dairy & Meats', quantity: 80, unit: 'Boxes' },
        ],
        timeline: [
          { status: 'Draft', timestamp: new Date('2026-02-10T08:00:00Z'), note: 'Order loaded in Cape Town' },
          { status: 'InTransit', timestamp: new Date('2026-02-15T14:00:00Z'), note: 'Shipment at sea' },
          { status: 'Arrived', timestamp: new Date('2026-02-28T09:00:00Z'), note: 'Offloaded at Bharati ice pier' },
          { status: 'Delivered', timestamp: new Date('2026-03-01T17:00:00Z'), note: 'Received and stocked in Main Pantry' },
        ],
      },
      {
        trackingNumber: 'CRG-2026-005',
        title: 'Himadri Spring Lidar Hardware Upgrade',
        originBase: bHimadri._id,
        destinationBase: bHimadri._id,
        currentBase: bHimadri._id,
        currentCoordinates: { lat: 78.924, lng: 11.928 },
        status: 'Arrived',
        priority: 'Standard',
        category: 'Scientific',
        weightKg: 140,
        volumeM3: 0.9,
        items: [
          { name: 'Optical Collimator Mirror Kit', quantity: 2, unit: 'Kits' },
        ],
        timeline: [
          { status: 'Draft', timestamp: new Date('2026-03-02T10:00:00Z'), note: 'Air freight arrived from Tromsø' },
          { status: 'Arrived', timestamp: new Date('2026-03-06T13:00:00Z'), note: 'Cleared customs at Longyearbyen' },
        ],
      },
    ]);

    console.log('[POLARIS SEED] Seeding Tasks...');
    const tasks = await Task.create([
      {
        title: 'Emergency Generator Fuel Line Inspection',
        description: 'Check fuel lines for ice crystallization and verify heat trace tape is functioning on Generator #1.',
        assignedTo: personnelList[3]._id,
        assignedToName: personnelList[3].name,
        base: bMaitri._id,
        priority: 'Critical',
        status: 'InProgress',
        dueDate: new Date(Date.now() + 2 * 3600 * 1000), // Due in 2 hours
        comments: [{ author: 'Commander Sarah Jenkins', message: 'Priority 1 due to incoming cold front (-48°C)' }],
      },
      {
        title: 'Quarterly Inventory Audit - Medical Cryo Vault',
        description: 'Verify all plasma units, anti-venom, and antibiotics batches against digital manifests.',
        assignedTo: personnelList[1]._id,
        assignedToName: personnelList[1].name,
        base: bBharati._id,
        priority: 'High',
        status: 'Overdue', // Intentional demo overdue task
        dueDate: new Date(Date.now() - 24 * 3600 * 1000), // Due yesterday
        comments: [{ author: 'Dr. Maya Patel', message: 'Delayed due to emergency patient observation' }],
      },
      {
        title: 'PistenBully Hydraulic Fluid Bleed & Replenishment',
        description: 'Bleed hydraulic system on PB300 and replenish with Arctic grade hydraulic oil.',
        assignedTo: personnelList[8]._id,
        assignedToName: personnelList[8].name,
        base: bMaitri._id,
        priority: 'Medium',
        status: 'Todo',
        dueDate: new Date(Date.now() + 48 * 3600 * 1000),
      },
      {
        title: 'Calibrate Broadband Seismograph Network',
        description: 'Perform frequency response curve calibration across all 4 remote field stations.',
        assignedTo: personnelList[16]._id,
        assignedToName: personnelList[16].name,
        expedition: expeditions[0]._id,
        base: bBharati._id,
        priority: 'Low',
        status: 'Completed',
        dueDate: new Date(Date.now() - 72 * 3600 * 1000),
      },
      {
        title: 'Ny-Ålesund Weather Radar Dome De-icing',
        description: 'Clear packed rime ice from upper dome flange using thermal heaters.',
        assignedTo: personnelList[11]._id,
        assignedToName: personnelList[11].name,
        base: bHimadri._id,
        priority: 'High',
        status: 'InProgress',
        dueDate: new Date(Date.now() + 6 * 3600 * 1000),
      },
    ]);

    console.log('[POLARIS SEED] Seeding Incidents (including active Critical emergency)...');
    const incidents = await Incident.create([
      {
        incidentNumber: 'INC-2026-001',
        title: 'Catastrophic Gale & Generator #1 Overheat Alarm',
        description: 'Sudden wind gusts of 68 knots accompanied by ambient -44°C temp caused turbine icing and tripped secondary generator at Maitri Station.',
        type: 'Facility',
        severity: 'Critical', // Critical active emergency
        status: 'Active',
        base: bMaitri._id,
        baseName: 'Maitri Station',
        reportedBy: uAdmin._id,
        reporterName: uAdmin.name,
        assignedTo: personnelList[5]._id,
        actions: [
          { description: 'Switched living quarters to Emergency Battery Array', performedBy: 'Capt. Thomas Lindqvist', timestamp: new Date(Date.now() - 40 * 60 * 1000) },
          { description: 'Isolated Auxiliary Diesel Unit #2 for manual bypass', performedBy: 'Vikram Sengupta', timestamp: new Date(Date.now() - 15 * 60 * 1000) },
        ],
      },
      {
        incidentNumber: 'INC-2026-002',
        title: 'Crevasse Proximity Alert during Ice Core Traverse',
        description: 'Ground penetrating radar on PistenBully detected concealed 8-meter crevasse 35 meters ahead of convoy track.',
        type: 'Environmental',
        severity: 'High',
        status: 'Investigating',
        base: bBharati._id,
        baseName: 'Bharati Station',
        reportedBy: personnelList[0]._id,
        reporterName: personnelList[0].name,
        assignedTo: personnelList[15]._id,
        actions: [
          { description: 'All vehicles ordered to full stop; safety line deployed', performedBy: 'Tenzing Sherpa', timestamp: new Date(Date.now() - 3 * 3600 * 1000) },
          { description: 'GPS detour mapped 250m north over verified blue ice', performedBy: 'Dr. Rajesh Sharma', timestamp: new Date(Date.now() - 1 * 3600 * 1000) },
        ],
      },
      {
        incidentNumber: 'INC-2026-003',
        title: 'Severe Hypothermia Stage 2 - Field Researcher',
        description: 'Researcher experienced immersion foot and shivering while retrieving sea ice core at -38°C.',
        type: 'Medical',
        severity: 'Moderate',
        status: 'Resolved',
        base: bHimadri._id,
        baseName: 'Himadri Station',
        reportedBy: personnelList[11]._id,
        reporterName: personnelList[11].name,
        resolvedAt: new Date(Date.now() - 12 * 3600 * 1000),
        actions: [
          { description: 'Patient rewarmed in Arctic Medical Bay; core body temp restored to 37.1°C', performedBy: 'Dr. Maya Patel', timestamp: new Date(Date.now() - 14 * 3600 * 1000) },
        ],
      },
    ]);

    console.log('[POLARIS SEED] Seeding Alerts...');
    const alerts = await Alert.create([
      {
        title: 'CRITICAL: Severe Generator Fault at Maitri Station',
        message: 'Station Prime Generator #1 is in Maintenance mode during severe winter gale. Immediate auxiliary power check required.',
        type: 'Emergency',
        severity: 'Critical',
        module: 'Incidents',
        entityId: incidents[0]._id,
        isRead: false,
        targetRoles: ['SuperAdmin', 'BaseOfficer', 'ExpeditionManager'],
        baseId: bMaitri._id,
      },
      {
        title: 'LOW STOCK: Aviation Turbine Fuel below threshold',
        message: 'Maitri Station Jet A-1 Fuel is at 2,400L (Minimum threshold: 5,000L). Convoy CRG-2026-001 currently in transit.',
        type: 'LowStock',
        severity: 'High',
        module: 'Inventory',
        entityId: inventoryItems[0]._id,
        isRead: false,
        targetRoles: ['SuperAdmin', 'LogisticsCoordinator', 'InventoryManager', 'BaseOfficer'],
        baseId: bMaitri._id,
      },
      {
        title: 'DELAYED: Cargo CRG-2026-002 Grounded',
        message: 'Replacement Generator Crankshaft cargo grounded at Cape Darnley due to 65-knot gale winds.',
        type: 'CargoDelay',
        severity: 'High',
        module: 'Cargo',
        entityId: cargos[1]._id,
        isRead: false,
        targetRoles: ['SuperAdmin', 'LogisticsCoordinator', 'BaseOfficer'],
        baseId: bMaitri._id,
      },
      {
        title: 'TASK OVERDUE: Medical Cryo Vault Audit',
        message: 'Task assigned to Dr. Maya Patel is 24 hours overdue.',
        type: 'TaskOverdue',
        severity: 'Medium',
        module: 'Tasks',
        entityId: tasks[1]._id,
        isRead: false,
        targetRoles: ['SuperAdmin', 'ExpeditionManager', 'MedicalOfficer'],
        baseId: bBharati._id,
      },
      {
        title: 'MAINTENANCE DUE: Generator #1 Past Service Interval',
        message: 'Prime Generator #1 reached 30-day maintenance interval and is currently running on extension.',
        type: 'MaintenanceDue',
        severity: 'Medium',
        module: 'Assets',
        entityId: assets[1]._id,
        isRead: false,
        targetRoles: ['SuperAdmin', 'BaseOfficer', 'InventoryManager'],
        baseId: bMaitri._id,
      },
      {
        title: 'WEATHER: Category 2 Katabatic Wind Alert',
        message: 'Princess Astrid Coast katabatic wind forecast predicts sustained 55kt winds from southeast.',
        type: 'WeatherAlert',
        severity: 'Warning',
        module: 'Operations',
        isRead: true,
        targetRoles: ['SuperAdmin', 'ExpeditionManager', 'BaseOfficer'],
        baseId: bBharati._id,
      },
    ]);

    console.log('[POLARIS SEED] Seeding Activity Logs...');
    await ActivityLog.create([
      { actor: uAdmin._id, actorName: uAdmin.name, action: 'EMERGENCY_DECLARED', module: 'Incidents', entityId: incidents[0]._id, description: 'Declared Level 1 Critical Facility Emergency for Maitri Station' },
      { actor: uExpMgr._id, actorName: uExpMgr.name, action: 'EXPEDITION_UPDATED', module: 'Expeditions', entityId: expeditions[0]._id, description: 'Updated INAE-44 readiness score to 87%' },
      { actor: users[2]._id, actorName: users[2].name, action: 'CARGO_STATUS_CHANGED', module: 'Cargo', entityId: cargos[0]._id, description: 'Dispatched emergency fuel convoy CRG-2026-001 towards Maitri' },
      { actor: users[3]._id, actorName: users[3].name, action: 'STOCK_ALERT_TRIGGERED', module: 'Inventory', entityId: inventoryItems[0]._id, description: 'Automated alert triggered: Jet A-1 fuel stock dropped below 5,000L' },
    ]);

    console.log('[POLARIS SEED] Successfully seeded:');
    console.log(`- ${bases.length} Polar Bases`);
    console.log(`- ${users.length} Demo Users (SuperAdmin, ExpeditionManager, LogisticsCoordinator, etc.)`);
    console.log(`- ${personnelList.length} Personnel`);
    console.log(`- ${expeditions.length} Expeditions`);
    console.log(`- ${inventoryItems.length} Inventory Items`);
    console.log(`- ${assets.length} Polar Assets`);
    console.log(`- ${cargos.length} Cargo Items`);
    console.log(`- ${tasks.length} Tasks`);
    console.log(`- ${incidents.length} Incidents`);
    console.log(`- ${alerts.length} Alerts`);

    process.exit(0);
  } catch (error) {
    console.error(`\n[POLARIS SEED] MongoDB connection error: ${error.message}`);
    console.warn(`[POLARIS SEED] 💡 Could not connect to MongoDB at: ${MONGO_URI}`);
    console.warn(`[POLARIS SEED] 💡 If using MongoDB Atlas, set MONGO_URI in 'server/.env'`);
    console.warn(`[POLARIS SEED] 💡 If using local MongoDB, please ensure the MongoDB service is running (e.g. 'mongod' or 'net start MongoDB')\n`);
    process.exit(1);
  }
};

seedData();
