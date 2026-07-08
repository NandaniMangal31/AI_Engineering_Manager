import Standup from '../models/Standup.js';
import Member from '../models/Member.js';
import Task from '../models/Task.js';
import { parseStandupMessage } from '../services/parserService.js';

export const processStandup = async (req, res) => {
    try {
        const { rawText } = req.body;

        const standupRecord = await Standup.create({ originalText: rawText });
        const parsedTasks = await parseStandupMessage(rawText);

        if (!parsedTasks || parsedTasks.length === 0) {
            return res.status(400).json({ error: "Invalid stand-up: No tasks could be extracted." });
        }

        const createdTasks = [];

        for (const pt of parsedTasks) {
            let memberName = pt.owner;
            if (!memberName || memberName.trim() === '') {
                memberName = 'Unknown';
            }
            
            let member = await Member.findOne({ name: memberName });
            if (!member) {
                member = await Member.create({ name: memberName });
            }

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

        res.status(201).json({
            message: "Standup processed successfully",
            standupId: standupRecord._id,
            tasksAdded: createdTasks.length
        });

    } catch (error) {
        console.error("Database or Parsing Error:", error);
        res.status(500).json({ error: "Failed to process stand-up or save to database." });
    }
};