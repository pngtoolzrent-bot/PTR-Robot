const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// 🔐 Your Telegram user ID (admin)
const ADMIN_ID = 8155108761; // replace with your Telegram ID

// 📦 Simple slot system
let slots = {
  slot1: { status: "available", user: null },
  slot2: { status: "available", user: null },
  slot3: { status: "available", user: null }
};

// 📊 Temporary user sessions
let userSessions = {};

// --- START MENU ---
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
`👋 Welcome to PNGTOOLZRENT

Choose an option:`, {
    reply_markup: {
      keyboard: [
        ["📊 View Slots"],
      ],
      resize_keyboard: true
    }
  });
});

// --- HANDLE MESSAGES ---
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "📊 View Slots") {
    bot.sendMessage(chatId,
`📊 Slots:

1️⃣ Slot 1 - ${slots.slot1.status}
2️⃣ Slot 2 - ${slots.slot2.status}
3️⃣ Slot 3 - ${slots.slot3.status}

Type:
"slot1", "slot2", or "slot3" to book`);
  }

  // SLOT SELECTION
  if (["slot1", "slot2", "slot3"].includes(text)) {
    if (slots[text].status === "available") {

      slots[text].status = "pending";
      slots[text].user = chatId;

      bot.sendMessage(chatId,
`💳 Send your payment receipt now.

After sending, wait for admin approval.`);
      
      // Notify admin
      bot.sendMessage(ADMIN_ID,
`📥 New booking request

Slot: ${text}
User ID: ${chatId}

Please review receipt.`);

    } else {
      bot.sendMessage(chatId, "❌ Slot not available");
    }
  }
});

// --- HANDLE RECEIPTS (PHOTO OR TEXT) ---
bot.on("photo", (msg) => handleReceipt(msg));
bot.on("document", (msg) => handleReceipt(msg));
bot.on("text", (msg) => {
  if (msg.chat.id !== ADMIN_ID && msg.text && msg.text.includes("http")) {
    handleReceipt(msg);
  }
});

function handleReceipt(msg) {
  const chatId = msg.chat.id;

  if (chatId === ADMIN_ID) return;

  // Forward receipt to admin
  bot.forwardMessage(ADMIN_ID, chatId, msg.message_id);

  bot.sendMessage(chatId, "📨 Receipt sent. Waiting for admin approval.");
}

// --- ADMIN APPROVAL ---
bot.onText(/\/approve (.+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;

  const userId = match[1];

  bot.sendMessage(userId,
`✅ Payment approved!

Your login details:
Username: demo_user
Password: demo_pass

⏳ Your session has started.`);
});

// --- ADMIN REJECT ---
bot.onText(/\/reject (.+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;

  const userId = match[1];

  bot.sendMessage(userId,
`❌ Payment rejected. Please try again.`);
});
