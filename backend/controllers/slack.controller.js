import { getSlackClient, processSlackData } from "../services/slack.service.js";
import { parseStandupMessage } from "../services/parserService.js"; 
import Task from "../models/Task.js";
import Member from "../models/Member.js";
import Standup from "../models/Standup.js";

export const getChannelMessages = async (req, res) => {
    try {
        const { channelId } = req.params;
        
        console.log("--- 🚀 NEW REQUEST STARTED ---");

        // ====================================================================
        // STEP 1: YOUR EXISTING SLACK FETCH LOGIC GOES HERE
        // (Keep however you were fetching the data from Slack previously)
        // ====================================================================
        const client = await getSlackClient();
        // ... (your code to get history/channels) ...

        // Make sure the final JSON you built is assigned to this variable:
        const slackPayload = {
            // This should be the exact object you showed me earlier containing:
            // success, workspace, channel, metadata, and messages[]
        };

        if (!slackPayload.messages || slackPayload.messages.length === 0) {
            console.log("❌ ERROR: slackPayload is empty or undefined!");
            return res.status(400).json({ error: "No messages found to process." });
        }

        // ====================================================================
        // STEP 2: DISTRIBUTE TO TEAMS, MEMBERS, AND STANDUPS COLLECTIONS
        // ====================================================================
        console.log("📦 1. Attempting to save Teams and Members...");
        const result = await processSlackData(slackPayload);
        console.log("✅ SUCCESS: Saved to Teams, Members, and Standup collections!");

        // ====================================================================
        // STEP 3: GEMINI AI PARSING
        // ====================================================================
        console.log("🧠 2. Sending formatted text to Gemini...");
        const extractedTasks = await parseStandupMessage(result.aiReadyText);
        console.log(`✅ SUCCESS: Gemini parsed ${extractedTasks.length} tasks!`);

        // ====================================================================
        // STEP 4: SAVE TO TASKS COLLECTION
        // ====================================================================
        console.log("📝 3. Attempting to save to Tasks collection...");
        const slackChannelName = slackPayload.channel?.channelName || "Unknown Channel";
        const savedTasks = [];

        for (const pt of extractedTasks) {
            const member = await Member.findOne({ name: pt.owner });
            
            if (member) {
                const latestStandup = await Standup.findOne({ submittedBy: member._id }).sort({ createdAt: -1 });

                let mappedStatus = 'PROCESSING';
                const aiStatus = (pt.status || '').toLowerCase();
                if (aiStatus.includes('complet') || aiStatus.includes('done')) mappedStatus = 'COMPLETED';
                if (aiStatus.includes('block') || aiStatus.includes('wait')) mappedStatus = 'BLOCKED';

                let mappedPriority = 'Medium';
                const aiPriority = (pt.priority || '').toLowerCase();
                if (aiPriority.includes('high') || aiPriority.includes('urgent')) mappedPriority = 'High';
                if (aiPriority.includes('critical')) mappedPriority = 'Critical';
                if (aiPriority.includes('low')) mappedPriority = 'Low';

                const newTask = await Task.create({
                    memberId: member._id,
                    standupId: latestStandup ? latestStandup._id : null,
                    title: pt.taskName,
                    status: mappedStatus,
                    priority: mappedPriority,
                    workflowStage: 'DEVELOPMENT',
                    channelName: slackChannelName 
                });

                savedTasks.push(newTask);
            } else {
                console.log(`⚠️ Warning: Could not find Member matching name: ${pt.owner}. Skipping this task.`);
            }
        }
        
        console.log(`✅ SUCCESS: Saved ${savedTasks.length} tasks to the database!`);
        console.log("--- 🎉 PIPELINE COMPLETE ---");

        res.status(200).json({
            success: true,
            message: "Pipeline executed successfully.",
            tasksSaved: savedTasks.length,
            tasks: savedTasks
        });

    } catch (error) {
        console.log("❌ FATAL CRASH IN PIPELINE ❌");
        console.error(error); // This prints the EXACT reason for the failure
        res.status(500).json({ error: "Failed to process data. Check the terminal for details." });
    }
};