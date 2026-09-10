const mongoose = require('mongoose');

const movementHistorySchema = new mongoose.Schema({
  event: { type: String, enum: ['Check In', 'Check Out', 'Transfer', 'Deployment', 'Return'], required: true },
  location: { type: String, required: true },
  base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
}, { _id: true });

const personnelSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    participantId: { type: String, unique: true, required: true },
    designation: { type: String, required: true },
    team: { type: String, default: '' },
    currentExpedition: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', default: null },
    currentBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relationship: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['Available', 'Deployed', 'At Base', 'In Transit', 'On Leave', 'Emergency'],
      default: 'Available',
    },
    movementHistory: [movementHistorySchema],
    skills: [{ type: String }],
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  { timestamps: true }
);

personnelSchema.index({ status: 1 });
personnelSchema.index({ currentBase: 1 });
personnelSchema.index({ currentExpedition: 1 });
personnelSchema.index({ participantId: 1 });

module.exports = mongoose.model('Personnel', personnelSchema);
