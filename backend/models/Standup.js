import mongoose from 'mongoose';

const standupSchema = new mongoose.Schema({
    originalText: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Standup', standupSchema);