const mongoose = require('mongoose');

const maintenanceEntrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['Routine', 'Repair', 'Inspection', 'Emergency', 'Overhaul'], default: 'Routine' },
  notes: { type: String, required: true },
  performedBy: { type: String, default: 'Station Engineering Team' },
  cost: { type: Number, default: 0 },
}, { _id: true });

const assetSchema = new mongoose.Schema(
  {
    assetCode: { type: String },
    assetTag: { type: String },
    assetName: { type: String, trim: true },
    name: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'Vehicle',
        'PowerGenerator',
        'Generator',
        'Scientific Instrument',
        'Scientific',
        'Communication',
        'Communications',
        'Safety Equipment',
        'Medical Equipment',
        'Heavy Machinery',
        'Other',
      ],
    },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', required: false },
    baseName: { type: String, default: 'Bharati Station' },
    model: { type: String, default: '' },
    serialNumber: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel', default: null },
    assignedPersonnelName: { type: String, default: 'Unassigned' },
    condition: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Needs Repair', 'Out of Service'],
      default: 'Good',
    },
    status: {
      type: String,
      enum: ['Operational', 'In Use', 'Under Maintenance', 'Maintenance', 'Decommissioned', 'Standby'],
      default: 'Operational',
    },
    maintenanceStatus: {
      type: String,
      enum: ['Up to Date', 'Due Soon', 'Overdue', 'In Maintenance'],
      default: 'Up to Date',
    },
    nextMaintenanceDate: { type: Date, default: null },
    lastMaintenanceDate: { type: Date, default: null },
    maintenanceIntervalDays: { type: Number, default: 90 },
    specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    maintenanceHistory: [maintenanceEntrySchema],
    acquisitionDate: { type: Date, default: null },
  },
  { timestamps: true }
);

assetSchema.index({ base: 1 });
assetSchema.index({ condition: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ assetCode: 1 });
assetSchema.index({ assetTag: 1 });

module.exports = mongoose.model('Asset', assetSchema);

