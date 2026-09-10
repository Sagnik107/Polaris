const mongoose = require('mongoose');

const baseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    operationalStatus: {
      type: String, enum: ['Operational', 'Limited', 'Non-operational'],
      default: 'Operational',
    },
    capacity: { type: Number, default: 50 },
    description: { type: String, default: '' },
    type: { type: String, enum: ['Station', 'Camp', 'Vessel', 'Observatory'], default: 'Station' },
    elevation: { type: Number, default: 0 },
    temperature: { type: Number, default: -20 },
    weatherCondition: { type: String, default: 'Clear' },
  },
  { timestamps: true }
);

baseSchema.index({ code: 1 });

module.exports = mongoose.model('Base', baseSchema);
