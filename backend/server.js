import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import itemRoutes from "./src/routes/itemRoutes.js";
import claimRoutes from "./src/routes/claimRoutes.js";

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "lostlink-backend" });
});

app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Mongo connection failed:", error.message);
    res.status(503).json({ message: "Database unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || "Server error";
  console.error("Unhandled server error:", message);
  res.status(status).json({ message });
});

export default app;

connectDB()
  .then(() => {
    if (process.env.NODE_ENV !== "production") {
      app.listen(port, () => {
        console.log(`LostLink API running on port ${port}`);
      });
    }
  })
  .catch((error) => {
    console.error("Mongo connection failed:", error.message);
    if (process.env.NODE_ENV !== "production") process.exit(1);
  });