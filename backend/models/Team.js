const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  }
});

module.exports = mongoose.model('Team', teamSchema);