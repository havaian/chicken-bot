const { Markup } = require("telegraf");
const axios = require("../../axios");
const paymentReceived = require("./paymentReceived");
const nonZero = require("../general/non-zero");
const letters = require("../data/btnEmojis");

const { logger, readLog } = require("../../utils/logging");

const eggsDataKey = "eggsDeliveredData";

let eggs = "";

module.exports.deliverEggs = async (ctx) => {
  try {
    eggs = nonZero(ctx.session.currentEggs);
  
    if (!ctx.session.categories) {
      ctx.session.categories = Object.keys(eggs);
      ctx.session.currentCategoryIndex = 0;
      ctx.session[eggsDataKey] = [];
    }
  
    const [action, amount, category] = ctx.match[0].split(":");
  
    if (action === "eggs-amount") {
      if (ctx.session.currentEggs[category] < amount) {
          await ctx.reply("Siz kiritgan tuxum soni bor tuxum sonidan katta",
            Markup.keyboard([
                ["Bekor qilish ❌"]
            ]));
          return;
      }
  
      const existingEntry = ctx.session[eggsDataKey].find(entry => entry.category === category);
      if (existingEntry) {
        existingEntry.amount = parseInt(amount, 10);
      } else {
        ctx.session[eggsDataKey].push({
          category: category,
          amount: parseInt(amount, 10)
        });
      }
      
      ctx.session.currentCategoryIndex++;
  
      // Delete the previous message
      await ctx.deleteMessage();
    } else if (action === "eggs-other") {
      const category = ctx.session.categories[ctx.session.currentCategoryIndex];
      
      ctx.session.awaitingEggsDelivered = true;
      await ctx.reply(
        `Kategoriya: ${letters[category]}\n\nNarxi: ${ctx.session.buyer.egg_price[category]}\n\nNechta tuxum yetkazildi?`,
        Markup.keyboard([
            ["Bekor qilish ❌"]
        ]));
  
      // Delete the previous message
      await ctx.deleteMessage();
      return;
    } else if (action === "eggs-prev") {
      ctx.session.currentCategoryIndex = Math.max(ctx.session.currentCategoryIndex - 1, 0);
  
      // Delete the previous message
      await ctx.deleteMessage();
    } else if (action === "eggs-distributed-no") {
      // Delete the previous message
      await ctx.deleteMessage();
    }
  
    if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
      const category = ctx.session.categories[ctx.session.currentCategoryIndex];
  
      const buttons = [
        ctx.session.currentCategoryIndex > 0 ? 
          [
            Markup.button.callback("⬅️ Oldingisi", `eggs-prev:${category}`),
            Markup.button.callback("Keyingisi ➡️", `eggs-amount:0:${category}`)] : 
          [
            Markup.button.callback("Keyingisi ➡️", `eggs-amount:0:${category}`)
          ],
        [
          Markup.button.callback(`180 ${letters[category]}`, `eggs-amount:180:${category}`),
          Markup.button.callback(`360 ${letters[category]}`, `eggs-amount:360:${category}`),
        ],
        [
          Markup.button.callback(`540 ${letters[category]}`, `eggs-amount:540:${category}`),
          Markup.button.callback(`720 ${letters[category]}`, `eggs-amount:720:${category}`),
        ],
        [
          Markup.button.callback(`1080 ${letters[category]}`, `eggs-amount:1080:${category}`),
          Markup.button.callback(`1440 ${letters[category]}`, `eggs-amount:1440:${category}`),
        ],
        [Markup.button.callback("Boshqa", `eggs-other:${category}`)],
      ];
  
      await ctx.reply(
        `Kategoriya: ${letters[category]}\n\nNarxi: ${ctx.session.buyer.egg_price[category]}\n\nNechta tuxum yetkazildi?`,
        Markup.inlineKeyboard(buttons)
      );
    } else {
      await sendSummaryAndCompleteDelivery(ctx);
    }
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

const sendSummaryAndCompleteDelivery = async (ctx) => {
  try {
    const selectedBuyer = ctx.session.buyer;
    const eggsData = ctx.session[eggsDataKey];

    if (!eggsData || eggsData.length === 0) {
      await ctx.reply("Tuxum yetkazilmadi");
      await this.confirmEggsDelivered(ctx);
      return;
    } else {
      const summaryMessage = eggsData
        .map(({ category, amount }) => `${category}: ${amount}`)
        .join("\n");

      await ctx.reply(`Tuxum yetkazilgan kategoriya bo'yicha umumiy ma'lumot:\n\n${summaryMessage}`);
      await ctx.reply("Tasdiqlaysizmi?",
        Markup.inlineKeyboard([
          Markup.button.callback("Ha ✅", "eggs-distributed-yes"),
          Markup.button.callback("Yo'q ❌", "eggs-distributed-no"),
        ])
      );
    }

    selectedBuyer.eggsDelivered = eggsData || [];
   
    ctx.session[eggsDataKey] = undefined;
    ctx.session.categories = null;
    ctx.session.currentCategoryIndex = null;
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko'ring.");
  }
};

module.exports.confirmEggsDelivered = async (ctx) => {
  try {
    await paymentReceived(ctx);
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
}