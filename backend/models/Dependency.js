const mongoose = require('mongoose');

const dependencySchema = new mongoose.Schema({
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task', 
    required: true 
  },
  dependsOnTaskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task', 
    required: true 
  },
  dependencyType: { 
    type: String, 
    enum: ['Blocks', 'Relates To'], 
    default: 'Blocks' 
  }
});

module.exports = mongoose.model('Dependency', dependencySchema);