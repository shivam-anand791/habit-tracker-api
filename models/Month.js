import mongoose from "mongoose";

const HabitSchema = new mongoose.Schema({
  habitId: String,    // client-side stable ID
  name: String,
  category: { type: String, default: "General" },
  goal: Number,
  checks: [Boolean]
});

const MonthSchema = new mongoose.Schema({
  userId: String,         // for now just a simple string
  year: Number,
  month: Number,
  monthLength: Number,
  title: String,
  habits: [HabitSchema]
}, { timestamps: true });

export default mongoose.model("Month", MonthSchema);
