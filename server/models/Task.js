const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  authorName: { type: String, default: '' },
  text: { type: String, default: '' },
  message: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

// Ensure text is populated from message if needed
commentSchema.pre('validate', function () {
  if (!this.text && this.message) {
    this.text = this.message;
  }
  if (!this.message && this.text) {
    this.message = this.text;
  }
});

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel', default: null },
    assignedToName: { type: String, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Overdue', 'Assigned', 'Todo', 'InProgress'],
      default: 'Pending',
    },
    comments: [commentSchema],
    attachments: [{ type: String }],
    expedition: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', default: null },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias for dueDate -> deadline
taskSchema.virtual('dueDate')
  .get(function () {
    return this.deadline;
  })
  .set(function (value) {
    this.deadline = value;
  });

// Pre-save normalization: normalize legacy statuses to workflow statuses
taskSchema.pre('save', function () {
  if (this.status === 'Todo' || this.status === 'Assigned') {
    this.status = 'Pending';
  } else if (this.status === 'InProgress') {
    this.status = 'In Progress';
  }
});

taskSchema.index({ status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ expedition: 1 });

module.exports = mongoose.model('Task', taskSchema);
