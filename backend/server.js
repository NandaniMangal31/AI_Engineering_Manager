import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import Database Config
import connectDB from "./config/db.js";

// Import Routes
import slackRoutes from "./routes/slack.routes.js";
import standupRoutes from "./routes/standupRoutes.js"; // Preserved from your current code

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize Database Connection
connectDB();

// Mount Routes
app.use("/api/slack", slackRoutes);
app.use("/api/standup", standupRoutes);

// Health Check Route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "AI Engineering Manager API"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});