import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { createTask } from "../../utils/createTask.util.js";

import {
    toolSuccess,
    toolError,
    sanitizeTask,
} from "./base.tool.js";

export const createTaskTool = createTool({
    name: "createTask",

    description:
        "Create a brand new engineering task when no suitable existing task is found.",

    parameters: z.object({
        title: z.string(),

        description: z.string(),

        memberId: z.string(),

        standupId: z.string().optional(),

        priority: z.string().optional(),

        workflowStage: z.string().optional(),

        deadline: z.string().nullable().optional(),
    }),

    async handler(input) {
        try {
            const task = await createTask(input);

            return toolSuccess(
                "Task created successfully.",
                sanitizeTask(task)
            );
        } catch (error) {
            return toolError(
                "Unable to create task.",
                error
            );
        }
    },
});