const express = require("express");
const line = require("@line/bot-sdk");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();

const user_table = process.env.SQL_TABLE;

// ตั้งค่าการเชื่อมต่อกับ LINE
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// เชื่อมต่อ MySQL Database
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: ", err);
    return;
  }
  console.log("Connected to MySQL database");
});

app.get("/", (req, res) => {
  res.json({ message: "Webhook is working!" });
});

// Webhook endpoint
app.post("/webhook", line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.status(200).end())
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// ฟังก์ชันจัดการข้อความที่ได้รับจากผู้ใช้
async function handleEvent(event) {
  if (event.type === "message" && event.message.type === "text") {
    const userId = event.source.userId;
    console.log(`User ID: ${userId}`);

    // ตรวจสอบ userId ใน database
    db.query(
      `SELECT * FROM ${user_table} WHERE user_id = ?`,
      [userId],
      async (err, results) => {
        if (err) {
          console.error("Database query error: ", err);
          return;
        }

        if (results.length === 0) {
          // ถ้ายังไม่มี userId ให้ส่งปุ่ม OK ไปให้ผู้ใช้กด
          return client.replyMessage(event.replyToken, {
            type: "template",
            altText: "กรุณากด OK เพื่อบันทึกข้อมูล",
            template: {
              type: "confirm",
              text: "คุณต้องการบันทึกข้อมูลหรือไม่?",
              actions: [
                {
                  type: "postback",
                  label: "OK",
                  data: `action=save&userId=${userId}`,
                },
                {
                  type: "message",
                  label: "ยกเลิก",
                  text: "ยกเลิก",
                },
              ],
            },
          });
        }
      }
    );
  } else if (event.type === "postback") {
    const data = event.postback.data;
    const params = new URLSearchParams(data);
    const action = params.get("action");
    const userId = params.get("userId");

    if (action === "save" && userId) {
      try {
        const profile = await client.getProfile(userId);
        const displayName = profile.displayName;

        // บันทึก userId และ displayName ลงฐานข้อมูล
        db.query(
          `INSERT INTO ${user_table} (user_id, display_name) VALUES (?, ?)`,
          [userId, displayName],
          (err) => {
            if (err) {
              console.error("Failed to save user data: ", err);
            } else {
              console.log("User data saved successfully");
            }
          }
        );

        // แจ้งผู้ใช้ว่าบันทึกข้อมูลเรียบร้อย
        // return client.replyMessage(event.replyToken, {
        //   type: "text",
        //   text: "บันทึกข้อมูลของคุณเรียบร้อยแล้ว!",
        // });

        // แจ้งผู้ใช้ว่าบันทึกข้อมูลเรียบร้อย และเปิด LIFF
        return client.replyMessage(event.replyToken, {
          type: "template",
          altText: "บันทึกข้อมูลเรียบร้อย! กดเพื่อเปิด LIFF.",
          template: {
            type: "buttons",
            text: "บันทึกข้อมูลของคุณเรียบร้อยแล้ว! กดปุ่มเพื่อเปิด LIFF.",
            actions: [
              {
                type: "uri",
                label: "เปิด LIFF",
                //uri: "https://liff.line.me/{LIFF_ID}", // เปลี่ยนเป็น LIFF URL ของคุณ
                uri: "https://liff.line.me/2006869856-mrvPKQe2",
              },
            ],
          },
        });
      } catch (error) {
        console.error("Failed to get user profile: ", error);
      }
    }
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
