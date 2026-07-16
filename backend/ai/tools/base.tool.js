export const toolSuccess = (message, data = null) => ({
    success: true,
    message,
    data,
});

export const toolError = (message, error = null) => ({
    success: false,
    message,
    error: error?.message ?? error,
});

export const sanitizeTask = (task) => {
    if (!task) return null;

    return {
        id: task._id?.toString() ?? task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        workflowStage: task.workflowStage,
        assignedTo: task.assignedTo,
        deadline: task.deadline,
    };
};

export const sanitizeActivity = (activity) => {
    if (!activity) return null;

    return {
        id: activity._id?.toString() ?? activity.id,
        taskId: activity.taskId,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        createdAt: activity.createdAt,
    };
};

