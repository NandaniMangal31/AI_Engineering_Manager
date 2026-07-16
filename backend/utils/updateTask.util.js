// utils/updateTask.util.js

import Task from "../models/Task.js";

/**
 * Updates an existing task.
 * The AI agent decides WHAT should be updated.
 * This utility simply persists the changes.
 */
export const updateTask = async (taskId, updates = {}) => {
    if (!taskId) {
        throw new Error("Task ID is required.");
    }

    // Never allow _id to be modified
    delete updates._id;

    const task = await Task.findById(taskId);

    if (!task) {
        throw new Error("Task not found.");
    }

    // Apply only provided fields
    Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
            task[key] = value;
        }
    });

    await task.save();

    return task;
};