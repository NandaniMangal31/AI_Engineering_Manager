import mongoose from "mongoose";

const slackIntegrationSchema = new mongoose.Schema(
    {
        accessToken: {
            type: String,
            required: true,
        },

        botUserId: {
            type: String,
            required: true,
        },

        teamId: {
            type: String,
            required: true,
        },

        teamName: {
            type: String,
            required: true,
        },

        scope: {
            type: String,
            required: true,
        },

        connected: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("SlackIntegration", slackIntegrationSchema);