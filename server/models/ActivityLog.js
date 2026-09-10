const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, default: '' },
    action: { type: String, required: true },
    entityType: {
      type: String, required: true,
      enum: ['User', 'Expedition', 'Cargo', 'Inventory', 'Asset', 'Personnel', 'Base', 'Task', 'Incident', 'Alert', 'System'],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    description: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actor: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
