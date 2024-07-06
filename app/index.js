const { Telegraf, Markup, session } = require("telegraf");
const express = require("express");
const { middleware } = require("./middleware/index.js");
const textCommandHandler = require("./middleware/textCommandHandler.js"); 
const awaitingPromptHandler = require("./middleware/awaitingPromptHandler.js"); 
const start = require("./functions/start");
const contact = require("./functions/contact");
const location = require("./functions/location");
const chooseBuyer = require("./functions/chooseBuyer");
const eggsDelivered = require("./functions/eggsDelivered");
const paymentReceived = require("./functions/paymentReceived");
const addMore = require("./functions/addMore");
const cancel = require("./functions/cancel");
const brokenEggs = require("./functions/brokenEggs");
const expenses = require("./functions/expenses");
const todayDeliveries = require("./functions/todayDeliveries");
const selectCourier = require("./functions/selectCourier");
const eggIntake = require("./functions/eggIntake");
const warehouseStatus = require("./functions/warehouseStatus");

const bot = new Telegraf(process.env.TG_TOKEN);
const app = express();

// Use session middleware
bot.use(session());

// Middleware to check user authorization before processing any command
bot.use(async (ctx, next) => {
  await middleware(ctx, next);
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
bot.on('contact', async (ctx) => {
  await contact(ctx);
});

// Handling location message
bot.on('location', async (ctx) => {
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
bot.action('confirm_transaction', async (ctx) => {
  await paymentReceived.confirmTransaction(ctx);
});
bot.action('add_more', async (ctx) => {
  await addMore(ctx);
});
bot.action('cancel', async (ctx) => {
  await cancel(ctx);
});

// Handling warehouse user actions
bot.action(/select-courier:(.+)/, async (ctx) => {
  await selectCourier.selectAmount(ctx);
});
bot.action(/confirm-distribution:(.+):(\d+)/, async (ctx) => {
  await selectCourier.confirmDistribution(ctx);
});
bot.action(/accept-distribution:(.+):(\d+)/, async (ctx) => {
  await selectCourier.acceptDistribution(ctx);
});
bot.action(/courier-accept:(.+):(\d+)/, async (ctx) => {
  await selectCourier.courierAccept(ctx);
});
bot.action('courier-reject', async (ctx) => {
  await selectCourier.courierReject(ctx);
});

// Handling broken eggs and expenses
bot.hears('Chiqim', async (ctx) => {
  await expenses.sendExpenses(ctx);
});
bot.hears('Singan tuxumlar', async (ctx) => {
  await brokenEggs.sendBrokenEggs(ctx);
});
bot.hears('Tuxum kirimi', async (ctx) => {
  await eggIntake.promptEggIntake(ctx);
});
bot.hears('Ombor holati', async (ctx) => {
  await warehouseStatus(ctx);
});

bot.action(/confirm_broken_eggs:\d+/, async (ctx) => {
  await brokenEggs.addBrokenEggs(ctx);
});
bot.action(/confirm_expenses:\d+/, async (ctx) => {
  await expenses.addExpenses(ctx);
});

// Menu button handling
bot.hears('Tuxum yetkazildi', async (ctx) => {
  await addMore(ctx);
});
bot.hears('Tuxum chiqimi', async (ctx) => {
  await selectCourier(ctx);
});
bot.hears('Bugungi yetkazilganlar', async (ctx) => {
  await todayDeliveries(ctx);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`${PORT} ✅`);
});

bot.launch();
console.log("Bot ✅");

// Pass bot instance to checkPendingDistributions
selectCourier.setBotInstance(bot);
