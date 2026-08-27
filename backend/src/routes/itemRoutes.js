import express from "express";
import bcrypt from "bcryptjs";
import Item from "../models/Item.js";
import authMiddleware from "../middleware/authMiddleware.js";
import calculateMatchScore from "../utils/matchScore.js";

const router = express.Router();

const publicItemFields = {
  owner: 1,
  type: 1,
  title: 1,
  category: 1,
  description: 1,
  location: 1,
  eventDate: 1,
  imageUrl: 1,
  verificationQuestion: 1,
  status: 1,
  createdAt: 1,
  updatedAt: 1
};

const safeItem = (item) => ({
  id: item._id,
  owner: item.owner,
  type: item.type,
  title: item.title,
  category: item.category,
  description: item.description,
  location: item.location,
  eventDate: item.eventDate,
  imageUrl: item.imageUrl,
  verificationQuestion: item.verificationQuestion,
  status: item.status,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

router.get("/", async (req, res, next) => {
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
});

router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const {
      type,
      title,
      category,
      description,
      location,
      eventDate,
      imageUrl = "",
      verificationQuestion,
      verificationAnswer
    } = req.body;

    if (!type || !title || !category || !description || !location || !eventDate || !verificationQuestion || !verificationAnswer) {
      return res.status(400).json({ message: "All required item fields must be provided" });
    }

    const verificationAnswerHash = await bcrypt.hash(String(verificationAnswer).trim().toLowerCase(), 10);

    const item = await Item.create({
      owner: req.user._id,
      type,
      title,
      category,
      description,
      location,
      eventDate,
      imageUrl,
      verificationQuestion,
      verificationAnswerHash
    });

    const createdItem = await Item.findById(item._id).populate("owner", "name");
    res.status(201).json(safeItem(createdItem));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).populate("owner", "name");

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(safeItem(item));
  } catch (error) {
    next(error);
  }
});

router.get("/:id/matches", async (req, res, next) => {
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
});

export default router;