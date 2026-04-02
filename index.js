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
// In-memory (resets on restart)
let bookings = {}; 
// structure:
// bookings[userId] = { slot, status, expiresAt }

// ================= START =================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 View Slots", callback_data: "view_slots" }]
      ]
    }
  };

  bot.sendMessage(chatId, "Welcome to PNGToolzRent Bot 🚀\nSelect an option below:", options);
});

// ================= SLOT MENU =================
function showSlots(chatId) {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Slot 1", callback_data: "slot1" }],
        [{ text: "Slot 2", callback_data: "slot2" }],
        [{ text: "Slot 3", callback_data: "slot3" }]
      ]
    }
  };

  bot.sendMessage(chatId, "Select an available slot:", options);
}

// ================= CALLBACK HANDLER =================
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  if (data === "view_slots") {
    showSlots(chatId);
  }

  if (data.startsWith("slot")) {
    const slot = data;

    bookings[userId] = {
      slot: slot,
      status: "pending",
      expiresAt: null
    };

    bot.sendMessage(
      chatId,
      `💳 Send your payment receipt now.\n\nAfter sending, wait for admin approval.`
    );

    // Notify admin
    bot.sendMessage(
      ADMIN_ID,
      `📥 New booking request\n\nSlot: ${slot}\nUser ID: ${userId}\n\nPlease review receipt.`
    );
  }

  // Admin actions
  if (data.startsWith("approve_") && userId === ADMIN_ID) {
    const targetUser = data.split("_")[1];

    if (bookings[targetUser]) {
      const durationHours = 6;
      const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;

      bookings[targetUser].status = "active";
      bookings[targetUser].expiresAt = expiresAt;

      bot.sendMessage(
        targetUser,
        `✅ Your slot is approved!\n\nAccess details:\n(You can now use the service)\n\n⏳ Duration: 6 hours`
      );

      bot.sendMessage(ADMIN_ID, `Approved user ${targetUser}`);
    }
  }

  if (data.startsWith("reject_") && userId === ADMIN_ID) {
    const targetUser = data.split("_")[1];

    if (bookings[targetUser]) {
      bookings[targetUser].status = "rejected";

      bot.sendMessage(targetUser, "❌ Your booking was rejected.");
      bot.sendMessage(ADMIN_ID, `Rejected user ${targetUser}`);
    }
  }
});

// ================= RECEIPT HANDLER =================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Ignore commands
  if (msg.text && msg.text.startsWith("/")) return;

  if (!bookings[userId]) return;

  if (bookings[userId].status !== "pending") return;

  // Forward receipt to admin
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
  } else {
    bot.sendMessage(chatId, "Please send a screenshot or document of your payment.");
  }
});

// ================= TIMER CHECK =================
// Notify admin when time expires
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
