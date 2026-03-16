import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import monthRoutes from "./routes/monthRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

// Configure CORS for split deployment
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://goal-tracker-frontendapp.vercel.app"
].map(o => o.toLowerCase().replace(/\/$/, ""));

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.toLowerCase().replace(/\/$/, ""));
}

// Global CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.toLowerCase().replace(/\/$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.warn(`CORS Rejected: [${origin}] - Not in [${allowedOrigins.join(", ")}]`);
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));





app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("DB Error:", err));

app.get("/", (req, res) => {
  res.send("Habit Tracker API running");
});

app.use("/api/months", monthRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

