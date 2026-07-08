import { WebClient } from "@slack/web-api";
import SlackIntegration from "../models/slackIntegration.model.js";

export const getSlackClient = async () => {

    const integration = await SlackIntegration.findOne({
        connected: true
    });

    if (!integration) {
        throw new Error("Slack is not connected.");
    }

    return new WebClient(integration.accessToken);
};