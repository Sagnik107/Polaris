const mongoose = require('mongoose');
const Expedition = require('../models/Expedition');
const Cargo = require('../models/Cargo');
const Inventory = require('../models/Inventory');
const Personnel = require('../models/Personnel');
const Incident = require('../models/Incident');
const Task = require('../models/Task');
const Base = require('../models/Base');

const {
  mockExpeditions,
  mockCargo,
  mockInventory,
  mockPersonnel,
  mockIncidents,
  mockTasks,
  mockBases,
} = require('../services/mockDataService');

const generateReport = async (req, res, next) => {
  try {
    const type = req.params.type || req.query.type || req.query.module || 'command-summary';
    const {
      format = 'json',
      startDate,
      endDate,
      base,
      expedition,
      status,
    } = req.query;

    const isConnected = mongoose.connection.readyState === 1;

    // ─────────────────────────────────────────────────────────────
    // 1. COMMAND SUMMARY REPORT
    // ─────────────────────────────────────────────────────────────
    if (type === 'command-summary' || type === 'summary') {
      let expList = [];
      let cargoList = [];
      let invList = [];
      let personList = [];
      let incList = [];
      let taskList = [];
      let baseList = [];

      if (isConnected) {
        [expList, cargoList, invList, personList, incList, taskList, baseList] = await Promise.all([
          Expedition.find().populate('destinationBase', 'name code').lean(),
          Cargo.find().populate('destinationBase', 'name code').lean(),
          Inventory.find().populate('base', 'name code').lean(),
          Personnel.find().populate('currentBase', 'name code').lean(),
          Incident.find().populate('base', 'name code').lean(),
          Task.find().populate('base', 'name code').populate('expedition', 'name expeditionCode').lean(),
          Base.find().lean(),
        ]);
      } else {
        expList = [...mockExpeditions];
        cargoList = [...mockCargo];
        invList = [...mockInventory];
        personList = [...mockPersonnel];
        incList = [...mockIncidents];
        taskList = [...mockTasks];
        baseList = [...mockBases];
      }

      // Base filter if selected
      if (base && base !== 'All') {
        cargoList = cargoList.filter((c) => c.destinationBase?.name === base || c.destination === base || c.baseName === base);
        invList = invList.filter((i) => i.base?.name === base || i.baseName === base);
        personList = personList.filter((p) => p.currentBase?.name === base || p.baseName === base);
        incList = incList.filter((inc) => inc.base?.name === base || inc.baseName === base);
        taskList = taskList.filter((t) => t.base?.name === base || t.baseName === base);
        expList = expList.filter((e) => e.destinationBase?.name === base || e.targetBase === base);
      }

      // Calculate Operational KPIs
      const totalOperations = expList.length + cargoList.length + taskList.length + incList.length;
      const completedCount =
        expList.filter((e) => e.status === 'Completed').length +
        cargoList.filter((c) => c.status === 'Delivered').length +
        taskList.filter((t) => t.status === 'Completed').length +
        incList.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length;

      const pendingCount =
        expList.filter((e) => e.status === 'Planning').length +
        cargoList.filter((c) => c.status === 'Planned' || c.status === 'Packed' || c.status === 'In Transit' || c.status === 'InTransit' || c.status === 'Loading').length +
        taskList.filter((t) => t.status === 'Pending' || t.status === 'Todo').length +
        incList.filter((i) => i.status === 'Reported' || i.status === 'Assessing').length;

      const overdueTasks = taskList.filter((t) => {
        if (t.status === 'Overdue') return true;
        if (t.status !== 'Completed' && t.deadline && new Date(t.deadline) < new Date()) return true;
        if (t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date()) return true;
        return false;
      }).length;

      const delayedCargo = cargoList.filter((c) => c.status === 'Delayed').length;
      const criticalIncidents = incList.filter((i) => i.severity === 'Critical' && i.status !== 'Resolved' && i.status !== 'Closed').length;
      const criticalTasks = taskList.filter((t) => t.priority === 'Critical' && t.status !== 'Completed').length;
      const lowStockItems = invList.filter((i) => i.quantity <= i.minThreshold).length;

      const kpis = {
        total: totalOperations,
        completed: completedCount,
        pending: pendingCount,
        overdue: overdueTasks,
        critical: criticalIncidents + criticalTasks,
        delayed: delayedCargo,
      };

      // Critical Operational Issues & Impact Matrix
      const criticalIssues = [];

      // 1. Incidents
      incList.filter((i) => i.severity === 'Critical' || i.severity === 'High').forEach((i) => {
        criticalIssues.push({
          id: i.incidentCode || i.incidentNumber || i._id,
          category: 'Emergency Incident',
          title: i.title || i.description?.substring(0, 60),
          severity: i.severity,
          status: i.status,
          base: i.base?.name || i.baseName || i.location || 'Station Base',
          impact: i.description || 'Active hazard poses threat to crew safety and station power.',
          recommendedAction: 'Immediate triage protocol; dispatch field response team.',
        });
      });

      // 2. Overdue or Critical Tasks
      taskList.filter((t) => t.priority === 'Critical' || t.status === 'Overdue').forEach((t) => {
        const isPast = t.status === 'Overdue' || (t.status !== 'Completed' && new Date(t.deadline || t.dueDate) < new Date());
        criticalIssues.push({
          id: t._id,
          category: 'Operational Task',
          title: t.title,
          severity: t.priority,
          status: isPast ? 'Overdue' : t.status,
          base: t.base?.name || t.baseName || 'Maitri Station',
          impact: `Scheduled inspection '${t.title}' is unverified; risking system disruption.`,
          recommendedAction: `Assign priority dispatch to ${t.assignedToName || 'lead engineer'} immediately.`,
        });
      });

      // 3. Low/Depleted Inventory
      invList.filter((inv) => inv.quantity <= inv.minThreshold).forEach((inv) => {
        criticalIssues.push({
          id: inv.itemCode || inv.sku || inv._id,
          category: 'Inventory Deficit',
          title: `${inv.itemName || inv.name} (Stock: ${inv.quantity} ${inv.unit || 'units'})`,
          severity: inv.quantity === 0 ? 'Critical' : 'High',
          status: 'Low Stock',
          base: inv.base?.name || inv.baseName || 'Station Bunker',
          impact: `Reserves below safety threshold (${inv.minThreshold} ${inv.unit || 'units'}). Supply failure risk.`,
          recommendedAction: 'Authorize emergency resupply convoy or fuel redistribution.',
        });
      });

      // 4. Delayed Cargo
      cargoList.filter((c) => c.status === 'Delayed').forEach((c) => {
        criticalIssues.push({
          id: c.cargoCode || c.trackingNumber || c._id,
          category: 'Cargo Logistics',
          title: `${c.cargoCode || c.trackingNumber}: ${c.description || c.title}`,
          severity: c.priority === 'Critical' ? 'Critical' : 'High',
          status: 'Delayed',
          base: c.destinationBase?.name || c.destination || 'Target Outpost',
          impact: 'Critical components delayed in transit due to severe weather/pack ice.',
          recommendedAction: 'Coordinate air-drop or alternative overland traverse escort.',
        });
      });

      // Chart data: Distribution by Station Base
      const baseMap = {};
      baseList.forEach((b) => {
        baseMap[b.name] = { base: b.name, total: 0, critical: 0, completed: 0 };
      });
      // Fallback base names if list empty
      ['Maitri Station', 'Bharati Station', 'Himadri Station'].forEach((name) => {
        if (!baseMap[name]) baseMap[name] = { base: name, total: 0, critical: 0, completed: 0 };
      });

      taskList.forEach((t) => {
        const bName = t.base?.name || t.baseName || 'Maitri Station';
        if (!baseMap[bName]) baseMap[bName] = { base: bName, total: 0, critical: 0, completed: 0 };
        baseMap[bName].total++;
        if (t.priority === 'Critical') baseMap[bName].critical++;
        if (t.status === 'Completed') baseMap[bName].completed++;
      });

      cargoList.forEach((c) => {
        const bName = c.destinationBase?.name || c.destination || 'Bharati Station';
        if (!baseMap[bName]) baseMap[bName] = { base: bName, total: 0, critical: 0, completed: 0 };
        baseMap[bName].total++;
        if (c.status === 'Delayed') baseMap[bName].critical++;
        if (c.status === 'Delivered') baseMap[bName].completed++;
      });

      const chartData = {
        baseDistribution: Object.values(baseMap),
        statusBreakdown: [
          { name: 'Completed', value: completedCount, color: '#10B981' },
          { name: 'Pending', value: pendingCount, color: '#F59E0B' },
          { name: 'Overdue', value: overdueTasks, color: '#F43F5E' },
          { name: 'Delayed', value: delayedCargo, color: '#FB923C' },
          { name: 'Critical Hazards', value: criticalIncidents + criticalTasks, color: '#E11D48' },
        ],
      };

      if (format === 'csv') {
        const csvRows = [
          'POLARIS COMMAND OPERATIONAL SUMMARY BRIEFING',
          `Generated At,${new Date().toISOString()}`,
          `Total Directives,${kpis.total}`,
          `Completed,${kpis.completed}`,
          `Pending,${kpis.pending}`,
          `Overdue,${kpis.overdue}`,
          `Critical Hazards,${kpis.critical}`,
          `Delayed Cargo,${kpis.delayed}`,
          '',
          'CRITICAL ISSUES & OPERATIONAL IMPACT REGISTRY',
          'ID,Category,Title,Severity,Status,Station Base,Operational Impact,Recommended Action',
        ];

        criticalIssues.forEach((issue) => {
          csvRows.push(
            `"${issue.id}","${issue.category}","${issue.title}","${issue.severity}","${issue.status}","${issue.base}","${issue.impact.replace(/"/g, '""')}","${issue.recommendedAction.replace(/"/g, '""')}"`
          );
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=POLARIS_COMMAND_SUMMARY_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csvRows.join('\n'));
      }

      return res.json({
        success: true,
        reportType: 'command-summary',
        title: 'Command Operational Summary & Hazard Registry',
        kpis,
        criticalIssues,
        chartData,
        data: criticalIssues,
        fields: ['id', 'category', 'title', 'severity', 'status', 'base', 'impact', 'recommendedAction'],
        generatedAt: new Date().toISOString(),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. EXPEDITIONS REPORT
    // ─────────────────────────────────────────────────────────────
    if (type === 'expeditions') {
      let data = [];
      if (isConnected) {
        const query = {};
        if (status && status !== 'All') query.status = status;
        if (startDate) query.startDate = { $gte: new Date(startDate) };
        if (endDate) query.endDate = { $lte: new Date(endDate) };

        data = await Expedition.find(query).populate('destinationBase', 'name code').lean();

        if (base && base !== 'All') {
          data = data.filter((e) => e.destinationBase?.name === base);
        }
      } else {
        data = [...mockExpeditions];
        if (status && status !== 'All') data = data.filter((e) => e.status === status);
        if (base && base !== 'All') data = data.filter((e) => e.targetBase === base);
      }

      const total = data.length;
      const completed = data.filter((e) => e.status === 'Completed').length;
      const pending = data.filter((e) => e.status === 'Planning').length;
      const active = data.filter((e) => e.status === 'Active').length;
      const critical = data.filter((e) => (e.riskScore || 0) > 70).length;

      const kpis = {
        total,
        completed,
        pending,
        overdue: 0,
        critical,
        delayed: data.filter((e) => e.status === 'Cancelled').length,
      };

      const chartData = {
        statusBreakdown: [
          { name: 'Active', value: active, color: '#06B6D4' },
          { name: 'Planning', value: pending, color: '#F59E0B' },
          { name: 'Completed', value: completed, color: '#10B981' },
          { name: 'High Risk (>70)', value: critical, color: '#F43F5E' },
        ],
        baseDistribution: [
          { base: 'Maitri', total: data.filter((e) => (e.destinationBase?.name || e.targetBase) === 'Maitri' || (e.destinationBase?.name || e.targetBase) === 'Maitri Station').length },
          { base: 'Bharati', total: data.filter((e) => (e.destinationBase?.name || e.targetBase) === 'Bharati' || (e.destinationBase?.name || e.targetBase) === 'Bharati Station').length },
          { base: 'Himadri', total: data.filter((e) => (e.destinationBase?.name || e.targetBase) === 'Himadri' || (e.destinationBase?.name || e.targetBase) === 'Himadri Station').length },
        ],
      };

      const fields = ['expeditionCode', 'name', 'type', 'status', 'startDate', 'endDate', 'readinessScore', 'leader'];

      if (format === 'csv') {
        const header = fields.join(',');
        const rows = data.map((item) =>
          fields.map((f) => `"${String(item[f] ?? '').replace(/"/g, '""')}"`).join(',')
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=POLARIS_EXPEDITIONS_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send([header, ...rows].join('\n'));
      }

      return res.json({
        success: true,
        reportType: 'expeditions',
        title: 'Polar Expeditions & Field Research Report',
        kpis,
        chartData,
        data,
        fields,
        generatedAt: new Date().toISOString(),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CARGO REPORT
    // ─────────────────────────────────────────────────────────────
    if (type === 'cargo') {
      let data = [];
      if (isConnected) {
        const query = {};
        if (status && status !== 'All') query.status = status;
        if (startDate) query.expectedArrival = { $gte: new Date(startDate) };
        if (endDate) {
          query.expectedArrival = query.expectedArrival ? { ...query.expectedArrival, $lte: new Date(endDate) } : { $lte: new Date(endDate) };
        }

        data = await Cargo.find(query).populate('destinationBase', 'name code').lean();
        if (base && base !== 'All') {
          data = data.filter((c) => c.destinationBase?.name === base || c.destination === base);
        }
      } else {
        data = [...mockCargo];
        if (status && status !== 'All') data = data.filter((c) => c.status === status);
      }

      const total = data.length;
      const completed = data.filter((c) => c.status === 'Delivered').length;
      const pending = data.filter((c) => c.status === 'In Transit' || c.status === 'InTransit' || c.status === 'Loading' || c.status === 'Planned' || c.status === 'Packed').length;
      const delayed = data.filter((c) => c.status === 'Delayed').length;
      const critical = data.filter((c) => c.priority === 'Critical' || c.priority === 'Urgent').length;

      const kpis = {
        total,
        completed,
        pending,
        overdue: delayed,
        critical,
        delayed,
      };

      const chartData = {
        statusBreakdown: [
          { name: 'Delivered', value: completed, color: '#10B981' },
          { name: 'In Transit', value: pending, color: '#06B6D4' },
          { name: 'Delayed', value: delayed, color: '#F43F5E' },
          { name: 'Critical/Urgent', value: critical, color: '#E11D48' },
        ],
        baseDistribution: [
          { base: 'Maitri', total: data.filter((c) => (c.destinationBase?.name || c.destination) === 'Maitri Station' || c.destination === 'Maitri').length },
          { base: 'Bharati', total: data.filter((c) => (c.destinationBase?.name || c.destination) === 'Bharati Station' || c.destination === 'Bharati').length },
          { base: 'Himadri', total: data.filter((c) => (c.destinationBase?.name || c.destination) === 'Himadri Station' || c.destination === 'Himadri').length },
        ],
      };

      const fields = ['cargoCode', 'description', 'category', 'status', 'priority', 'weightKg', 'origin', 'destination'];

      if (format === 'csv') {
        const header = fields.join(',');
        const rows = data.map((item) =>
          fields.map((f) => {
            const val = f === 'destination' && item.destinationBase?.name ? item.destinationBase.name : (item[f] || item.title || '');
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(',')
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=POLARIS_CARGO_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send([header, ...rows].join('\n'));
      }

      return res.json({
        success: true,
        reportType: 'cargo',
        title: 'Polar Cold-Chain Cargo Manifest Report',
        kpis,
        chartData,
        data,
        fields,
        generatedAt: new Date().toISOString(),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. INVENTORY REPORT
    // ─────────────────────────────────────────────────────────────
    if (type === 'inventory') {
      let data = [];
      if (isConnected) {
        data = await Inventory.find().populate('base', 'name code').lean();
        if (base && base !== 'All') {
          data = data.filter((i) => i.base?.name === base);
        }
      } else {
        data = [...mockInventory];
        if (base && base !== 'All') {
          data = data.filter((i) => i.baseName === base);
        }
      }

      const total = data.length;
      const critical = data.filter((i) => i.quantity <= i.minThreshold).length;
      const normal = total - critical;

      const kpis = {
        total,
        completed: normal,
        pending: critical,
        overdue: 0,
        critical,
        delayed: 0,
      };

      const chartData = {
        statusBreakdown: [
          { name: 'Nominal Reserves', value: normal, color: '#10B981' },
          { name: 'Below Threshold', value: critical, color: '#F43F5E' },
        ],
        baseDistribution: [
          { base: 'Maitri', total: data.filter((i) => (i.base?.name || i.baseName) === 'Maitri Station').length },
          { base: 'Bharati', total: data.filter((i) => (i.base?.name || i.baseName) === 'Bharati Station').length },
          { base: 'Himadri', total: data.filter((i) => (i.base?.name || i.baseName) === 'Himadri Station').length },
        ],
      };

      const fields = ['itemCode', 'itemName', 'category', 'quantity', 'unit', 'minThreshold'];

      if (format === 'csv') {
        const header = fields.join(',');
        const rows = data.map((item) =>
          fields.map((f) => `"${String(item[f] || item.name || item.sku || '').replace(/"/g, '""')}"`).join(',')
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=POLARIS_INVENTORY_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send([header, ...rows].join('\n'));
      }

      return res.json({
        success: true,
        reportType: 'inventory',
        title: 'Station Stock & Critical Fuel Reserves Audit',
        kpis,
        chartData,
        data,
        fields,
        generatedAt: new Date().toISOString(),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. PERSONNEL REPORT
    // ─────────────────────────────────────────────────────────────
    if (type === 'personnel') {
      let data = [];
      if (isConnected) {
        data = await Personnel.find().populate('currentBase', 'name code').populate('currentExpedition', 'name expeditionCode').lean();
        if (base && base !== 'All') {
          data = data.filter((p) => p.currentBase?.name === base);
        }
        if (status && status !== 'All') {
          data = data.filter((p) => p.status === status);
        }
      } else {
        data = [...mockPersonnel];
        if (base && base !== 'All') data = data.filter((p) => p.baseName === base);
        if (status && status !== 'All') data = data.filter((p) => p.status === status);
      }

      const total = data.length;
      const deployed = data.filter((p) => p.status === 'Deployed' || p.status === 'Active').length;
      const atBase = data.filter((p) => p.status === 'At Base' || p.status === 'Available').length;

      const kpis = {
        total,
        completed: deployed,
        pending: atBase,
        overdue: 0,
        critical: data.filter((p) => p.status === 'Emergency').length,
        delayed: 0,
      };

      const chartData = {
        statusBreakdown: [
          { name: 'Deployed / Active', value: deployed, color: '#10B981' },
          { name: 'At Base / Available', value: atBase, color: '#06B6D4' },
          { name: 'Other', value: Math.max(0, total - deployed - atBase), color: '#64748B' },
        ],
        baseDistribution: [
          { base: 'Maitri', total: data.filter((p) => (p.currentBase?.name || p.baseName) === 'Maitri Station').length },
          { base: 'Bharati', total: data.filter((p) => (p.currentBase?.name || p.baseName) === 'Bharati Station').length },
          { base: 'Himadri', total: data.filter((p) => (p.currentBase?.name || p.baseName) === 'Himadri Station').length },
        ],
      };

      const fields = ['participantId', 'name', 'designation', 'status', 'team'];

      if (format === 'csv') {
        const header = fields.join(',');
        const rows = data.map((item) =>
          fields.map((f) => `"${String(item[f] || item.role || item.employeeId || '').replace(/"/g, '""')}"`).join(',')
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=POLARIS_PERSONNEL_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send([header, ...rows].join('\n'));
      }

      return res.json({
        success: true,
        reportType: 'personnel',
        title: 'Overwintering Personnel & Operations Roster',
        kpis,
        chartData,
        data,
        fields,
        generatedAt: new Date().toISOString(),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 6. EMERGENCY INCIDENTS REPORT
    // ─────────────────────────────────────────────────────────────
    if (type === 'incidents' || type === 'emergency') {
      let data = [];
      if (isConnected) {
        const query = {};
        if (status && status !== 'All') query.status = status;
        if (startDate) query.createdAt = { $gte: new Date(startDate) };
        if (endDate) {
          query.createdAt = query.createdAt ? { ...query.createdAt, $lte: new Date(endDate) } : { $lte: new Date(endDate) };
        }

        data = await Incident.find(query).populate('base', 'name code').lean();
        if (base && base !== 'All') {
          data = data.filter((i) => i.base?.name === base);
        }
      } else {
        data = [...mockIncidents];
        if (status && status !== 'All') data = data.filter((i) => i.status === status);
        if (base && base !== 'All') data = data.filter((i) => i.baseName === base);
      }

      const total = data.length;
      const critical = data.filter((i) => i.severity === 'Critical').length;
      const resolved = data.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length;
      const active = data.filter((i) => i.status === 'Reported' || i.status === 'Assessing' || i.status === 'Responding' || i.status === 'Active').length;

      const kpis = {
        total,
        completed: resolved,
        pending: active,
        overdue: 0,
        critical,
        delayed: 0,
      };

      const chartData = {
        statusBreakdown: [
          { name: 'Active Emergency', value: active, color: '#F43F5E' },
          { name: 'Critical Severity', value: critical, color: '#E11D48' },
          { name: 'Resolved', value: resolved, color: '#10B981' },
        ],
        baseDistribution: [
          { base: 'Maitri', total: data.filter((i) => (i.base?.name || i.baseName) === 'Maitri Station').length },
          { base: 'Bharati', total: data.filter((i) => (i.base?.name || i.baseName) === 'Bharati Station').length },
          { base: 'Himadri', total: data.filter((i) => (i.base?.name || i.baseName) === 'Himadri Station').length },
        ],
      };

      const fields = ['incidentCode', 'type', 'severity', 'status', 'location', 'description'];

      if (format === 'csv') {
        const header = fields.join(',');
        const rows = data.map((item) =>
          fields.map((f) => `"${String(item[f] || item.incidentNumber || '').replace(/"/g, '""')}"`).join(',')
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=POLARIS_INCIDENTS_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send([header, ...rows].join('\n'));
      }

      return res.json({
        success: true,
        reportType: 'incidents',
        title: 'Emergency Incidents & Hazard Mitigation Report',
        kpis,
        chartData,
        data,
        fields,
        generatedAt: new Date().toISOString(),
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 7. TASKS REPORT
    // ─────────────────────────────────────────────────────────────
    if (type === 'tasks') {
      let data = [];
      if (isConnected) {
        const query = {};
        if (status && status !== 'All') query.status = status;
        if (startDate) query.deadline = { $gte: new Date(startDate) };
        if (endDate) {
          query.deadline = query.deadline ? { ...query.deadline, $lte: new Date(endDate) } : { $lte: new Date(endDate) };
        }

        data = await Task.find(query)
          .populate('base', 'name code')
          .populate('expedition', 'name expeditionCode')
          .populate('assignedTo', 'name')
          .lean();

        if (base && base !== 'All') {
          data = data.filter((t) => t.base?.name === base);
        }
        if (expedition && expedition !== 'All') {
          data = data.filter((t) => t.expedition?._id?.toString() === expedition || t.expedition?.name === expedition);
        }
      } else {
        data = [...mockTasks];
        if (status && status !== 'All') data = data.filter((t) => t.status === status);
        if (base && base !== 'All') data = data.filter((t) => t.base?.name === base || t.baseName === base);
      }

      const total = data.length;
      const completed = data.filter((t) => t.status === 'Completed').length;
      const pending = data.filter((t) => t.status === 'Pending' || t.status === 'Todo').length;
      const inProgress = data.filter((t) => t.status === 'In Progress' || t.status === 'InProgress').length;
      const overdue = data.filter((t) => {
        if (t.status === 'Overdue') return true;
        if (t.status !== 'Completed' && new Date(t.deadline || t.dueDate) < new Date()) return true;
        return false;
      }).length;
      const critical = data.filter((t) => t.priority === 'Critical').length;

      const kpis = {
        total,
        completed,
        pending,
        overdue,
        critical,
        delayed: overdue,
      };

      const chartData = {
        statusBreakdown: [
          { name: 'Completed', value: completed, color: '#10B981' },
          { name: 'In Progress', value: inProgress, color: '#06B6D4' },
          { name: 'Pending', value: pending, color: '#F59E0B' },
          { name: 'Overdue', value: overdue, color: '#F43F5E' },
        ],
        baseDistribution: [
          { base: 'Maitri', total: data.filter((t) => (t.base?.name || t.baseName) === 'Maitri Station').length },
          { base: 'Bharati', total: data.filter((t) => (t.base?.name || t.baseName) === 'Bharati Station').length },
          { base: 'Himadri', total: data.filter((t) => (t.base?.name || t.baseName) === 'Himadri Station').length },
        ],
      };

      const fields = ['title', 'priority', 'status', 'assignedToName', 'deadline', 'description'];

      if (format === 'csv') {
        const header = fields.join(',');
        const rows = data.map((item) =>
          fields.map((f) => {
            const val = f === 'deadline' ? (item.deadline || item.dueDate || '') : item[f];
            return `"${String(val ?? '').replace(/"/g, '""')}"`;
          }).join(',')
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=POLARIS_TASKS_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send([header, ...rows].join('\n'));
      }

      return res.json({
        success: true,
        reportType: 'tasks',
        title: 'Operational Tasks & Maintenance Directives Report',
        kpis,
        chartData,
        data,
        fields,
        generatedAt: new Date().toISOString(),
      });
    }

    return res.status(400).json({ success: false, message: `Unknown report type: ${type}` });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateReport };

