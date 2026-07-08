import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";

dotenv.config();

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

export default slackClient;