const { Telegraf, Markup, session } = require("telegraf");
const express = require("express");
const { middleware } = require("./middleware/index.js");
const textCommandHandler = require("./middleware/textCommandHandler.js");
const awaitingPromptHandler = require("./middleware/awaitingPromptHandler.js");
const start = require("./functions/general/start.js");
const contact = require("./functions/general/contact");
const location = require("./functions/courier/location");
const chooseBuyer = require("./functions/courier/chooseBuyer");
const eggsDelivered = require("./functions/courier/eggsDelivered");
const paymentReceived = require("./functions/courier/paymentReceived");
const addMore = require("./functions/courier/addMore");
const cancel = require("./functions/general/cancel.js");
const brokenEggs = require("./functions/courier/brokenEggs");
const expenses = require("./functions/courier/expenses");
const todayDeliveries = require("./functions/courier/todayDeliveries");
const selectCourier = require("./functions/warehouse/selectCourier");
const eggIntake = require("./functions/warehouse/eggIntake");
const warehouseStatus = require("./functions/warehouse/warehouseStatus");

const { logger, readLog } = require("./utils/logs");

const bot = new Telegraf(process.env.TG_TOKEN);
const app = express();

// Use session middleware
bot.use(session());

// Middleware to check user authorization before processing any command
bot.use(async (ctx, next) => {
  await middleware(ctx, next);
});

bot.action("cancel", async (ctx) => {
  await cancel(ctx);
});

// Use text command handler middleware
bot.use(textCommandHandler);

// Use awaiting prompt handler middleware
bot.use(awaitingPromptHandler);

// Command handling
bot.start(async (ctx) => {
  await start(ctx);
});

// Handling contact message
bot.on("contact", async (ctx) => {
  await contact(ctx);
});

// Handling location message
bot.on("location", async (ctx) => {
  await location(ctx);
});
// Handling button presses
bot.action(/location-buyer:(.+)/, async (ctx) => {
  await location(ctx);
});

// Handling button presses
bot.action(/choose-buyer:(.+)/, async (ctx) => {
  await chooseBuyer(ctx);
});
bot.action(/eggs_delivered_(yes|no)/, async (ctx) => {
  await eggsDelivered(ctx);
});
bot.action(/eggs_amount:\d+/, async (ctx) => {
  await eggsDelivered(ctx);
});
bot.action(/eggs_other/, async (ctx) => {
  await eggsDelivered(ctx);
});
bot.action(/payment_received_(yes|no)/, async (ctx) => {
  await paymentReceived(ctx);
});
bot.action(/payment_amount:\d+/, async (ctx) => {
  await paymentReceived(ctx);
});
bot.action(/payment_other/, async (ctx) => {
  await paymentReceived(ctx);
});
bot.action("confirm_transaction", async (ctx) => {
  await paymentReceived.confirmTransaction(ctx);
});
bot.action("add_more", async (ctx) => {
  await addMore(ctx);
});

// Handling warehouse user actions
bot.action(/select-courier:(.+)/, async (ctx) => {
  await selectCourier.selectAmount(ctx);
});
bot.action(/confirm-distribution:(.+):(.+)/, async (ctx) => {
  await selectCourier.confirmDistribution(ctx);
});
bot.action(/accept-distribution:(.+):(\d+)/, async (ctx) => {
  await selectCourier.acceptDistribution(ctx);
});
bot.action(/courier-accept:(.+):(\d+)/, async (ctx) => {
  await selectCourier.courierAccept(ctx);
});
bot.action("courier-reject", async (ctx) => {
  await selectCourier.courierReject(ctx);
});

bot.action("confirm_egg_intake", async (ctx) => {
  await eggIntake.confirmEggIntake(ctx);
});

bot.action("cancel", async (ctx) => {
  await eggIntake.cancelEggIntake(ctx);
});

// Handling broken eggs and expenses
bot.hears("Chiqim", async (ctx) => {
  await expenses.sendExpenses(ctx);
});
bot.hears("Singan tuxumlar", async (ctx) => {
  await brokenEggs.sendBrokenEggs(ctx);
});
bot.hears("Tuxum kirimi", async (ctx) => {
  await eggIntake.promptEggImporter(ctx);
});
bot.hears("Ombor holati", async (ctx) => {
  await warehouseStatus(ctx);
});

// Handling button presses
bot.action(/choose-importer:(.+):(.+)/, async (ctx) => {
  await eggIntake.promptEggIntake(ctx);
});

bot.action(/confirm_broken_eggs:\d+/, async (ctx) => {
  await brokenEggs.addBrokenEggs(ctx);
});
bot.action(/confirm_expenses:\d+/, async (ctx) => {
  await expenses.addExpenses(ctx);
});

// Menu button handling
bot.hears("Tuxum yetkazildi", async (ctx) => {
  await addMore(ctx);
});
bot.hears("Tuxum chiqimi", async (ctx) => {
  await selectCourier(ctx);
});
bot.hears("Hisobot", async (ctx) => {
  await todayDeliveries(ctx);
});

// Handle voice messages
bot.on("voice", async (ctx) => {
  if (ctx.session.awaitingCircleVideo) {
    ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.");
  }
});

// Handle circle video
bot.on("video_note", async (ctx) => {
  if (ctx.session.awaitingCircleVideo) {
    await paymentReceived.handleCircleVideo(ctx);
  }
});

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

app.get("/logs", (req, res) => {
  try {
    const result = readLog();
    res.set("Content-Type", "text/plain");
    return res.send(result);
  } catch(e) {
    return res.sendStatus(500);
  }
});

bot.launch();
logger.info("Bot ✅");
