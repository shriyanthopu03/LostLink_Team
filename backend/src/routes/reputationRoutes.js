import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/reputation/user/:id - Fetch reputation profile for any user
router.get("/user/:id", authMiddleware, async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    let user;
    if (targetUserId === "admin-fixed-id" || targetUserId === "me" && req.user.role === "admin") {
      return res.json({
        id: "admin-fixed-id",
        name: req.user.name,
        email: req.user.email,
        trustScore: 100,
        averageRating: 5.0,
        trustBadge: "Community Champion",
        isSuspicious: false,
        verifiedReportsCount: 25,
        successfulReturnsCount: 15,
        verifiedClaimsCount: 10,
        fraudReportsCount: 0,
        ratings: [
          {
            _id: "r-admin-1",
            raterName: "System Verification",
            score: 5,
            comment: "Official System Administrator Account.",
            createdAt: new Date().toISOString()
          }
        ]
      });
    }

    user = await User.findById(targetUserId).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }

    user.recalculateTrust();
    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      trustScore: user.trustScore || 75,
      averageRating: user.averageRating || 5.0,
      trustBadge: user.trustBadge || "Verified Member",
      isSuspicious: Boolean(user.isSuspicious),
      suspiciousReason: user.suspiciousReason || "",
      verifiedReportsCount: user.verifiedReportsCount || 0,
      successfulReturnsCount: user.successfulReturnsCount || 0,
      verifiedClaimsCount: user.verifiedClaimsCount || 0,
      fraudReportsCount: user.fraudReportsCount || 0,
      ratings: user.ratings || [],
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reputation/rate - Rate a community user
router.post("/rate", authMiddleware, async (req, res, next) => {
  try {
    const { targetUserId, score, comment } = req.body;

    if (!targetUserId || !score) {
      return res.status(400).json({ message: "Target user ID and rating score are required." });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 1 || numericScore > 5) {
      return res.status(400).json({ message: "Rating score must be between 1 and 5." });
    }

    if (String(req.user._id) === String(targetUserId)) {
      return res.status(400).json({ message: "You cannot rate your own profile." });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found." });
    }

    // Check if rater already rated
    const existingIndex = targetUser.ratings.findIndex(
      (r) => String(r.raterId) === String(req.user._id)
    );

    if (existingIndex >= 0) {
      targetUser.ratings[existingIndex].score = numericScore;
      targetUser.ratings[existingIndex].comment = comment || "";
      targetUser.ratings[existingIndex].createdAt = new Date();
    } else {
      targetUser.ratings.push({
        raterId: req.user._id,
        raterName: req.user.name,
        score: numericScore,
        comment: comment || "",
        createdAt: new Date()
      });
    }

    targetUser.recalculateTrust();
    await targetUser.save();

    res.json({
      message: "Rating submitted successfully.",
      trustScore: targetUser.trustScore,
      averageRating: targetUser.averageRating,
      trustBadge: targetUser.trustBadge
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reputation/report-fraud - Report fraud or suspicious activity
router.post("/report-fraud", authMiddleware, async (req, res, next) => {
  try {
    const { targetUserId, reason } = req.body;

    if (!targetUserId || !reason) {
      return res.status(400).json({ message: "Target user ID and detailed reason are required." });
    }

    if (String(req.user._id) === String(targetUserId)) {
      return res.status(400).json({ message: "You cannot report your own profile." });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found." });
    }

    // Record fraud report
    targetUser.fraudReports.push({
      reporterId: req.user._id,
      reporterName: req.user.name,
      reason: reason.trim(),
      createdAt: new Date()
    });

    targetUser.fraudReportsCount = targetUser.fraudReports.length;
    targetUser.recalculateTrust();
    await targetUser.save();

    res.json({
      message: "Fraud report submitted. User reputation recalculated.",
      trustScore: targetUser.trustScore,
      isSuspicious: targetUser.isSuspicious,
      trustBadge: targetUser.trustBadge
    });
  } catch (error) {
    next(error);
  }
});

export default router;
