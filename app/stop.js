const { Telegraf, session } = require("telegraf");
const express = require("express");

const { middleware } = require("./middleware/index.js");
const stop = require("./middleware/stop.js");
const contact = require("./functions/general/contact.js");

const { logger, readLog } = require("./utils/logging/index.js");

const bot = new Telegraf(process.env.TG_TOKEN);
const app = express();

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`${PORT} ✅`);
});

app.get("/", (req, res) => {
  res.send({
    chicken_bot: "It's working! 🙌",
  });
});

// Use session middleware
bot.use(session());

// Handling contact message
bot.on("contact", async (ctx) => {
  await contact(ctx);
});

// Command handling
bot.start(async (ctx) => {
  await start(ctx);
});

// Middleware to check user authorization before processing any command
bot.use(async (ctx, next) => {
  await middleware(ctx, next);
});

bot.use(stop.middleware);

bot.launch();
logger.info("Bot ✅");