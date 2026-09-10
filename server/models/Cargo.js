const mongoose = require('mongoose');

const trackingEntrySchema = new mongoose.Schema({
  status: { type: String, required: true },
  location: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' },
}, { _id: true });

const cargoSchema = new mongoose.Schema(
  {
    cargoCode: { type: String, unique: true, required: true },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    category: {
      type: String, required: true,
      enum: ['Food', 'Fuel', 'Equipment', 'Scientific', 'Medical', 'Communication', 'Safety', 'Spare Parts', 'Other'],
    },
    weightKg: { type: Number, required: true, min: [0.01, 'Weight must be positive'] },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    destinationBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
    currentLocation: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Planned', 'Packed', 'Dispatched', 'In Transit', 'At Base', 'Delivered', 'Delayed', 'Lost/Damaged'],
      default: 'Planned',
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    expectedArrival: { type: Date },
    barcodeValue: { type: String, unique: true },
    trackingHistory: [trackingEntrySchema],
    expedition: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', default: null },
    delayRisk: { type: Number, default: 0, min: 0, max: 1 },
  },
  { timestamps: true }
);

cargoSchema.index({ status: 1 });
cargoSchema.index({ destination: 1 });
cargoSchema.index({ cargoCode: 1 });
cargoSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('Cargo', cargoSchema);
