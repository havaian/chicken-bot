const { Telegraf, Markup, session } = require("telegraf");
const express = require("express");
const { middleware } = require("./middleware");
const start = require("./functions/start");
const contact = require("./functions/contact");
const location = require("./functions/location");
const chooseBuyer = require("./functions/chooseBuyer");
const eggsDelivered = require("./functions/eggsDelivered");
const paymentReceived = require("./functions/paymentReceived");
const addMore = require("./functions/addMore");
const brokenEggs = require("./functions/brokenEggs");
const expenses = require("./functions/expenses");
const todayDeliveries = require("./functions/todayDeliveries");
const selectCourier = require("./functions/selectCourier");

const bot = new Telegraf(process.env.TG_TOKEN);
const app = express();

app.get("/", (req, res) => {
  res.send({
    chicken_bot: "It's working! 🙌",
  });
});

// Use session middleware
bot.use(session());

// Middleware to check user authorization before processing any command
bot.use(async (ctx, next) => {
  await middleware(ctx, next);
});

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
bot.action(/payment_received_(yes|no)/, async (ctx) => {
  await paymentReceived(ctx);
});
bot.action(/payment_amount:\d+/, async (ctx) => {
  await paymentReceived(ctx);
});
bot.action('confirm_transaction', async (ctx) => {
  await paymentReceived.confirmTransaction(ctx);
});
bot.action('add_more', async (ctx) => {
  await addMore(ctx);
});
bot.action('cancel', async (ctx) => {
  // Reset session
  ctx.session = { user: ctx.session.user };

  // Delete the previous message
  await ctx.deleteMessage();

  if (ctx.session.user.userType === 'courier') {
    await ctx.reply('Operation cancelled.', Markup.keyboard([
      ['Tuxum yetkazildi', 'Singan tuxumlar'],
      ['Chiqim', 'Bugungi yetkazilganlar']
    ]).resize().oneTime());
  } else if (ctx.session.user.userType === 'warehouse') {
    await ctx.reply('Operation cancelled.', Markup.keyboard([
      ['Tuxum chiqimi']
    ]).resize().oneTime());
  }
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
bot.action(/broken_eggs:\d+/, async (ctx) => {
  await brokenEggs.confirmBrokenEggs(ctx);
});
bot.action(/expenses:\d+/, async (ctx) => {
  await expenses.confirmExpenses(ctx);
});

// Initialize the broken eggs and expenses handlers
brokenEggs(bot);
expenses(bot);

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
  console.log("Bot ✅");
});

bot.launch();
