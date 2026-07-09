import express from "express";
import {
	installSlack,
	slackOAuthCallback,
	getChannels,
	getChannelMessages,
	joinChannel,
} from "../controllers/slack.controller.js";
import { processSlackData } from "../services/slack.service.js";
import { parseStandupMessage } from "../services/parserService.js";

const router = express.Router();

router.get("/install", installSlack);

router.get("/oauth/callback", slackOAuthCallback);

router.get("/channels", getChannels);

router.get("/channels/:channelId/messages", getChannelMessages);

router.post("/channels/:channelId/join", joinChannel);

router.post("/webhook", async (req, res) => {
	try {
		// Step 1: Clean and format the incoming Slack data
		const result = await processSlackData(req.body);

		console.log("Formatting complete. Sending to Gemini...");

		// Step 2: Pass the cleanly formatted text to your AI Agent
		const extractedTasks = await parseStandupMessage(result.aiReadyText);

		console.log("AI Parsing complete!");

		// Step 3: Return the final, structured JSON
		res.status(200).json({
			message: "Slack data processed and parsed by AI successfully.",
			tasks: extractedTasks,
		});
	} catch (error) {
		console.error("Webhook/AI Error:", error);
		res.status(500).json({
			error: "Failed to process data or connect to AI",
		});
	}
});

export default router;
