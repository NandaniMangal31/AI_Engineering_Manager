import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import inngestRouter from "./routes/inngest.routes.js";
import taskRoutes from "./routes/task.routes.js";
import memberRoutes from "./routes/member.routes.js";
import teamRoutes from "./routes/team.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import standupRoutes from "./routes/standup.routes.js";
import slackRoutes from "./routes/slack.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
dotenv.config();
const app = express();
app.use(express.json());
app.use(
	cors({
		origin: "http://localhost:4200",
	}),
);

app.use("/api/tasks", taskRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/standups", standupRoutes);
app.use("/api/slack", slackRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inngest", inngestRouter);

const PORT = process.env.PORT || 5000;

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("Mongo connected"));

console.log("INNGEST_DEV =", process.env.INNGEST_DEV);
app.listen(PORT, () =>
	console.log(`Backend running on http://localhost:${PORT}`),
);