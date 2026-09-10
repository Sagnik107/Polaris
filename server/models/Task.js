const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, default: '' },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel', default: null },
    assignedToName: { type: String, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Assigned', 'In Progress', 'Completed', 'Overdue'],
      default: 'Pending',
    },
    comments: [commentSchema],
    attachments: [{ type: String }],
    expedition: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', default: null },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

taskSchema.index({ status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ expedition: 1 });

module.exports = mongoose.model('Task', taskSchema);
