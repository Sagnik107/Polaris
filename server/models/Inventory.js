const mongoose = require('mongoose');

const movementEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Addition', 'Consumption', 'Transfer In', 'Transfer Out', 'Cargo Delivery', 'Adjustment'],
    required: true,
  },
  quantity: { type: Number, required: true },
  fromBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
  toBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
  fromBaseName: { type: String, default: '' },
  toBaseName: { type: String, default: '' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: { type: String, default: '' },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const inventorySchema = new mongoose.Schema(
  {
    itemCode: { type: String },
    sku: { type: String },
    itemName: { type: String, required: [true, 'Item name is required'], trim: true },
    name: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'Consumable',
        'Consumables & Fuel',
        'Fuel',
        'Medical',
        'Medical & Trauma Kits',
        'Food',
        'Rations',
        'Equipment',
        'Machinery',
        'Heavy Machinery & Power',
        'Communication',
        'Communications & Uplinks',
        'Safety',
        'Scientific',
        'Scientific Instrumentation',
        'Spare Parts',
        'SpareParts',
        'Other',
      ],
    },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', required: false },
    baseName: { type: String, default: 'Maitri Station' },
    locationDetails: { type: String, default: 'Main Depot Sector A' },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    maxCapacity: { type: Number, default: 1000 },
    unit: { type: String, required: true, default: 'Units' },
    minThreshold: { type: Number, required: true, default: 10 },
    unitCost: { type: Number, default: 0 },
    status: { type: String, default: 'In Stock' },
    expiryDate: { type: Date, default: null },
    movementHistory: [movementEntrySchema],
    lastRestocked: { type: Date, default: null },
  },
  { timestamps: true }
);

inventorySchema.index({ base: 1, category: 1 });
inventorySchema.index({ itemCode: 1 });
inventorySchema.index({ sku: 1 });
inventorySchema.index({ quantity: 1 });

inventorySchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.minThreshold;
});

inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', inventorySchema);

