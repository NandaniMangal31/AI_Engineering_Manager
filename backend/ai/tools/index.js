import { searchTaskContextTool } from "./searchTaskContext.tool.js";
import { getTaskHistoryTool } from "./getTaskHistory.tool.js";
import { createTaskTool } from "./createTask.tool.js";
import { updateTaskTool } from "./updateTask.tool.js";
import { createActivityTool } from "./createActivity.tool.js";

export const engineeringManagerTools = [
    searchTaskContextTool,
    getTaskHistoryTool,
    createTaskTool,
    updateTaskTool,
    createActivityTool,
];

export {
    searchTaskContextTool,
    getTaskHistoryTool,
    createTaskTool,
    updateTaskTool,
    createActivityTool,
};