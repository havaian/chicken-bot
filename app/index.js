const { Telegraf, Markup, session } = require("telegraf");
const express = require("express");
const { middleware } = require("./middleware/index.js");
const textCommandHandler = require("./middleware/textCommandHandler.js");
const awaitingPromptHandler = require("./middleware/awaitingPromptHandler.js");
const courierAccepted = require("./middleware/courierAccepted.js");
const dayFinished = require("./middleware/dayFinished.js");
const start = require("./functions/general/start.js");
const contact = require("./functions/general/contact.js");
const location = require("./functions/courier/location.js");
const chooseBuyer = require("./functions/courier/chooseBuyer.js");
const eggsDelivered = require("./functions/courier/eggsDelivered.js");
const paymentReceived = require("./functions/courier/paymentReceived.js");
const addMore = require("./functions/courier/addMore.js");
const cancel = require("./functions/general/cancel.js");
const brokenEggs = require("./functions/courier/brokenEggs.js");
const incisionEggs = require("./functions/courier/incision.js");
const courierMelange = require("./functions/courier/melange.js");
const expenses = require("./functions/courier/expenses.js");
const leftEggs = require("./functions/courier/leftEggs.js");
const leftMoney = require("./functions/courier/leftMoney.js");
const finishDay = require("./functions/courier/finishDay.js");
const selectCourier = require("./functions/warehouse/selectCourier.js");
const selectCourierAccepted = require("./functions/warehouse/selectCourierAccepted.js");
const eggIntake = require("./functions/warehouse/eggIntake.js");
const melange = require("./functions/warehouse/melange.js");
const remained = require("./functions/warehouse/remained.js");

const { logger, readLog } = require("./utils/logging/index.js");

const bot = new Telegraf(process.env.TG_TOKEN);
const app = express();

// Use session middleware
bot.use(session());

// Middleware to check user authorization before processing any command
bot.use(async (ctx, next) => {
  await middleware(ctx, next);
});

bot.action("cancel", async (ctx) => {
  await cancel(ctx, "Bekor qilindi.", true, true);
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

bot.use(dayFinished);

bot.use(textCommandHandler);

bot.use(awaitingPromptHandler);

// Handling location message
bot.on("location", async (ctx) => {
  await location.sendBuyersLocation(ctx);
});

// Handling button presses
bot.action(/location-buyer:(.+)/, async (ctx) => {
  await location.buyerLocation(ctx);
});
bot.action(/choose-buyer:(.+)/, async (ctx) => {
  await chooseBuyer(ctx);
});
// bot.action(/eggs-delivered-(yes|no)/, async (ctx) => {
//   await eggsDelivered.deliverEggs(ctx);
// });
bot.action(/eggs-amount:\d+:(.+)/, async (ctx) => {
  await eggsDelivered.deliverEggs(ctx);
});
bot.action(/eggs-other:(.+)/, async (ctx) => {
  await eggsDelivered.deliverEggs(ctx);
});
bot.action(/eggs-prev:(.+)/, async (ctx) => {
  await eggsDelivered.deliverEggs(ctx);
});
bot.action(/eggs-distributed-yes/, async (ctx) => {
  await eggsDelivered.confirmEggsDelivered(ctx);
});
bot.action(/eggs-distributed-no/, async (ctx) => {
  await eggsDelivered.deliverEggs(ctx);
});
// bot.action(/payment-received-(yes|no)/, async (ctx) => {
//   await paymentReceived(ctx);
// });
bot.action(/payment-amount:\d+/, async (ctx) => {
  await paymentReceived(ctx);
});
bot.action(/payment-other/, async (ctx) => {
  await paymentReceived(ctx);
});
bot.action("confirm-transaction", async (ctx) => {
  await paymentReceived.confirmTransaction(ctx);
});
bot.action("confirm-transaction-no", async (ctx) => {
  await paymentReceived(ctx);
});
bot.action("add-more", async (ctx) => {
  await addMore(ctx);
});

// Handling warehouse user actions
bot.action(/select-courier:(.+)/, async (ctx) => {
  await selectCourier.promptCourierBroken(ctx);
});
bot.action(/select-courier-accepted:(.+)/, async (ctx) => {
  await selectCourierAccepted.promptDistribution(ctx);
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
bot.action(/courier-melange-yes/, async (ctx) => {
  await selectCourier.confirmCourierMelange(ctx);
});
bot.action(/courier-melange-no/, async (ctx) => {
  await selectCourier.promptCourierMelange(ctx);
});
bot.action(/accept-distribution-yes/, async (ctx) => {
  await selectCourier.confirmDistribution(ctx);
});
bot.action(/accept-distribution-no/, async (ctx) => {
  await selectCourier.promptDistribution(ctx);
});
bot.action(/accept-distribution-accepted-yes/, async (ctx) => {
  await selectCourierAccepted.confirmDistribution(ctx);
});
bot.action(/accept-distribution-accepted-no/, async (ctx) => {
  await selectCourierAccepted.promptDistribution(ctx);
});
bot.action(/courier-accept:(.+)/, async (ctx) => {
  await selectCourier.courierAccept(ctx);
});
bot.action(/courier-reject:(.+)/, async (ctx) => {
  await selectCourier.courierReject(ctx);
});
bot.action(/courier-accepted-accept:(.+)/, async (ctx) => {
  await selectCourierAccepted.courierAccept(ctx);
});
bot.action(/courier-accepted-reject:(.+)/, async (ctx) => {
  await selectCourierAccepted.courierReject(ctx);
});

bot.action(/choose-importer:(.+):(.+)/, async (ctx) => {
  await eggIntake.handleEggImporter(ctx);
});
bot.action("confirm-intake-eggs-yes", async (ctx) => {
  await eggIntake.addIntakeEggs(ctx);
});
bot.action("confirm-intake-eggs-no", async (ctx) => {
  await eggIntake.promptEggImporter(ctx);
});

bot.action(/confirm-broken-eggs-yes/, async (ctx) => {
  await brokenEggs.addBrokenEggs(ctx);
});
bot.action(/confirm-broken-eggs-no/, async (ctx) => {
  await brokenEggs.sendBrokenEggs(ctx);
});
bot.action(/confirm-incision-eggs-yes/, async (ctx) => {
  await incisionEggs.addIncisionEggs(ctx);
});
bot.action(/confirm-incision-eggs-no/, async (ctx) => {
  await incisionEggs.sendIncisionEggs(ctx);
});
bot.action(/confirm-melange-eggs-yes/, async (ctx) => {
  await courierMelange.confirmMelangeEggs(ctx);
});
bot.action(/confirm-melange-eggs-no/, async (ctx) => {
  await courierMelange.sendMelange(ctx);
});
bot.action(/confirm-expenses:\d+/, async (ctx) => {
  await expenses.addExpenses(ctx);
});
bot.action(/confirm-left-yes/, async (ctx) => {
  await leftEggs.addLeft(ctx);
});
bot.action(/confirm-left-no/, async (ctx) => {
  await leftEggs.sendLeft(ctx);
});
bot.action(/confirm-money-left-yes/, async (ctx) => {
  await leftMoney.addLeftMoney(ctx);
});
bot.action(/confirm-money-left-no/, async (ctx) => {
  await leftMoney.sendLeftMoney(ctx);
});
bot.action(/confirm-day-finished/, async (ctx) => {
  await finishDay.confirmDayFinished(ctx);
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
          ["Bekor qilish ❌"]
      ]));
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

const bodyParser = require("body-parser");
app.use(bodyParser.json());

const cors = require("cors");
var corsOptions = {
  origin: "*",
};
app.use(cors(corsOptions));

// Middleware to capture and log request and response details
app.use((req, res, next) => {
  const allowedHost = ["http://141.98.153.217:6173/"];  

  // Check if the Host header matches the allowed host
  if (req.headers.host !== "127.0.0.1:26005" && req.headers.host !== "141.98.153.217:26005" && req.headers.host !== "bot:26005" && !allowedHost.includes(req.headers.referer)) {
    res.status(403).json({ error: "Forbidden: Access is denied." });
    return;
  }

  // Middleware to log request and response details
  const originalSend = res.send;

  res.send = function (data) {
    res.locals.body = data;
    originalSend.call(this, data);
  };

  res.on('finish', () => {
    logger.info(`Request Headers: ${JSON.stringify(req.headers)}`);
    logger.info(`Request Body: ${JSON.stringify(req.body)}`);
    logger.info(`Response Data: ${res.locals.body}`);
  });

  next();
});

app.use("/data", require("./website"));

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
selectCourierAccepted.setBotInstance(bot);
melange.setBotInstance(bot);

const autoDayFinishedCron = require("./functions/cron");
autoDayFinishedCron.setBotInstance(bot);