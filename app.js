require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());
// token จาก messaging api
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

app.post("/register", async (req, res) => {
  const { name, phone, userId } = req.body;

  if (!name || !phone || !userId) {
    return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
  }

  console.log("📌 ลงทะเบียนสำเร็จ:", { name, phone, userId });

  // 🔹 ส่ง Push Message ไปยัง LINE User
  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: userId,
        messages: [
          {
            type: "text",
            text: `✅ ลงทะเบียนสำเร็จ!\nชื่อ: ${name}\nเบอร์โทร: ${phone}`,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    res.json({ message: "ลงทะเบียนสำเร็จ! และส่งข้อความไปยัง LINE แล้ว" });
  } catch (error) {
    console.error("❌ ส่งข้อความล้มเหลว:", error.response?.data);
    res.status(500).json({ message: "ลงทะเบียนสำเร็จ แต่ส่งข้อความไม่สำเร็จ" });
  }
});

// ตรวจสอบว่า userId เป็นเพื่อนกับบอทหรือยัง
app.get("/api/check-friend/:userId", async (req, res) => {
  const userId = req.params.userId;
  console.log("userId ", userId);
  console.log("CHANNEL_ACCESS_TOKEN ", CHANNEL_ACCESS_TOKEN);

  try {
    const response = await axios.get(
      `https://api.line.me/v2/bot/followers/contains`,
      {
        headers: {
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
          "Content-Type": "application/json", // เพิ่ม Content-Type
        },
        params: {
          userId: userId, // userId ที่ต้องการตรวจสอบ
        },
      }
    );

    // ตรวจสอบสถานะเพื่อน
    if (response.data) {
      res.json({ isFriend: response.data.contains });
    } else {
      res.json({ isFriend: false });
    }
  } catch (error) {
    console.error("Error checking friend status", error);
    res.status(500).send("Internal Server Error");
  }
});

// app.listen(5000, () => console.log("🚀 Server running on port 5000"));
// Start server
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
