const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
}, { _id: true });

const assignedResourceSchema = new mongoose.Schema({
  item: { type: String, required: true },
  category: { type: String, default: 'Asset' },
  refModel: { type: String, enum: ['Asset', 'Cargo', 'Inventory', 'Other'], default: 'Asset' },
  refId: { type: mongoose.Schema.Types.ObjectId, default: null },
  quantity: { type: Number, default: 1 },
  notes: { type: String, default: '' },
}, { _id: true });

const expeditionSchema = new mongoose.Schema(
  {
    expeditionCode: { type: String, unique: true, required: true },
    name: { type: String, required: [true, 'Expedition name is required'], trim: true },
    type: {
      type: String,
      required: true,
      enum: ['Antarctic', 'Arctic', 'Research', 'Resupply', 'Survey'],
      default: 'Antarctic',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    destinationBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Base' },
    baseName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'Completed', 'Cancelled'],
      default: 'Planning',
    },
    assignedPersonnel: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' }],
    assignedResources: [assignedResourceSchema],
    milestones: [milestoneSchema],
    readinessScore: { type: Number, default: 0, min: 0, max: 100 },
    riskLevel: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      default: 'Low',
    },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    aiRiskPrediction: { type: String, default: 'Clear corridor. Nominal telemetry.' },
    description: { type: String, default: '' },
    leader: { type: String, default: '' },
    objectives: [{ type: String }],
    budget: {
      allocated: { type: Number, default: 0 },
      spent: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

expeditionSchema.index({ status: 1 });
expeditionSchema.index({ destinationBase: 1 });
expeditionSchema.index({ expeditionCode: 1 });

// Virtual alias for code
expeditionSchema.virtual('code').get(function () {
  return this.expeditionCode;
});

// Virtual for progress calculation
expeditionSchema.virtual('progress').get(function () {
  if (!this.milestones || this.milestones.length === 0) return 0;
  let score = 0;
  for (const m of this.milestones) {
    const s = (m.status || '').toLowerCase();
    if (s === 'completed') score += 1.0;
    else if (s === 'in_progress' || s === 'inprogress' || s === 'in progress') score += 0.5;
  }
  return Math.min(100, Math.round((score / this.milestones.length) * 100));
});

// Pre-save fallback for code / expeditionCode
expeditionSchema.pre('validate', function (next) {
  if (!this.expeditionCode && this.code) {
    this.expeditionCode = this.code;
  }
  next();
});

expeditionSchema.set('toJSON', { virtuals: true });
expeditionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Expedition', expeditionSchema);
