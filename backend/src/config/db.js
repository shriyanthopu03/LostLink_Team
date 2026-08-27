import mongoose from "mongoose";

let connectionPromise;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing from the environment");
  }

  if (mongoose.connection.readyState === 1) return;

  connectionPromise ??= mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000
  });

  try {
    await connectionPromise;
    console.log("MongoDB connected");
  } catch (error) {
    connectionPromise = undefined;
    throw error;
  }
};

export default connectDB;