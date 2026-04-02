const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
`👋 Welcome to PNGTOOLZRENT Demo

Choose an option below:`, {
    reply_markup: {
      keyboard: [
        ["📦 View Services"],
        ["📊 View Slots"]
      ],
      resize_keyboard: true
    }
  });
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "📦 View Services") {
    bot.sendMessage(chatId,
`🛠 Service:
UnlockTool Access Rental`);
  }

  if (text === "📊 View Slots") {
    bot.sendMessage(chatId,
`📊 Slots:

🟢 Slot 1 – Available  
🔴 Slot 2 – In Use  
🟢 Slot 3 – Available`);
  }
});