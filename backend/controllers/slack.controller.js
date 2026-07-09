import slackClient from "../services/slack.service.js";

export const getChannels = async (req, res) => {
    try {
        const response = await slackClient.conversations.list({
            types: "public_channel,private_channel"
        });

        return res.json(response.channels);

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};