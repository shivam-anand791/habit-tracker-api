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
  process.env.FRONTEND_URL
].filter(Boolean).map(url => url.replace(/\/$/, "")); // Remove trailing slash


app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps/curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("CORS Rejected for origin:", origin);
      console.log("Expected one of:", allowedOrigins);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// Add this to handle OPTIONS preflight for all routes
app.options("*", cors());

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

