import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

dotenv.config();
const MONGODB_URI=process.env.MONGODB_URI;
const DB_NAME=process.env.DB_NAME;
 

export const connectDB=async()=>{
    try{
         mongoose.connection.on('connected',()=>{
            console.log("Mongoose connected to DB ");
        });
        const connectionInstance=await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
       
    }
    catch(error)
    {
        console.log("Error connecting to DB", error);
    }
}