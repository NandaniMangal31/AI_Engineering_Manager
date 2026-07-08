import dotenv from "dotenv";
import slackClient from "./src/services/slack.service.js";

dotenv.config();

try {
    const response = await slackClient.auth.test();

    console.log(response);
} catch (error) {
    console.error(error.data || error.message);
}