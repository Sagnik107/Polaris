const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
}, { _id: true });

const expeditionSchema = new mongoose.Schema(
  {
    expeditionCode: { type: String, unique: true, required: true },
    name: { type: String, required: [true, 'Expedition name is required'], trim: true },
    type: {
      type: String, required: true,
      enum: ['Antarctic', 'Arctic', 'Research', 'Resupply', 'Survey'],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    destinationBase: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', required: true },
    status: {
      type: String, enum: ['Planning', 'Active', 'Completed', 'Cancelled'],
      default: 'Planning',
    },
    assignedPersonnel: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' }],
    assignedResources: [{
      item: { type: String },
      refModel: { type: String },
      refId: { type: mongoose.Schema.Types.ObjectId },
      quantity: { type: Number, default: 1 },
    }],
    milestones: [milestoneSchema],
    readinessScore: { type: Number, default: 0, min: 0, max: 100 },
    description: { type: String, default: '' },
    leader: { type: String, default: '' },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

expeditionSchema.index({ status: 1 });
expeditionSchema.index({ destinationBase: 1 });
expeditionSchema.index({ expeditionCode: 1 });

// Virtual for progress calculation
expeditionSchema.virtual('progress').get(function () {
  if (!this.milestones || this.milestones.length === 0) return 0;
  const completed = this.milestones.filter((m) => m.status === 'Completed').length;
  return Math.round((completed / this.milestones.length) * 100);
});

expeditionSchema.set('toJSON', { virtuals: true });
expeditionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Expedition', expeditionSchema);
