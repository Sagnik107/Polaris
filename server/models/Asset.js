const mongoose = require('mongoose');

const maintenanceEntrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['Routine', 'Repair', 'Inspection', 'Emergency'], default: 'Routine' },
  notes: { type: String, required: true },
  performedBy: { type: String, default: '' },
  cost: { type: Number, default: 0 },
}, { _id: true });

const assetSchema = new mongoose.Schema(
  {
    assetCode: { type: String, unique: true },
    assetName: { type: String, required: [true, 'Asset name is required'], trim: true },
    category: {
      type: String, required: true,
      enum: ['Vehicle', 'Scientific Instrument', 'Communication', 'Generator', 'Safety Equipment', 'Medical Equipment', 'Other'],
    },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel', default: null },
    condition: {
      type: String, enum: ['Good', 'Fair', 'Needs Repair', 'Out of Service'],
      default: 'Good',
    },
    maintenanceStatus: {
      type: String, enum: ['Up to Date', 'Due Soon', 'Overdue', 'In Maintenance'],
      default: 'Up to Date',
    },
    nextMaintenanceDate: { type: Date, default: null },
    maintenanceHistory: [maintenanceEntrySchema],
    serialNumber: { type: String, default: '' },
    acquisitionDate: { type: Date, default: null },
  },
  { timestamps: true }
);

assetSchema.index({ base: 1 });
assetSchema.index({ condition: 1 });
assetSchema.index({ assetCode: 1 });

module.exports = mongoose.model('Asset', assetSchema);
