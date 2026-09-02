import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";
import { createItem, getItemById, getMatches, listItems } from "../controllers/itemController.js";

const router = express.Router();

router.get("/", listItems);
router.post("/", authMiddleware, upload.single("image"), createItem);
router.get("/:id", getItemById);
router.get("/:id/matches", getMatches);

export default router;