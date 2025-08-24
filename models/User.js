const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: String,
  email: String,
  password: String,
  github: {
    type: String,
    default: null // You can make it optional by setting a default
  },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('user', userSchema);
module.exports = User;