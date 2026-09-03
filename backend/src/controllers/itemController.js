import bcrypt from "bcryptjs";
import cloudinary from "../config/cloudinary.js";
import Item from "../models/Item.js";
import calculateMatchScore from "../utils/matchScore.js";

const safeItem = (item) => ({
  id: item._id,
  owner: item.owner,
  type: item.type,
  title: item.title,
  category: item.category,
  description: item.description,
  location: item.location,
  eventDate: item.eventDate,
  imageUrl: item.imageUrl || "",
  imagePublicId: item.imagePublicId || "",
  verificationQuestion: item.verificationQuestion,
  status: item.status,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const uploadImageToCloudinary = async (file) => {
  if (!file) {
    return { imageUrl: "", imagePublicId: "" };
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn("Cloudinary is not configured. Skipping image upload.");
    return { imageUrl: "", imagePublicId: "" };
  }

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "lost-and-found/items",
          resource_type: "image",
          transformation: [{ quality: "auto", fetch_format: "auto" }],
          timeout: 30000
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        }
      );

      // Add error handler to stream
      stream.on("error", (error) => {
        reject(new Error(`Stream error: ${error.message}`));
      });

      // Pipe file buffer to stream
      stream.end(file.buffer);
    });

    return {
      imageUrl: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    // If Cloudinary fails, continue without image rather than failing the entire request
    return { imageUrl: "", imagePublicId: "" };
  }
};

export const listItems = async (req, res, next) => {
  try {
    const { search = "", type, category, status } = req.query;
    const filters = {};

    if (type) filters.type = type;
    if (category) filters.category = new RegExp(category, "i");
    if (status) filters.status = status;
    if (search) {
      filters.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { category: new RegExp(search, "i") },
        { location: new RegExp(search, "i") }
      ];
    }

    const items = await Item.find(filters).sort({ createdAt: -1 }).populate("owner", "name");
    res.json(items.map(safeItem));
  } catch (error) {
    next(error);
  }
};

export const createItem = async (req, res, next) => {
  try {
    const { type, title, category, description, location, phoneNumber, eventDate, verificationQuestion, verificationAnswer } = req.body;

    if (!type || !title || !category || !description || !location || !phoneNumber || !eventDate || !verificationQuestion || !verificationAnswer) {
      return res.status(400).json({ message: "All required item fields must be provided" });
    }

    const uploaded = req.file ? await uploadImageToCloudinary(req.file) : { imageUrl: "", imagePublicId: "" };

    const verificationAnswerHash = await bcrypt.hash(String(verificationAnswer).trim().toLowerCase(), 10);
    const item = await Item.create({
      owner: req.user._id,
      type,
      title,
      category,
      description,
      location,
      phoneNumber,
      eventDate,
      imageUrl: uploaded.imageUrl,
      imagePublicId: uploaded.imagePublicId,
      verificationQuestion,
      verificationAnswerHash,
      status: "open"
    });

    const createdItem = await Item.findById(item._id).populate("owner", "name");
    res.status(201).json(safeItem(createdItem));
  } catch (error) {
    next(error);
  }
};

export const getItemById = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).populate("owner", "name");

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(safeItem(item));
  } catch (error) {
    next(error);
  }
};

export const getMatches = async (req, res, next) => {
  try {
    const sourceItem = await Item.findById(req.params.id);
    if (!sourceItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    const oppositeType = sourceItem.type === "lost" ? "found" : "lost";
    const candidates = await Item.find({ type: oppositeType, _id: { $ne: sourceItem._id } }).populate("owner", "name");

    const matches = candidates
      .map((candidate) => {
        const result = calculateMatchScore(sourceItem, candidate);
        return {
          ...safeItem(candidate),
          score: result.score,
          reasons: result.reasons
        };
      })
      .filter((candidate) => candidate.score >= 30)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8);

    res.json(matches);
  } catch (error) {
    next(error);
  }
};
