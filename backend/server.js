import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import standupRoutes from './routes/standupRoutes.js';

dotenv.config();

const app = express();
app.use(express.json());

// Mount the routes
app.use('/api/standup', standupRoutes);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB successfully.");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error("Database Connection Failed:", err));