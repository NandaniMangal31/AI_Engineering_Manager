import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { createActivity } from "../../utils/createActivity.util.js";

import {
    toolSuccess,
    toolError,
    sanitizeActivity,
} from "./base.tool.js";

export const createActivityTool = createTool({
    name: "createActivity",

    description:
        "Create an activity entry whenever the AI performs an important task action.",

    parameters: z.object({
        taskId: z.string(),

        memberId: z.string().optional(),

        type: z.string(),

        title: z.string(),

        description: z.string().optional(),
    }),

    async handler(input) {
        try {
            const activity = await createActivity(input);

            return toolSuccess(
                "Activity created successfully.",
                sanitizeActivity(activity)
            );
        } catch (error) {
            return toolError(
                "Unable to create activity.",
                error
            );
        }
    },
});