import mongoose from "mongoose";
import Member from "../models/Member.js";
import Task from "../models/Task.js";
import { parseStandupMessage } from "../services/parserService.js";

// A simple schema for stand-ups pasted manually from the dashboard
const manualStandupSchema = new mongoose.Schema({
    originalText: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const ManualStandup = mongoose.models.ManualStandup || mongoose.model("ManualStandup", manualStandupSchema);

export const processStandup = async (req, res) => {
    try {
        const { rawText } = req.body;

        // Step 1: Store original message
        const standupRecord = await ManualStandup.create({ originalText: rawText });

        // Step 2: Parser runs
        const parsedTasks = await parseStandupMessage(rawText);

        if (!parsedTasks || parsedTasks.length === 0) {
            return res.status(400).json({ error: "Invalid stand-up: No tasks could be extracted." });
        }

        const createdTasks = [];

        // Step 3: Process tasks and create members dynamically
        for (const pt of parsedTasks) {
            let memberName = pt.owner;
            if (!memberName || memberName.trim() === "") {
                memberName = "Unknown";
            }

            let member = await Member.findOne({ name: memberName });
            if (!member) {
                // Fulfilling your new Member schema requirements
                member = await Member.create({ 
                    name: memberName,
                    email: `${memberName.toLowerCase()}@placeholder.slack`,
                    role: 'Developer',
                    isActive: true
                });
            }

            if (pt.taskName && pt.taskName.trim() !== "") {
                const task = await Task.create({
                    memberId: member._id,
                    standupId: standupRecord._id, // Linking to the manual standup
                    title: pt.taskName,
                    status: pt.status === "Completed" ? "COMPLETED" : "PROCESSING",
                    priority: pt.priority || "Medium",
                    workflowStage: "DEVELOPMENT"
                });
                createdTasks.push(task);
            }
        }

        res.status(201).json({
            message: "Standup processed successfully",
            standupId: standupRecord._id,
            tasksAdded: createdTasks.length,
        });

    } catch (error) {
        console.error("Parsing Error:", error);
        res.status(500).json({ error: "Failed to process stand-up." });
    }
};