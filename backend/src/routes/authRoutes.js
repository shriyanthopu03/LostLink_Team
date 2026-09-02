import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const getJwtSecret = () => process.env.JWT_SECRET || "LostLink_2026_default_secret";

const getAdminEmail = () => (process.env.ADMIN_EMAIL || "admin@lostlink.com").toLowerCase().trim();
const getAdminPassword = () => process.env.ADMIN_PASSWORD || "admin123";

const createToken = (userId, role = "user") =>
  jwt.sign({ userId, id: userId, role }, getJwtSecret(), { expiresIn: "7d" });

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : "";

    if (role === "admin" || normalizedEmail === getAdminEmail()) {
      return res.status(403).json({
        message: "Admin registration is not allowed. Please log in using Admin credentials."
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "user"
    });

    res.status(201).json({
      token: createToken(user._id, "user"),
      user: { id: user._id, name: user.name, email: user.email, role: "user" }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminEmail = getAdminEmail();
    const adminPassword = getAdminPassword();

    // Fixed Admin Authentication check
    if (role === "admin" || normalizedEmail === adminEmail) {
      if (normalizedEmail === adminEmail && password === adminPassword) {
        const token = jwt.sign(
          { userId: "admin-fixed-id", id: "admin-fixed-id", role: "admin", email: adminEmail },
          getJwtSecret(),
          { expiresIn: "7d" }
        );

        return res.json({
          token,
          user: {
            id: "admin-fixed-id",
            name: process.env.ADMIN_NAME || "System Administrator",
            email: adminEmail,
            role: "admin"
          }
        });
      } else {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
    }

    // Regular User Authentication check
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid user credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid user credentials" });
    }

    const userRole = user.role || "user";
    res.json({
      token: createToken(user._id, userRole),
      user: { id: user._id, name: user.name, email: user.email, role: userRole }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  res.json({
    user: {
      id: req.user._id || req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || "user"
    }
  });
});

export default router;