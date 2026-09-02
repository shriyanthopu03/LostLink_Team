import jwt from "jsonwebtoken";
import User from "../models/User.js";

const getJwtSecret = () => process.env.JWT_SECRET || "LostLink_2026_default_secret";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, getJwtSecret());
    const userId = payload.userId || payload.id;

    if (!userId) {
      return res.status(401).json({ message: "Token invalid" });
    }

    const user = await User.findById(userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalid" });
  }
};

export default authMiddleware;