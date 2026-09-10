const mongoose = require('mongoose');

const movementLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ['Personnel', 'Asset', 'Inventory'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entityName: { type: String, default: '' },
    fromBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
    toBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
    fromBaseName: { type: String, default: '' },
    toBaseName: { type: String, default: '' },
    reason: { type: String, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

movementLogSchema.index({ entityType: 1, entityId: 1 });
movementLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MovementLog', movementLogSchema);
