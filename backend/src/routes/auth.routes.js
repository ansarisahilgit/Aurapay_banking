const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const auth = require("../middleware/auth.middleware");
const Otp = require("../models/Otp");
const { registerSchema, loginSchema } = require("../utils/validators");

function tokenFor(user) {
  return jwt.sign({ sub: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    accountNumber: user.accountNumber,
    balance: user.balance,
    currency: user.currency,
  };
}
router.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.issues[0].message });
    const { name, email, password } = parsed.data;
    if (await User.exists({ email: email.toLowerCase() }))
      return res.status(409).json({ message: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 12);
    let accountNumber;
    do {
      accountNumber = `2${crypto.randomInt(10000000000, 99999999999)}`;
    } while (await User.exists({ accountNumber }));
    const user = await User.create({
      name,
      email,
      passwordHash,
      accountNumber,
      balance: 10000,
    });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});
router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Valid email and password are required" });
    const user = await User.findOne({
      email: parsed.data.email.toLowerCase(),
    }).select("+passwordHash");
    if (
      !user ||
      !(await bcrypt.compare(parsed.data.password, user.passwordHash))
    )
      return res.status(401).json({ message: "Invalid email or password" });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});
// STEP 1: Verify current password and generate OTP
router.post("/password/request-otp", auth, async (req, res, next) => {
  try {
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        message: "Current password is required",
      });
    }

    const user = await User.findById(req.user._id).select("+passwordHash");

    const validPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    await Otp.deleteMany({
      user: user._id,
      purpose: "PASSWORD_CHANGE",
      consumedAt: null,
    });

    const code = String(crypto.randomInt(100000, 1000000));

    const codeHash = await bcrypt.hash(code, 10);

    const otp = await Otp.create({
      user: user._id,
      purpose: "PASSWORD_CHANGE",
      payload: {},
      codeHash,
      expiresAt: new Date(
        Date.now() + Number(process.env.OTP_TTL_MINUTES || 5) * 60000,
      ),
    });

    const response = {
      message: "Password change OTP generated. It expires in 5 minutes.",
      otpRequestId: otp._id,
    };

    if (process.env.OTP_DEMO_MODE === "true") {
      response.demoOtp = code;
    }

    console.log(`Password change OTP generated for ${user.email}`);

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// STEP 2: Verify OTP and update password
router.post("/password/confirm", auth, async (req, res, next) => {
  try {
    const { otpRequestId, otp: code, newPassword } = req.body;

    if (!otpRequestId || !/^\d{6}$/.test(String(code || ""))) {
      return res.status(400).json({
        message: "Valid six-digit OTP is required",
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      return res.status(400).json({
        message: "Password must contain 8 to 72 characters",
      });
    }

    const otpRecord = await Otp.findOne({
      _id: otpRequestId,
      user: req.user._id,
      purpose: "PASSWORD_CHANGE",
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: "OTP is invalid, expired or already used",
      });
    }

    if (otpRecord.attempts >= 5) {
      return res.status(429).json({
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    const validOtp = await bcrypt.compare(String(code), otpRecord.codeHash);

    if (!validOtp) {
      await Otp.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });

      return res.status(400).json({
        message: "Incorrect OTP",
      });
    }

    const user = await User.findById(req.user._id).select("+passwordHash");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);

    if (samePassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    // Atomically consume OTP before changing password.
    const consumed = await Otp.updateOne(
      {
        _id: otpRecord._id,
        user: user._id,
        purpose: "PASSWORD_CHANGE",
        consumedAt: null,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 5 },
      },
      {
        $set: { consumedAt: new Date() },
      },
    );

    if (consumed.modifiedCount !== 1) {
      return res.status(400).json({
        message: "OTP has expired or already been used",
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({
      message: "Password changed successfully. Please sign in again.",
    });
  } catch (error) {
    next(error);
  }
});
// STEP 1: Verify current password and generate OTP
router.post("/password/request-otp", auth, async (req, res, next) => {
  try {
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        message: "Current password is required",
      });
    }

    const user = await User.findById(req.user._id).select("+passwordHash");

    const validPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    await Otp.deleteMany({
      user: user._id,
      purpose: "PASSWORD_CHANGE",
      consumedAt: null,
    });

    const code = String(crypto.randomInt(100000, 1000000));

    const codeHash = await bcrypt.hash(code, 10);

    const otp = await Otp.create({
      user: user._id,
      purpose: "PASSWORD_CHANGE",
      payload: {},
      codeHash,
      expiresAt: new Date(
        Date.now() + Number(process.env.OTP_TTL_MINUTES || 5) * 60000,
      ),
    });

    const response = {
      message: "Password change OTP generated. It expires in 5 minutes.",
      otpRequestId: otp._id,
    };

    if (process.env.OTP_DEMO_MODE === "true") {
      response.demoOtp = code;
    }

    console.log(`Password change OTP generated for ${user.email}`);

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// STEP 2: Verify OTP and update password
router.post("/password/confirm", auth, async (req, res, next) => {
  try {
    const { otpRequestId, otp: code, newPassword } = req.body;

    if (!otpRequestId || !/^\d{6}$/.test(String(code || ""))) {
      return res.status(400).json({
        message: "Valid six-digit OTP is required",
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      return res.status(400).json({
        message: "New password must contain 8 to 72 characters",
      });
    }

    const otp = await Otp.findOne({
      _id: otpRequestId,
      user: req.user._id,
      purpose: "PASSWORD_CHANGE",
      consumedAt: null,
    });

    if (!otp || otp.expiresAt < new Date()) {
      return res.status(400).json({
        message: "OTP is invalid or expired. Request a new OTP.",
      });
    }

    if (otp.attempts >= 5) {
      return res.status(429).json({
        message: "Too many incorrect OTP attempts. Request a new OTP.",
      });
    }

    const validOtp = await bcrypt.compare(String(code), otp.codeHash);

    if (!validOtp) {
      otp.attempts += 1;
      await otp.save();

      return res.status(400).json({
        message: "Incorrect OTP",
      });
    }

    const user = await User.findById(req.user._id).select("+passwordHash");

    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);

    if (samePassword) {
      return res.status(400).json({
        message: "New password must be different from your current password",
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    otp.consumedAt = new Date();
    await otp.save();

    res.json({
      message: "Password changed successfully. Please sign in again.",
    });
  } catch (error) {
    next(error);
  }
});
router.get("/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));
module.exports = router;
