import express from "express";
import {
    installSlack,
    slackOAuthCallback,
     getChannels,
     getChannelMessages,
     joinChannel
} from "../controller/slack.controller.js";

const router = express.Router();

router.get("/install", installSlack);

router.get("/oauth/callback", slackOAuthCallback);

router.get("/channels", getChannels);

router.get("/channels/:channelId/messages", getChannelMessages);

router.post("/channels/:channelId/join", joinChannel);

export default router;