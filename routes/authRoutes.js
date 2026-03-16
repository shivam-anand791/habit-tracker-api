import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// -------- EMAIL TRANSPORTER --------
function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}



// -------- REGISTER --------
router.post("/register",
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { name, email, password } = req.body;

      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ message: "Email already registered" });

      const hash = await bcrypt.hash(password, 10);

      await User.create({ name, email, passwordHash: hash });

      res.json({ message: "User registered" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// -------- LOGIN --------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------- GET CURRENT USER (protected) --------
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------- FORGOT PASSWORD --------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  console.log(`[Forgot Password] Request received for: ${email}`);

  try {
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`[Forgot Password] User not found: ${email}`);
      return res.json({ message: "If that email is registered, a reset link has been sent." });
    }

    console.log(`[Forgot Password] Generating token for: ${email}`);
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetToken = hashedToken;
    user.resetTokenExpiry = expiry;
    await user.save();

    // Build reset link with normalized FRONTEND_URL
    const baseFrontUrl = (process.env.FRONTEND_URL || "http://127.0.0.1:5500").replace(/\/$/, "");
    const resetLink = `${baseFrontUrl}/auth.html?token=${rawToken}&email=${encodeURIComponent(email)}`;

    console.log(`[Forgot Password] Reset link built for: ${email}`);

    console.log(`[Forgot Password] Attempting to send email to: ${email}`);
    const transporter = getTransporter();
    
    // Add logging to see exactly where it stops
    console.log(`[Forgot Password] SMTP Config: Service: Gmail | User: ${process.env.EMAIL_USER}`);
    
    await transporter.sendMail({
      from: `"FocusBoard" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset your FocusBoard password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#020617;color:#e5e7eb;border-radius:12px;">
          <h2 style="color:#22c55e;margin-bottom:8px;">Password Reset</h2>
          <p style="color:#9ca3af;margin-bottom:24px;">Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetLink}"
             style="display:inline-block;background:#22c55e;color:#022c22;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;">
            Reset Password
          </a>
          <p style="margin-top:24px;font-size:12px;color:#6b7280;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    });

    console.log(`[Forgot Password] Email sent successfully to: ${email}`);
    res.json({ message: "If that email is registered, a reset link has been sent." });



  } catch (err) {
    console.error("[Forgot Password] Critical Error:", err.message || err);
    // Returning more detail to help the user fix their Render env vars
    res.status(500).json({ 
      error: `Email Error: ${err.message || "Unknown error"}. Please check your App Password in Render settings.` 
    });
  }
});



// -------- RESET PASSWORD --------
router.post("/reset-password", async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword)
      return res.status(400).json({ message: "Missing required fields." });

    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("reset-password error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
