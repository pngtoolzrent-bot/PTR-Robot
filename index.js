const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// 🔐 Your Admin ID
const ADMIN_ID = 8155108761;

// 📦 Slot storage
let slots = {
  slot1: { status: "available", user: null },
  slot2: { status: "available", user: null },
  slot3: { status: "available", user: null }
};

// 👤 User state tracking
let userState = {};

// --- START ---
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
`👋 Welcome to PNGTOOLZRENT

Choose an option:`, {
    reply_markup: {
      keyboard: [
        ["📊 View Slots"]
      ],
      resize_keyboard: true
    }
  });
});

// --- MESSAGE HANDLER ---
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "📊 View Slots") {
    bot.sendMessage(chatId,
`📊 Choose a slot:

🟢 slot1
🟢 slot2
🟢 slot3`, {
      reply_markup: {
        keyboard: [
          ["slot1"],
          ["slot2"],
          ["slot3"]
        ],
        resize_keyboard: true
      }
    });
  }

  if (["slot1", "slot2", "slot3"].includes(text)) {
    handleSlot(chatId, text);
  }
});

// --- SLOT HANDLER ---
function handleSlot(chatId, slotName) {
  if (slots[slotName].status === "available") {

    slots[slotName].status = "pending";
    slots[slotName].user = chatId;

    // Track user state
    userState[chatId] = {
      step: "awaiting_receipt",
      slot: slotName
    };

    bot.sendMessage(chatId,
`💳 Slot reserved: ${slotName}

📸 Please send your payment receipt as a photo in this chat.

Waiting for admin approval...`);

    bot.sendMessage(ADMIN_ID,
`📥 New Booking Request

Slot: ${slotName}
User ID: ${chatId}`);

  } else {
    bot.sendMessage(chatId, "❌ Slot not available");
  }
}

// --- RECEIPT HANDLER ---
bot.on("photo", (msg) => {
  const chatId = msg.chat.id;

  // Ignore admin
  if (chatId === ADMIN_ID) return;

  // Validate user state
  if (!userState[chatId] || userState[chatId].step !== "awaiting_receipt") {
    bot.sendMessage(chatId, "⚠️ Please select a slot first.");
    return;
  }

  const userSlot = userState[chatId].slot;

  // Forward receipt to admin
  bot.forwardMessage(ADMIN_ID, chatId, msg.message_id);

  bot.sendMessage(ADMIN_ID,
`Approve payment for:
Slot: ${userSlot}
User: ${chatId}`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `approve_${chatId}` },
          { text: "❌ Reject", callback_data: `reject_${chatId}` }
        ]
      ]
    }
  });

  bot.sendMessage(chatId, "📨 Receipt received. Waiting for admin approval.");
});

// --- ADMIN APPROVAL HANDLER ---
bot.on("callback_query", (query) => {
  const data = query.data;

  // Only admin can approve/reject
  if (query.message.chat.id !== ADMIN_ID) return;

  if (data.startsWith("approve_")) {
    const userId = data.split("_")[1];

    if (userState[userId]) {
      delete userState[userId];
    }

    bot.sendMessage(userId,
`✅ Payment Approved!

Login Details:
Username: demo_user
Password: demo_pass

⏳ Your session has started.`);
  }

  if (data.startsWith("reject_")) {
    const userId = data.split("_")[1];

    if (userState[userId]) {
      delete userState[userId];
    }

    bot.sendMessage(userId,
`❌ Payment rejected. Please try again.`);
  }
});
  bot.sendMessage(ADMIN_ID, `Approve payment for ${userSlot} (User: ${chatId})`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `approve_${chatId}` },
          { text: "❌ Reject", callback_data: `reject_${chatId}` }
        ]
      ]
    }
  });

  bot.sendMessage(chatId, "📨 Receipt received. Waiting for admin approval.");
});

// --- ADMIN ACTIONS ---
bot.on("callback_query", (query) => {
  const data = query.data;

  if (query.message.chat.id !== ADMIN_ID) return;

  if (data.startsWith("approve_")) {
    const userId = data.split("_")[1];

    if (userState[userId]) {
      delete userState[userId];
    }

    bot.sendMessage(userId,
`✅ Payment Approved!

Login Details:
Username: demo_user
Password: demo_pass

⏳ Your session has started.`);
  }

  if (data.startsWith("reject_")) {
    const userId = data.split("_")[1];

    if (userState[userId]) {
      delete userState[userId];
    }

    bot.sendMessage(userId,
`❌ Payment rejected. Please try again.`);
  }
});Username: demo_user
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
