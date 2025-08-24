const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  // The project this message belongs to.
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'project',
    required: true
  },
  // The user who sent the message.
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  // The text content of the message.
  content: {
    type: String,
    required: true,
    trim: true
  },
  // The timestamp when the message was sent.
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Message = mongoose.model('message', messageSchema);

module.exports = Message;
