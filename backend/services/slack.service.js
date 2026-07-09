import { WebClient } from "@slack/web-api";
import SlackIntegration from "../models/slackIntegration.model.js";

import Team from "../models/Team.js";
import Member from "../models/Member.js";
import Standup from "../models/standup.js";
import StandupMessage from "../models/standupMessage.js";

export const getSlackClient = async () => {
	const integration = await SlackIntegration.findOne({
		connected: true,
	});

	if (!integration) {
		throw new Error("Slack is not connected.");
	}

	return new WebClient(integration.accessToken);
};

export async function processSlackData(slackPayload) {
	try {
		const { channel, messages } = slackPayload;

		let team = await Team.findOneAndUpdate(
			{ slackChannelId: channel.channelId }, // Search criteria
			{
				name: channel.channelName,
				slackChannelId: channel.channelId,
				slackChannelName: channel.channelName, // <-- Storing it right here!
				isSlackConnected: true,
			},
			{ new: true, upsert: true }, // 'upsert: true' creates it if missing, 'new: true' returns the document
		);

		const compiledAiText = [];

		// 2. Process each message and save to Database
		for (const msg of messages) {
			// Find or create the member
			let member = await Member.findOne({ slackUserId: msg.slackUserId });

			if (!member) {
				// Handle the null email from Slack payload to prevent MongoDB validation errors
				const safeEmail =
					msg.email || `${msg.slackUserId}@slack.placeholder`;

				member = await Member.create({
					name: msg.userName || "Unknown User",
					email: safeEmail,
					slackUserId: msg.slackUserId,
					role: "Developer",
					teamId: team._id,
					isActive: true,
				});
			}

			// Create the Standup wrapper
			const currentStandup = await Standup.create({
				submittedBy: member._id,
				source: "Slack",
				parsingStatus: "Pending",
				message: msg.rawMessage,
				parsed: false,
			});

			// Create the StandupMessage child record
			await StandupMessage.create({
				standupId: currentStandup._id,
				memberId: member._id,
				rawMessage: msg.rawMessage,
				parsed: false,
			});

			// Append to our AI formatting array
			compiledAiText.push(
				`Member: ${member.name}\nMessage: ${msg.rawMessage}\n---`,
			);
		}

		// 3. Format the data for the AI
		// This joins all the messages into a clean, readable multiline string
		const aiFormattedString = compiledAiText.join("\n");

		return {
			success: true,
			processedCount: messages.length,
			aiReadyText: aiFormattedString,
		};
	} catch (error) {
		console.error("Error processing Slack data:", error);
		throw error;
	}
}
