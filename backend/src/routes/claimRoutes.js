import express from "express";
import bcrypt from "bcryptjs";
import Claim from "../models/Claim.js";
import Item from "../models/Item.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:itemId", authMiddleware, async (req, res, next) => {
  try {
    const { answer } = req.body;

    if (req.params.itemId.startsWith("demo-")) {
      return res.status(400).json({
        message: "Cannot claim demo items. Please post or select a real lost/found item to claim.",
        demo: true
      });
    }

    const item = await Item.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (!answer) {
      return res.status(400).json({ message: "Verification answer is required" });
    }

    const claim = await Claim.create({
      item: item._id,
      claimant: req.user._id,
      answer: String(answer).trim(),
      status: "pending"
    });

    const verified = await bcrypt.compare(String(answer).trim().toLowerCase(), item.verificationAnswerHash);
    claim.status = verified ? "verified" : "failed";
    claim.verifiedAt = verified ? new Date() : undefined;
    await claim.save();

    if (!verified) {
      item.status = "claim_pending";
      await item.save();
    } else {
      await Item.findByIdAndDelete(item._id);
    }

    return res.status(201).json({
      claim: {
        id: claim._id,
        item: claim.item,
        claimant: claim.claimant,
        status: claim.status,
        verifiedAt: claim.verifiedAt,
        createdAt: claim.createdAt
      },
      itemStatus: verified ? "deleted" : item.status,
      phoneNumber: verified ? item.phoneNumber : undefined,
      verified
    });
  } catch (error) {
    next(error);
  }
});

router.get("/item/:itemId", authMiddleware, async (req, res, next) => {
  try {
    const claims = await Claim.find({ item: req.params.itemId })
      .sort({ createdAt: -1 })
      .populate("claimant", "name email");

    return res.json(claims);
  } catch (error) {
    next(error);
  }
});

router.patch("/:claimId/complete", authMiddleware, async (req, res, next) => {
  try {
    const { status = "returned" } = req.body;
    const claim = await Claim.findById(req.params.claimId).populate("item");

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    const item = await Item.findById(claim.item._id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const ownsItem = String(item.owner) === String(req.user._id);
    const canManage = ownsItem || req.user.role === "admin";
    if (!canManage) {
      return res.status(403).json({ message: "Not allowed" });
    }

    item.status = status;
    claim.status = status === "returned" ? "verified" : claim.status;
    await item.save();
    await claim.save();

    return res.json({
      claimId: claim._id,
      itemId: item._id,
      itemStatus: item.status,
      claimStatus: claim.status
    });
  } catch (error) {
    next(error);
  }
});

export default router;
