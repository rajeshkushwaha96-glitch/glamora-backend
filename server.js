const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ✅ CORS (FULL SAFE CONFIG)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// ✅ TEMP USER DATABASE (in-memory)
let users = {};

// ✅ Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Health Check (for Render wakeup)
app.get("/", (req, res) => {
  console.log("🌐 Health check hit");
  res.send("Glamora Backend Running 🚀");
});

// ✅ CREATE ORDER
app.post("/create-order", async (req, res) => {
  try {
    console.log("📦 CREATE ORDER HIT:", req.body);

    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    console.log("✅ ORDER CREATED:", order.id);

    return res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });

  } catch (error) {
    console.error("❌ RAZORPAY ERROR:", error);
    return res.status(500).json({
      error: "Failed to create order",
      details: error.message,
    });
  }
});

// ✅ VERIFY PAYMENT + SAVE PREMIUM
app.post("/verify-payment", (req, res) => {
  try {
    console.log("🔥 VERIFY API HIT");
    console.log("📩 BODY RECEIVED:", req.body);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId
    } = req.body;

    // ❗ Validation check
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.log("❌ Missing payment fields");
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    // 🔐 Signature verification
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const isValid = expected === razorpay_signature;

    console.log("🔐 SIGNATURE VALID:", isValid);

    if (isValid && userId) {
      users[userId] = {
        isPremium: true,
        paymentId: razorpay_payment_id,
      };

      console.log("✅ PREMIUM SAVED FOR USER:", userId);
    } else {
      console.log("❌ PAYMENT NOT VERIFIED OR USERID MISSING");
    }

    return res.json({ success: isValid });

  } catch (error) {
    console.error("❌ Verification Error:", error);
    return res.status(500).json({ success: false });
  }
});

// ✅ CHECK PREMIUM STATUS
app.get("/check-premium/:userId", (req, res) => {
  const userId = req.params.userId;

  console.log("🔍 CHECK PREMIUM FOR:", userId);

  const user = users[userId];

  return res.json({
    isPremium: user?.isPremium || false
  });
});

// ✅ START SERVER
app.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server Started");
});
