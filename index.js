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

// ================= STORAGE =================
let bookings = {};
let pendingLoginInput = {};

// ================= START =================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "👋 Welcome to PNGToolzRent\n\nSelect a tool to continue:",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔓 UnlockTool", callback_data: "tool_unlocktool" }]
        ]
      }
    }
  );
});

// ================= TOOL SELECTION =================
function showSlots(chatId) {
  bot.sendMessage(chatId, "📊 Select a slot:", {
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

  // TOOL SELECTED
  if (data === "tool_unlocktool") {
    bookings[userId] = { tool: "UnlockTool" };

    bot.sendMessage(chatId, "✅ UnlockTool selected\n\nNow choose a slot:");
    showSlots(chatId);
  }

  // SLOT SELECTED
  if (data.startsWith("slot")) {
    if (!bookings[userId]) {
      bookings[userId] = {};
    }

    bookings[userId].slot = data;
    bookings[userId].status = "pending";

    bot.sendMessage(
      chatId,
      "💳 Send your payment receipt now.\n\nAfter sending, please wait for admin approval."
    );

    // Notify admin
    bot.sendMessage(
      ADMIN_ID,
      `📥 New Booking\n\nTool: UnlockTool\nSlot: ${data}\nUser ID: ${userId}`,
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

  // ADMIN APPROVE
  if (data.startsWith("approve_") && userId === ADMIN_ID) {
    const targetUser = data.split("_")[1];

    pendingLoginInput[ADMIN_ID] = targetUser;

    bot.sendMessage(
      ADMIN_ID,
      `✍️ Send login details for user ${targetUser}`
    );

    bot.sendMessage(
      targetUser,
      "✅ Your payment is approved.\n\n⏳ Waiting for login details..."
    );
  }

  // ADMIN REJECT
  if (data.startsWith("reject_") && userId === ADMIN_ID) {
    const targetUser = data.split("_")[1];

    if (bookings[targetUser]) {
      bookings[targetUser].status = "rejected";
    }

    bot.sendMessage(targetUser, "❌ Your booking was rejected.");
    bot.sendMessage(ADMIN_ID, `Rejected user ${targetUser}`);
  }
});

// ================= MESSAGE HANDLER =================
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (msg.text && msg.text.startsWith("/")) return;

  // ================= ADMIN LOGIN INPUT =================
  if (userId === ADMIN_ID && pendingLoginInput[ADMIN_ID]) {
    const targetUser = pendingLoginInput[ADMIN_ID];

    bot.sendMessage(
      targetUser,
      `🔐 Your UnlockTool Details:\n\n${msg.text}`
    );

    bot.sendMessage(ADMIN_ID, `✅ Login sent to user ${targetUser}`);

    delete pendingLoginInput[ADMIN_ID];
    return;
  }

  // Ignore if no booking
  if (!bookings[userId]) return;

  if (bookings[userId].status !== "pending") return;

  const adminOptions = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `approve_${userId}` },
          { text: "❌ Reject", callback_data: `reject_${userId}` }
        ]
      ]
    }
  };

  // ================= RECEIPT HANDLING =================
  if (msg.photo || msg.document) {

    // ✅ Acknowledge user
    bot.sendMessage(
      chatId,
      "✅ Receipt received!\n\n⏳ Please wait while we review your payment."
    );

    // Send to admin
    bot.sendMessage(
      ADMIN_ID,
      `📥 Receipt from User ${userId}\nTool: UnlockTool\nSlot: ${bookings[userId].slot}`
    );

    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1].file_id;
      bot.sendPhoto(ADMIN_ID, photo, adminOptions);
    } else if (msg.document) {
      bot.sendDocument(ADMIN_ID, msg.document.file_id, adminOptions);
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
