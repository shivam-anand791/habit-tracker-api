import express from "express";
import Month from "../models/Month.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE or UPDATE month (protected)
router.post("/save", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Explicitly pick only expected fields — never spread req.body directly
    const { year, month, monthLength, title, habits } = req.body;
    const payload = { year, month, monthLength, title, habits, userId };

    const existing = await Month.findOne({ userId, year, month });

    if (existing) {
      const updated = await Month.findByIdAndUpdate(
        existing._id,
        payload,
        { new: true }
      );
      res.json(updated);
    } else {
      const created = await Month.create(payload);
      res.json(created);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET specific month (protected)
router.get("/:year/:month", authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.params;

    const data = await Month.findOne({
      userId: req.userId,
      year,
      month
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all months for user (protected)
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const data = await Month.find({ userId: req.userId }).sort({ year: -1, month: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all months for user (protected)
router.delete("/all", authMiddleware, async (req, res) => {
  try {
    await Month.deleteMany({ userId: req.userId });
    res.json({ message: "All user history deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
