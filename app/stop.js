const { Telegraf } = require("telegraf");
const express = require("express");

const { middleware } = require("./middleware/stop.js");

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

// Middleware to check user authorization before processing any command
bot.use(async (ctx, next) => {
  await middleware(ctx, next);
});

bot.launch();
logger.info("Bot ✅");