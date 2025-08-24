const mongoose = require('mongoose');
const { Schema } = mongoose;

const taskSchema = new Schema({
  // The project this task belongs to.
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'project',
    required: true
  },
  // The main title or name of the task.
  title: {
    type: String,
    required: true
  },
  // A more detailed description of the task.
  description: {
    type: String,
    default: ''
  },
  // The user who created or assigned the task.
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  // The user to whom the task is assigned.
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  // The current status of the task.
  status: {
    type: String,
    // The 'enum' validator ensures the status can only be one of these values.
    enum: ['pending', 'ongoing', 'review', 'completed'],
    // The default status for a new task will be 'pending'.
    default: 'pending'
  },
  // The deadline for the task.
  dueDate: {
    type: Date,
    required: true
  },
  // The date the task was created.
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Task = mongoose.model('task', taskSchema);

module.exports = Task;
