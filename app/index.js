const { Bot, GrammyError } = require("grammy");

const express = require("express");
const bot = new Bot("YOUR_TOKEN_HERE");

const { middleware } = require("./actions");

const app = express();

// Middleware to check user authorization before processing any command
bot.use(async (ctx, next) => {
  middleware(ctx, next);
});

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`${process.env.PORT} ✅`);
  console.log("Bot ✅");
});
