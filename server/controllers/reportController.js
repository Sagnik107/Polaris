const Expedition = require('../models/Expedition');
const Cargo = require('../models/Cargo');
const Inventory = require('../models/Inventory');
const Personnel = require('../models/Personnel');
const Incident = require('../models/Incident');

const generateReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;
    let data;
    let fields;
    switch (type) {
      case 'expeditions':
        data = await Expedition.find().populate('destinationBase', 'name').lean();
        fields = ['expeditionCode', 'name', 'type', 'status', 'startDate', 'endDate', 'readinessScore'];
        break;
      case 'cargo':
        data = await Cargo.find().lean();
        fields = ['cargoCode', 'description', 'category', 'status', 'priority', 'origin', 'destination', 'weightKg', 'quantity'];
        break;
      case 'inventory':
        data = await Inventory.find().populate('base', 'name').lean();
        fields = ['itemCode', 'itemName', 'category', 'quantity', 'unit', 'minThreshold'];
        break;
      case 'personnel':
        data = await Personnel.find().populate('currentBase', 'name').lean();
        fields = ['participantId', 'name', 'designation', 'status', 'team'];
        break;
      case 'incidents':
        data = await Incident.find().populate('base', 'name').lean();
        fields = ['incidentCode', 'type', 'severity', 'status', 'location', 'description'];
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid report type.' });
    }
    if (format === 'csv') {
      const header = fields.join(',');
      const rows = data.map((item) => fields.map((f) => {
        const val = typeof item[f] === 'object' && item[f]?.name ? item[f].name : item[f];
        return `"${String(val || '').replace(/"/g, '""')}"`;
      }).join(','));
      const csv = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
      return res.send(csv);
    }
    res.json({ success: true, data, fields });
  } catch (error) { next(error); }
};

module.exports = { generateReport };
