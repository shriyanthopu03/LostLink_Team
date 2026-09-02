import express from "express";
import User from "../models/User.js";
import Item from "../models/Item.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// Apply admin protection middleware to all admin endpoints
router.use(adminMiddleware);

// GET /api/admin/stats - Overview statistics for admin dashboard
router.get("/stats", async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalItems = await Item.countDocuments();
    const lostItems = await Item.countDocuments({ type: "lost" });
    const foundItems = await Item.countDocuments({ type: "found" });
    const pendingClaims = await Item.countDocuments({ status: "claim_pending" });
    const verifiedItems = await Item.countDocuments({ status: "verified" });
    const returnedItems = await Item.countDocuments({ status: "returned" });

    res.json({
      usersCount: totalUsers,
      itemsCount: totalItems,
      lostItemsCount: lostItems,
      foundItemsCount: foundItems,
      pendingClaimsCount: pendingClaims,
      verifiedItemsCount: verifiedItems,
      returnedItemsCount: returnedItems,
      adminInfo: {
        name: req.user.name,
        email: req.user.email,
        loginTime: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users - List all registered users
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/items - List all items for admin oversight
router.get("/items", async (req, res, next) => {
  try {
    const items = await Item.find().populate("owner", "name email").sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/items/:id - Admin moderation: delete item
router.delete("/items/:id", async (req, res, next) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json({ message: "Item deleted successfully by Admin", itemId: req.params.id });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/items/:id/status - Admin status update
router.patch("/items/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["open", "match_suggested", "claim_pending", "verified", "returned", "closed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("owner", "name email");

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: `Status updated to ${status}`, item });
  } catch (error) {
    next(error);
  }
});

export default router;
