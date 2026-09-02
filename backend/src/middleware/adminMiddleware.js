import authMiddleware from "./authMiddleware.js";

const adminMiddleware = [
  authMiddleware,
  (req, res, next) => {
    if (req.user && req.user.role === "admin") {
      return next();
    }
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
];

export default adminMiddleware;
