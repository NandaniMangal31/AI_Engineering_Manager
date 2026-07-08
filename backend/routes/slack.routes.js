import express from "express";
import { getChannels } from "../controllers/slack.controller.js";

const router = express.Router();

router.get("/channels", getChannels);

export default router;