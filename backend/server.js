import express from "express";
import dotenv from "dotenv";
import slackRoutes from "./routes/slack.routes.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/api/slack", slackRoutes);

connectDB()
.then(() => {
    console.log("Connected to DB");
})
.catch((error) => {
    console.log("Error connecting to DB", error);
}); 

