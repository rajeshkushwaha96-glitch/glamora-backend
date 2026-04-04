const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors"); // ✅ ADD THIS
require("dotenv").config();

const app = express();

// ✅ CORS ENABLE (IMPORTANT)
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Test route
app.get("/", (req, res) => {
  res.send("Glamora Backend Running 🚀");
});

// Create order
app.post("/create-order", async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: req.body.amount * 100,
      currency: "INR",
    });
    res.json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Order creation failed" });
  }
});

// Verify payment
app.post("/verify-payment", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected === razorpay_signature) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Verification failed" });
  }
});

// Start server
app.listen(process.env.PORT || 5000, () =>
  console.log("Server Started 🚀")
);
