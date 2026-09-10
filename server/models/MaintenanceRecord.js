const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    assetName: { type: String, default: '' },
    type: { type: String, enum: ['Routine', 'Repair', 'Inspection', 'Emergency'], default: 'Routine' },
    description: { type: String, required: true },
    performedBy: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    nextDueDate: { type: Date, default: null },
    status: { type: String, enum: ['Scheduled', 'In Progress', 'Completed'], default: 'Completed' },
  },
  { timestamps: true }
);

maintenanceRecordSchema.index({ asset: 1 });
maintenanceRecordSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
