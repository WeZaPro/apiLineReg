require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const qs = require("qs");

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.LINE_CLIENT_ID;
const CLIENT_SECRET = process.env.LINE_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINE_REDIRECT_URI;

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

// Line Messaging
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// API ที่ใช้สำหรับส่ง Push Message ไปที่ LINE ตาม userId
app.post("/api/send-push-message", async (req, res) => {
  const { userId, message } = req.body;

  try {
    const response = await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: userId, // userId ที่ได้รับจาก frontend
        messages: [
          {
            type: "text",
            text: message, // ข้อความที่ต้องการส่ง
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, // ใส่ Channel Access Token ของคุณ
        },
      }
    );

    res.json({ success: true, message: "Push message sent!" });
  } catch (error) {
    console.error(
      "Error sending push message:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to send push message" });
  }
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "test" && password === "1234") {
    res.json({ success: true, message: "Login successful!" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

app.post("/api/auth/callback", async (req, res) => {
  const { code } = req.body; // รับค่า code จาก body ของ request
  try {
    // สร้าง payload ด้วย qs สำหรับการส่งข้อมูลแบบ x-www-form-urlencoded
    const payload = qs.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    // เรียก API ของ LINE เพื่อรับ access_token
    const response = await axios.post(
      "https://api.line.me/oauth2/v2.1/token",
      payload,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = response.data.access_token;
    console.log("accessToken", accessToken);

    // ใช้ access_token เพื่อดึงข้อมูลโปรไฟล์ของผู้ใช้
    const profileResponse = await axios.get("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json({ user: profileResponse.data, accessToken });
  } catch (error) {
    console.error("LINE Login Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to login with LINE" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
