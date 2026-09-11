const mongoose = require('mongoose');

const baseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true },
    location: {
      type: String,
      default: '',
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    operationalStatus: {
      type: String,
      enum: ['Operational', 'Limited', 'Critical', 'Maintenance', 'Evacuated', 'Non-operational'],
      default: 'Operational',
    },
    status: {
      type: String,
      default: 'Operational',
    },
    capacity: { type: Number, default: 50 },
    currentPersonnel: { type: Number, default: 0 },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['Permanent Station', 'Research Station', 'Camp', 'Mobile Vessel', 'Observatory', 'Refuge Pod'],
      default: 'Permanent Station',
    },
    elevationMeters: { type: Number, default: 0 },
    weatherTelemetry: {
      temperature: { type: Number, default: -25 },
      windSpeed: { type: String, default: '18 kt' },
      windGust: { type: String, default: '28 kt' },
      baroPressure: { type: String, default: '984 hPa' },
      condition: { type: String, default: 'Partly Cloudy' },
      humidity: { type: String, default: '64%' },
      visibility: { type: String, default: '15 km' },
    },
    commsStatus: {
      type: String,
      enum: ['Optimal', 'Degraded', 'Offline', 'Intermittent'],
      default: 'Optimal',
    },
    facilities: [{ type: String }],
  },
  { timestamps: true }
);

baseSchema.index({ code: 1 });
baseSchema.index({ operationalStatus: 1 });

module.exports = mongoose.model('Base', baseSchema);

