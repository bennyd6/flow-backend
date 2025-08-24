const mongoose = require('mongoose');
const { Schema } = mongoose;

const projectSchema = new Schema({
  // Name of the project
  name: {
    type: String,
    required: true
  },
  // A brief description of the project
  description: {
    type: String,
    required: true
  },
  // The ID of the user who is the team lead.
  // This creates a reference to a single document in the 'user' collection.
  teamLead: {
    type: Schema.Types.ObjectId,
    ref: 'user', // Refers to the 'user' model
    required: true
  },
  // An array of user IDs who are part of the project team.
  // This creates a reference to multiple documents in the 'user' collection.
  team: [{
    type: Schema.Types.ObjectId,
    ref: 'user' // Each item in the array refers to a 'user' model
  }],
  // The date the project was created, defaults to the current date and time.
  date: {
    type: Date,
    default: Date.now
  }
});

const Project = mongoose.model('project', projectSchema);

module.exports = Project;
