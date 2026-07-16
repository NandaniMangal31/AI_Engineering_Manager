import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { updateTask } from "../../utils/updateTask.util.js";

import {
    toolSuccess,
    toolError,
    sanitizeTask,
} from "./base.tool.js";

export const updateTaskTool = createTool({
    name: "updateTask",

    description:
        "Update an existing engineering task after reasoning over standup discussions.",

    parameters: z.object({
        taskId: z.string(),

        updates: z.record(z.any()),
    }),

    async handler({ taskId, updates }) {
        try {
            const task = await updateTask(taskId, updates);

            return toolSuccess(
                "Task updated successfully.",
                sanitizeTask(task)
            );
        } catch (error) {
            return toolError(
                "Unable to update task.",
                error
            );
        }
    },
});