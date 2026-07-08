import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import{ connectDB} from "./config/db.js";
import slackRoutes from "./routes/slack.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 8000;

app.use("/api/slack", slackRoutes);


connectDB()
.then(() => {
console.log("Connected to MongoDB");
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
})
.catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
});

