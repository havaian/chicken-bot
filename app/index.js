const { Telegraf, Markup, session } = require("telegraf");
const express = require("express");
const { middleware } = require("./middleware/index.js");
const textCommandHandler = require("./middleware/textCommandHandler.js");
const awaitingPromptHandler = require("./middleware/awaitingPromptHandler.js");
const courierAccepted = require("./middleware/courierAccepted.js");
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
const leftEggs = require("./functions/courier/leftEggs");
const selectCourier = require("./functions/warehouse/selectCourier");
const eggIntake = require("./functions/warehouse/eggIntake");
const melange = require("./functions/warehouse/melange");
const remained = require("./functions/warehouse/remained");

const { logger, readLog } = require("./utils/logging");

const bot = new Telegraf(process.env.TG_TOKEN);
const app = express();

// Use session middleware
bot.use(session());

// Middleware to check user authorization before processing any command
bot.use(async (ctx, next) => {
  await middleware(ctx, next);
});

bot.action("cancel", async (ctx) => {
  await cancel(ctx, "Bekor qilindi.",true, true);
});

// Command handling
bot.start(async (ctx) => {
  await start(ctx);
});

// Handling contact message
bot.on("contact", async (ctx) => {
  await contact(ctx);
});

bot.use(courierAccepted);

bot.use(awaitingPromptHandler);

bot.use(textCommandHandler);

// Handling location message
bot.on("location", async (ctx) => {
  await location(ctx);
});

// Handling button presses
bot.action(/location-buyer:(.+)/, async (ctx) => {
  await location(ctx);
});
bot.action(/choose-buyer:(.+)/, async (ctx) => {
  await chooseBuyer(ctx);
});
bot.action(/eggs-delivered-(yes|no)/, async (ctx) => {
  await eggsDelivered(ctx);
});
bot.action(/eggs-amount:\d+/, async (ctx) => {
  await eggsDelivered(ctx);
});
bot.action(/eggs-other/, async (ctx) => {
  await eggsDelivered(ctx);
});
bot.action(/payment-received-(yes|no)/, async (ctx) => {
  await paymentReceived(ctx);
});
bot.action(/payment-amount:\d+/, async (ctx) => {
  await paymentReceived(ctx);
});
bot.action(/payment-other/, async (ctx) => {
  await paymentReceived(ctx);
});
bot.action("confirm-transaction", async (ctx) => {
  await paymentReceived.confirmTransaction(ctx);
});
bot.action("add-more", async (ctx) => {
  await addMore(ctx);
});

// Handling warehouse user actions
bot.action(/select-courier:(.+)/, async (ctx) => {
  await selectCourier.promptCourierBroken(ctx);
});
bot.action(/courier-broken-yes/, async (ctx) => {
  await selectCourier.confirmCourierBroken(ctx);
});
bot.action(/courier-broken-no/, async (ctx) => {
  await selectCourier.promptCourierBroken(ctx);
});
bot.action(/courier-remained-yes/, async (ctx) => {
  await selectCourier.confirmCourierRemained(ctx);
});
bot.action(/courier-remained-no/, async (ctx) => {
  await selectCourier.promptCourierRemained(ctx);
});
bot.action(/accept-distribution-yes/, async (ctx) => {
  await selectCourier.confirmDistribution(ctx);
});
bot.action(/accept-distribution-no/, async (ctx) => {
  await selectCourier.promptDistribution(ctx);
});
bot.action(/courier-accept:(.+):(\d+):(\d+):(\d+)/, async (ctx) => {
  await selectCourier.courierAccept(ctx);
});
bot.action(/courier-reject:(.+):(\d+):(\d+):(\d+)/, async (ctx) => {
  await selectCourier.courierReject(ctx);
});

bot.action("confirm-egg-intake", async (ctx) => {
  await eggIntake.confirmEggIntake(ctx);
});

bot.action("cancel", async (ctx) => {
  await eggIntake.cancelEggIntake(ctx);
});

bot.action(/choose-importer:(.+):(.+)/, async (ctx) => {
  await eggIntake.promptEggIntake(ctx);
});

bot.action(/confirm-broken-eggs:\d+/, async (ctx) => {
  await brokenEggs.addBrokenEggs(ctx);
});
bot.action(/confirm-expenses:\d+/, async (ctx) => {
  await expenses.addExpenses(ctx);
});
bot.action(/confirm-left:\d+/, async (ctx) => {
  await leftEggs.addLeft(ctx);
});

// Handle melange actions
bot.action("warehouse-dailyBroken-yes", async (ctx) => {
  await melange.confirmBroken(ctx);
});
bot.action("warehouse-dailyBroken-no", async (ctx) => {
  await melange.promptBroken(ctx);
});
bot.action("warehouse-dailyIncision-yes", async (ctx) => {
  await melange.confirmIncision(ctx);
});
bot.action("warehouse-dailyIncision-no", async (ctx) => {
  await melange.promptIncision(ctx);
});
bot.action("warehouse-dailyIntact-yes", async (ctx) => {
  await melange.confirmIntact(ctx);
});
bot.action("warehouse-dailyIntact-no", async (ctx) => {
  await melange.promptIntact(ctx);
});
bot.action("warehouse-dailyMelanj-yes", async (ctx) => {
  await melange.confirmMelange(ctx);
});
bot.action("warehouse-dailyMelanj-no", async (ctx) => {
  await melange.promptMelange(ctx);
});
bot.action("warehouse-remainedConfirm-yes", async (ctx) => {
  await remained.confirmWarehouseRemained(ctx);
});
bot.action("warehouse-remainedConfirm-no", async (ctx) => {
  await remained.promptWarehouseRemained(ctx);
});
bot.action("warehouse-dailyDeficit-yes", async (ctx) => {
  await remained.sendDeficit(ctx);
});
bot.action("warehouse-dailyDeficit-no", async (ctx) => {
  await remained.promptWarehouseRemained(ctx);
});

// Handle voice messages
bot.on("voice", async (ctx) => {
  if (ctx.session.awaitingCircleVideoCourier || ctx.session.awaitingCircleVideoWarehouse || ctx.session.awaitingCircleVideoWarehouse2) {
    ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.",
      Markup.keyboard([
          ["Bekor qilish"]
      ]).resize().oneTime());
  }
});

// Handle circle video
bot.on("video_note", async (ctx) => {
  if (ctx.session.awaitingCircleVideoCourier) {
    await paymentReceived.handleCircleVideo(ctx);
  }
  if (ctx.session.awaitingCircleVideoWarehouse) {
    await selectCourier.handleCircleVideo(ctx);
  }
  if (ctx.session.awaitingCircleVideoWarehouse2) {
    await remained.handleCircleVideo(ctx);
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

app.get("/logging", (req, res) => {
  try {
    const result = readLog();
    res.set("Content-Type", "text/plain");
    return res.send(result);
  } catch (e) {
    return res.sendStatus(500);
  }
});

bot.launch();
logger.info("Bot ✅");

// Pass bot instance to selectCourier and melange
selectCourier.setBotInstance(bot);
melange.setBotInstance(bot);
