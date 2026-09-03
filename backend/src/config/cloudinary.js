import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Ensure env vars are loaded when this config is imported
dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.warn("Cloudinary is not configured. Image uploads will fail until all CLOUDINARY_* env values are set.");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export default cloudinary;
