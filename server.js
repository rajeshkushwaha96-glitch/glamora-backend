const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ✅ CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

app.use(express.json());

// ✅ TEMP USER DATABASE (in-memory)
let users = {};

// ✅ Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Health Check
app.get("/", (req, res) => {
  res.send("Glamora Backend Running 🚀");
});

// ✅ CREATE ORDER
app.post("/create-order", async (req, res) => {
  try {
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

    console.log("ORDER CREATED:", order);

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
    console.log("BODY:", req.body);
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const isValid = expected === razorpay_signature;

    if (isValid && userId) {
      users[userId] = {
        isPremium: true,
        paymentId: razorpay_payment_id,
      };
      console.log("✅ PREMIUM SAVED:", users[userId]);
    }

    res.json({ success: isValid });

  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ success: false });
  }
});

// ✅ CHECK PREMIUM STATUS
app.get("/check-premium/:userId", (req, res) => {
  const user = users[req.params.userId];

  res.json({
    isPremium: user?.isPremium || false
  });
});
// ✅ START SERVER
app.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server Started");
});
