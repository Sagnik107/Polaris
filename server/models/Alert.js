const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String, required: true,
      enum: ['low_stock', 'cargo_delay', 'overdue_task', 'maintenance_due', 'emergency', 'risk_warning', 'system', 'expiry_warning'],
    },
    severity: {
      type: String, required: true,
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
    sourceModule: {
      type: String, required: true,
      enum: ['inventory', 'cargo', 'task', 'asset', 'incident', 'expedition', 'personnel', 'system'],
    },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    message: { type: String, required: true },
    targetRoles: [{ type: String }],
    isRead: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    actionUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

alertSchema.index({ targetRoles: 1, isRead: 1, createdAt: -1 });
alertSchema.index({ sourceModule: 1, sourceId: 1 });

module.exports = mongoose.model('Alert', alertSchema);
