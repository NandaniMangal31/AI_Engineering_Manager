import express from 'express';
import mongoose from 'mongoose';
import { parseStandupMessage } from './parserService.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json()); 

// --- Mongoose Schemas ---
const standupSchema = new mongoose.Schema({
    originalText: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Standup = mongoose.model('Standup', standupSchema);

const memberSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});
const Member = mongoose.model('Member', memberSchema);

const taskSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    taskName: { type: String, required: true },
    status: { type: String, default: 'In Progress' },
    priority: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

// --- The Core API Endpoint ---
app.post('/api/standup', async (req, res) => {
    try {
        const { rawText } = req.body;

        // Step 1: System stores original message
        const standupRecord = await Standup.create({ originalText: rawText });

        // Step 2: Parser runs (Using Gemini)
        const parsedTasks = await parseStandupMessage(rawText);

        if (!parsedTasks || parsedTasks.length === 0) {
            return res.status(400).json({ error: "Invalid stand-up: No tasks could be extracted." });
        }

        const createdTasks = [];

        // Step 3 & 4: Process tasks and create members dynamically
        for (const pt of parsedTasks) {
            // Validation: Missing member defaults to 'Unknown'
            let memberName = pt.owner;
            if (!memberName || memberName.trim() === '') {
                memberName = 'Unknown';
            }
            
            // Validation: Do not create duplicate members
            let member = await Member.findOne({ name: memberName });
            if (!member) {
                member = await Member.create({ name: memberName });
            }

            // Validation: Do not create empty tasks
            if (pt.taskName && pt.taskName.trim() !== '') {
                const task = await Task.create({
                    owner: member._id,
                    taskName: pt.taskName,
                    status: pt.status || 'In Progress',
                    priority: pt.priority || null
                });
                createdTasks.push(task);
            }
        }

        // Return success matching the Definition of Done
        res.status(201).json({
            message: "Standup processed successfully",
            standupId: standupRecord._id,
            tasksAdded: createdTasks.length
        });

    } catch (error) {
        console.error("Database or Parsing Error:", error);
        // Error Handling: Database failure returns error
        res.status(500).json({ error: "Failed to process stand-up or save to database." });
    }
});

// --- Boot Up ---
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB successfully.");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error("Database Connection Failed:", err));