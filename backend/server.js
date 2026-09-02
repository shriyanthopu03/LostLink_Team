import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import itemRoutes from "./src/routes/itemRoutes.js";
import claimRoutes from "./src/routes/claimRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL?.replace(/\/$/, "");
const allowedOrigins = new Set([
  clientUrl,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://lost-link-team-frontend.vercel.app",
  "https://lost-link-team-backend.vercel.app"
].filter(Boolean));

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api/health", async (_req, res) => {
  try {
    await connectDB();
    res.json({ ok: true, service: "lostlink-backend", database: "connected" });
  } catch (error) {
    res.status(503).json({ ok: false, service: "lostlink-backend", message: "Database unavailable" });
  }
});

app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Mongo connection failed before route handling:", error.message);
    return res.status(503).json({ message: "Database unavailable. Please try again later." });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || "Server error";

  if (
    message.includes("Mongo") ||
    message.includes("mongo") ||
    message.includes("MongoDB") ||
    message.includes("connection") ||
    message.includes("ECONNREFUSED") ||
    message.includes("MONGO_URI")
  ) {
    return res.status(503).json({ message: "Database unavailable. Please try again later." });
  }

  console.error("Unhandled server error:", message);
  res.status(status).json({ message });
});

connectDB()
  .then(() => {
    console.log("MongoDB connected successfully");
    if (process.env.NODE_ENV !== "production") {
      app.listen(port, () => {
        console.log(`LostLink API running on port ${port}`);
      });
    }
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error.message);
    console.error("Please check your MONGO_URI environment variable");
    if (process.env.NODE_ENV !== "production") process.exit(1);
  });

export default app;