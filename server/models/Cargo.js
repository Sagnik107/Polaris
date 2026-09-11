const mongoose = require('mongoose');

const trackingEntrySchema = new mongoose.Schema({
  status: { type: String, required: true },
  location: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: { type: String, default: 'Logistics Command' },
  notes: { type: String, default: '' },
}, { _id: true });

const cargoItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unit: { type: String, default: 'Units' },
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', default: null },
}, { _id: true });

const cargoSchema = new mongoose.Schema(
  {
    cargoCode: { type: String, unique: true },
    trackingNumber: { type: String },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    title: { type: String, trim: true },
    name: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Food', 'Provisions', 'Fuel', 'Equipment', 'Scientific', 'Medical', 'Communication', 'Safety', 'Spare Parts', 'Electronics', 'Other'],
      default: 'Equipment',
    },
    weightKg: { type: Number, required: true, min: [0.01, 'Weight must be positive'], default: 100 },
    volumeM3: { type: Number, default: 1.0 },
    quantity: { type: Number, default: 1 },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    destinationBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
    destinationBaseName: { type: String, default: '' },
    currentLocation: { type: String, default: 'En Route' },
    currentCoordinates: {
      lat: { type: Number, default: -70.0 },
      lng: { type: Number, default: 45.0 },
    },
    routeCoordinates: [
      {
        lat: { type: Number },
        lng: { type: Number },
      },
    ],
    carrier: { type: String, default: 'RV Polar Star' },
    status: {
      type: String,
      enum: ['Planned', 'Packed', 'Loading', 'Dispatched', 'In Transit', 'InTransit', 'At Base', 'Delivered', 'Delayed', 'Lost/Damaged'],
      default: 'Planned',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent', 'Critical', 'Standard'],
      default: 'Medium',
    },
    expectedArrival: { type: Date },
    eta: { type: String, default: '3 Days' },
    barcodeValue: { type: String },
    temperatureRequirement: { type: String, default: 'Standard Ambient' },
    currentTemperature: { type: Number, default: -20.0 },
    batteryReserve: { type: Number, default: 95 },
    shockGForce: { type: Number, default: 0.2 },
    items: [cargoItemSchema],
    trackingHistory: [trackingEntrySchema],
    expedition: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', default: null },
    delayRisk: { type: Number, default: 0, min: 0, max: 1 },
  },
  { timestamps: true }
);

cargoSchema.index({ status: 1 });
cargoSchema.index({ destination: 1 });
cargoSchema.index({ cargoCode: 1 });
cargoSchema.index({ trackingNumber: 1 });
cargoSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('Cargo', cargoSchema);

