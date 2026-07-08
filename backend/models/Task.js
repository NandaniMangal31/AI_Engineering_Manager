import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    taskName: { type: String, required: true },
    status: { type: String, default: 'In Progress' },
    priority: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Task', taskSchema);