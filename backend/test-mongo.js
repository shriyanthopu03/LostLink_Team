import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
console.log("TEST: MONGO_URI present:", Boolean(uri));

(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("TEST: MongoDB connected");
    process.exit(0);
  } catch (err) {
    console.error("TEST: Mongo connection failed:", err.message);
    process.exit(1);
  }
})();
