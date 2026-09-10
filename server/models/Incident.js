const mongoose = require('mongoose');

const timelineEntrySchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: '' },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const incidentSchema = new mongoose.Schema(
  {
    incidentCode: { type: String, unique: true, required: true },
    type: {
      type: String, required: true,
      enum: ['Medical', 'Weather', 'Equipment Failure', 'Fire', 'Security', 'Environmental', 'Other'],
    },
    severity: {
      type: String, required: true,
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
    location: { type: String, required: true },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', required: true },
    peopleAffected: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' }],
    description: { type: String, required: [true, 'Description is required'] },
    requiredResources: [{ type: String }],
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' }],
    status: {
      type: String,
      enum: ['Reported', 'Assessing', 'Responding', 'Resolved', 'Closed'],
      default: 'Reported',
    },
    timeline: [timelineEntrySchema],
    resolutionNotes: { type: String, default: '' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

incidentSchema.index({ severity: 1, status: 1 });
incidentSchema.index({ base: 1 });
incidentSchema.index({ incidentCode: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
