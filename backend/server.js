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

// Debug: show working directory and whether MONGO_URI was loaded
console.log("Server CWD:", process.cwd());
console.log("MONGO_URI present:", Boolean(process.env.MONGO_URI));

const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL?.replace(/\/$/, "");

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.replace(/\/$/, "") === clientUrl) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
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
  res.status(status).json({ message: err.message || "Server error" });
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
    console.error("Mongo connection failed:", error?.message || error);
    console.error(error?.stack || "no stack");
    if (process.env.NODE_ENV !== "production") {
      console.warn("Starting server without DB connection (development mode)");
      app.listen(port, () => {
        console.log(`LostLink API running on port ${port} (no DB)`);
      });
    } else {
      process.exit(1);
    }
  });