const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// ================= CONFIG =================
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 8155108761;

// ================= INIT =================
if (!TOKEN) {
  console.error("BOT_TOKEN missing");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

// Keep Render alive
app.get("/", (req, res) => {
  res.send("Bot is running ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));

// ================= DATA STORAGE =================
let bookings = {};
let pendingLoginInput = {};

// ================= START =================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Welcome to PNGToolzRent Bot 🚀", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 View Slots", callback_data: "view_slots" }]
      ]
    }
  });
});

// ================= SHOW SLOTS =================
function showSlots(chatId) {
  bot.sendMessage(chatId, "Select an available slot:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Slot 1", callback_data: "slot1" }],
        [{ text: "Slot 2", callback_data: "slot2" }],
        [{ text: "Slot 3", callback_data: "slot3" }]
      ]
    }
  });
}

// ================= CALLBACK HANDLER =================
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  if (data === "view_slots") {
    showSlots(chatId);
  }

  if (data.startsWith("slot")) {
    bookings[userId] = {
      slot: data,
      status: "pending",
      expiresAt: null
    };

    bot.sendMessage(
      chatId,
      "💳 Send your payment receipt now.\n\nAfter sending, please wait for admin approval."
    );

    bot.sendMessage(
      ADMIN_ID,
      `📥 New booking request\n\nSlot: ${data}\nUser ID: ${userId}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `approve_${userId}` },
              { text: "❌ Reject", callback_data: `reject_${userId}` }
            ]
          ]
        }
      }
    );
  }

  // ================= ADMIN APPROVE =================
  if (data.startsWith("approve_") && userId === ADMIN_ID) {
    const targetUser = data.split("_")[1];

    pendingLoginInput[ADMIN_ID] = targetUser;

    bot.sendMessage(
      ADMIN_ID,
      `✍️ Send login details for user ${targetUser}`
    );

    bot.sendMessage(
      targetUser,
      "✅ Your slot has been approved.\n\n⏳ Waiting for login details..."
    );
  }

  // ================= ADMIN REJECT =================
  if (data.startsWith("reject_") && userId === ADMIN_ID) {
    const targetUser = data.split("_")[1];

    if (bookings[targetUser]) {
      bookings[targetUser].status = "rejected";
    }

    bot.sendMessage(targetUser, "❌ Your booking was rejected.");
    bot.sendMessage(ADMIN_ID, `Rejected user ${targetUser}`);
  }
});

// ================= RECEIPT + ADMIN LOGIN FLOW =================
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Ignore commands
  if (msg.text && msg.text.startsWith("/")) return;

  // ================= ADMIN SENDS LOGIN DETAILS =================
  if (userId === ADMIN_ID && pendingLoginInput[ADMIN_ID]) {
    const targetUser = pendingLoginInput[ADMIN_ID];

    bot.sendMessage(
      targetUser,
      `🔐 Your Unlock Details:\n\n${msg.text}`
    );

    bot.sendMessage(ADMIN_ID, `✅ Login details sent to user ${targetUser}`);

    delete pendingLoginInput[ADMIN_ID];
    return;
  }

  // Ignore if no booking
  if (!bookings[userId]) return;

  if (bookings[userId].status !== "pending") return;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `approve_${userId}` },
          { text: "❌ Reject", callback_data: `reject_${userId}` }
        ]
      ]
    }
  };

  // ================= USER RECEIPT =================
  if (msg.photo || msg.document) {

    // ✅ Acknowledge user immediately
    bot.sendMessage(
      chatId,
      "✅ Receipt received!\n\n⏳ Please be patient while we review your payment. You will be notified once approved."
    );

    // Forward to admin
    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1].file_id;

      bot.sendPhoto(ADMIN_ID, photo, {
        caption: `Receipt from user ${userId}`,
        ...options
      });

    } else if (msg.document) {
      bot.sendDocument(ADMIN_ID, msg.document.file_id, {
        caption: `Receipt from user ${userId}`,
        ...options
      });
    }

  } else {
    bot.sendMessage(chatId, "Please send a screenshot or document of your payment.");
  }
});

// ================= TIMER =================
setInterval(() => {
  const now = Date.now();

  for (let userId in bookings) {
    const b = bookings[userId];

    if (b.status === "active" && b.expiresAt && now > b.expiresAt) {
      b.status = "expired";

      bot.sendMessage(userId, "⏰ Your slot has expired.");
      bot.sendMessage(ADMIN_ID, `⏰ Slot expired for user ${userId}`);
    }
  }
}, 60000);

// ================= LOG =================
console.log("Bot started...");
