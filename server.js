import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import monthRoutes from "./routes/monthRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

// Configure CORS for split deployment
const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : null;

const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  frontendUrl
].filter(Boolean);



// CORS middleware handles preflight automatically
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps/curl)
    if (!origin) return callback(null, true);
    
    // Exact match check
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS Rejected: Origin [${origin}] not in [${allowedOrigins.join(", ")}]`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
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

