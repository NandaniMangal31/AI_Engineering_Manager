import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

// The SDK automatically picks up GEMINI_API_KEY from your .env file
const ai = new GoogleGenAI({});

// Define the exact schema the AI must follow
const taskSchema = {
	type: "array",
	description: "List of parsed tasks extracted from the stand-up.",
	items: {
		type: "object",
		properties: {
			owner: {
				type: "string",
				description:
					"Team member name. Default to 'Unknown' if not found.",
			},
			taskName: {
				type: "string",
				description:
					"The specific task. Explicitly ignore headings and attendance.",
			},
			status: {
				type: "string",
				description: "Status of the task. Defaults to 'In Progress'.",
			},
			priority: {
				type: "string",
				description:
					"Priority. Only extract 'High Priority', 'Critical', 'Production Today', or 'Urgent'.",
			},
		},
		required: ["owner", "taskName", "status"],
	},
};

export async function parseStandupMessage(rawText) {
	if (!rawText || rawText.trim() === "") {
		throw new Error("Invalid stand-up format");
	}

	try {
		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents: `Parse this stand-up message and extract the tasks:\n\n${rawText}`,
			config: {
				responseMimeType: "application/json",
				responseSchema: taskSchema,
			},
		});

		return JSON.parse(response.text);
	} catch (error) {
		console.error("Agent Parsing Error:", error);
		throw new Error("Failed to process stand-up data.");
	}
}
