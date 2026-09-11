const mongoose = require('mongoose');

const movementHistorySchema = new mongoose.Schema({
  event: { type: String, enum: ['Check In', 'Check Out', 'Transfer', 'Deployment', 'Return', 'Status Change'], required: true },
  location: { type: String, required: true },
  base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
  baseName: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: String, default: 'System' },
  notes: { type: String, default: '' },
}, { _id: true });

const personnelSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    participantId: { type: String, unique: true, required: true },
    employeeId: { type: String, default: '' },
    designation: { type: String, required: true },
    role: { type: String, default: '' },
    rank: { type: String, default: 'Specialist' },
    department: {
      type: String,
      enum: ['Science', 'Operations', 'Medical', 'Command', 'Logistics', 'Engineering', 'Security', 'General'],
      default: 'Science',
    },
    team: { type: String, default: '' },
    shift: {
      type: String,
      enum: ['Alpha (Day)', 'Bravo (Night)', 'Charlie (Swing)', 'Continuous Watch', 'On Call', 'Standby'],
      default: 'Alpha (Day)',
    },
    currentExpedition: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', default: null },
    currentBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
    baseName: { type: String, default: 'Maitri Station' },
    bloodGroup: { type: String, default: 'O+' },
    medicalClearance: {
      type: String,
      enum: ['Cleared', 'Conditional', 'Restricted Duty', 'Medical Hold', 'Quarantined'],
      default: 'Cleared',
    },
    certifications: [{ type: String }],
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relationship: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['Active', 'Available', 'Deployed', 'At Base', 'In Transit', 'Standby', 'On Leave', 'Emergency'],
      default: 'Active',
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
personnelSchema.index({ employeeId: 1 });
personnelSchema.index({ department: 1 });

module.exports = mongoose.model('Personnel', personnelSchema);

