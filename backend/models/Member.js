import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

export default mongoose.model('Member', memberSchema);