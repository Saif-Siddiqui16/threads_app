import mongoose from "mongoose";

let isConnected = false;

export const connectToDB = async () => {
    mongoose.set("strictQuery", true);

    if (!process.env.MONGODB_URL) return console.log("Url is missing");

    if (isConnected) {
        console.log("MongoDB connection already established");
        return;
    }
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        isConnected = true;
        console.log("MONGODB connected")

    } catch (error) {
        console.log(error);
    }
}