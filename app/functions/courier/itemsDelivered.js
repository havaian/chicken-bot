const { Markup } = require("telegraf");
const axios = require("../../axios");
const paymentReceived = require("./paymentReceived");
const nonZero = require("../general/non-zero");
const letters = require("../data/btnEmojis");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");

const sessionKey = "awaitingItemsDelivered";
const itemsDataKey = "itemsDeliveredData";

let items = "";

const generateItemButtons = (category, currentCategoryIndex) => {
  console.log(currentCategoryIndex);
  const buttons = [
    currentCategoryIndex > 0 
      ? [
          Markup.button.callback("⬅️ Oldingisi", `items-prev:${category}`),
          Markup.button.callback("Keyingisi ➡️", `items-amount:0:${category}`)
        ] 
      : [
          Markup.button.callback("Keyingisi ➡️", `items-amount:0:${category}`)
        ],
    [
      Markup.button.callback(`180 ${letters[category]}`, `items-amount:180:${category}`),
      Markup.button.callback(`360 ${letters[category]}`, `items-amount:360:${category}`),
    ],
    [
      Markup.button.callback(`540 ${letters[category]}`, `items-amount:540:${category}`),
      Markup.button.callback(`720 ${letters[category]}`, `items-amount:720:${category}`),
    ],
    [
      Markup.button.callback(`1080 ${letters[category]}`, `items-amount:1080:${category}`),
      Markup.button.callback(`1440 ${letters[category]}`, `items-amount:1440:${category}`),
    ],
    [Markup.button.callback("Boshqa", `items-other:${category}`)],
  ];

  return buttons;
}

let deleteMessage = false;

module.exports.deliverItems = async (ctx) => {
  try {
    items = nonZero(ctx.session.currentItems);
  
    if (!ctx.session.categories) {
      ctx.session.categories = Object.keys(items);
      ctx.session.currentCategoryIndex = 0;
      ctx.session[itemsDataKey] = [];
    }
  
    const [action, amount, category] = ctx.match[0].split(":");
  
    if (action === "items-amount") {
      // Delete the previous message
      ctx.session[sessionKey] ? {} : await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
      deleteMessage ? await ctx.editMessageReplyMarkup({ inline_keyboard: [] }) : {};

      ctx.session[sessionKey] = false;

      if (ctx.session.currentItems[category] < amount) {
          await ctx.reply("Siz kiritgan maxsulot soni mashinada bor maxsulot sonidan katta");

          ctx.session[sessionKey] = true;

          deleteMessage = true;

          console.log(ctx.session.currentCategoryIndex);
  
          await ctx.reply(
            `Mijoz: ${ctx.session.buyer.full_name || ""}\n\nKategoriya: ${letters[category]}\n\nNarxi: ${ctx.session.buyer.item_price[category]}\n\nNechta maxsulot yetkazildi?`,
            Markup.inlineKeyboard(generateItemButtons(category, ctx.session.currentCategoryIndex))
          );
          return;
      }

      deleteMessage = false;
  
      const existingEntry = ctx.session[itemsDataKey].find(entry => entry.category === category);
      if (existingEntry) {
        existingEntry.amount = parseInt(amount, 10);
      } else {
        ctx.session[itemsDataKey].push({
          category: category,
          amount: parseInt(amount, 10)
        });
      }
      
      ctx.session.currentCategoryIndex++;
    } else if (action === "items-other") {
      const category = ctx.session.categories[ctx.session.currentCategoryIndex];
      
      ctx.session[sessionKey] = true;
      await ctx.reply(
        `Mijoz: ${ctx.session.buyer.full_name || ""}\n\nKategoriya: ${letters[category]}\n\nNarxi: ${ctx.session.buyer.item_price[category]}\n\nNechta maxsulot yetkazildi?`,
        Markup.keyboard([
            ["Bekor qilish ❌"]
        ]));
  
      // Delete the previous message
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      return;
    } else if (action === "items-prev") {
      ctx.session.currentCategoryIndex = Math.max(ctx.session.currentCategoryIndex - 1, 0);
  
      // Delete the previous message
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } else if (action === "items-distributed-no") {
      // Delete the previous message
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    }
  
    if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
      const category = ctx.session.categories[ctx.session.currentCategoryIndex];

      await ctx.reply(
        `Mijoz: ${ctx.session.buyer.full_name || ""}\n\nKategoriya: ${letters[category]}\n\nNarxi: ${ctx.session.buyer.item_price[category]}\n\nNechta maxsulot yetkazildi?`,
        Markup.inlineKeyboard(generateItemButtons(category, ctx.session.currentCategoryIndex))
      );
    } else {
      await sendSummaryAndCompleteDelivery(ctx);
    }
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

const sendSummaryAndCompleteDelivery = async (ctx) => {
  try {
    const selectedBuyer = ctx.session.buyer;
    const itemsData = ctx.session[itemsDataKey];

    ctx.session[sessionKey] = false;

    if (!itemsData || itemsData.length === 0) {
      await ctx.reply("Maxsulot yetkazilmadi");
      await this.confirmItemsDelivered(ctx);
      return;
    } else {
      let categorySums = {};
      let totalSum = 0;

      let summaryMessage = itemsData
        .map(({ category, amount }) => {
          const price = ctx.session.buyer.item_price[category];
          const sum = price * amount;
          categorySums[category] = sum;
          totalSum += sum;
          return `${category}: ${amount.toLocaleString()} (${price.toLocaleString()}). Summa: ${sum.toLocaleString()}`;
        })
        .join("\n");

      const newDebt = ctx.session.buyer.debt + totalSum;
      ctx.session.buyer.newDebt = newDebt;

      summaryMessage += `\n\nJami summa: ${totalSum.toLocaleString()}`;
      summaryMessage += `\n\nAvvalgi qarz: ${ctx.session.buyer.debt.toLocaleString()}`;
      summaryMessage += `\nYangi qarz: ${newDebt.toLocaleString()}`;
      if (newDebt - ctx.session.buyer.debt_limit > 0) {
        summaryMessage += `\n\n❗️❗️❗️ Ushbu mijozdan kamida <b>${(newDebt - ctx.session.buyer.debt_limit).toLocaleString()}</b> so'm olishingiz shart`;
      }

      await ctx.reply(`Maxsulot yetkazilgan kategoriya bo'yicha umumiy ma'lumot:\n\nMijoz: ${ctx.session.buyer.full_name}\n\n${summaryMessage}`, { parse_mode: 'HTML' });
      await ctx.reply("Tasdiqlaysizmi?",
        Markup.inlineKeyboard([
          Markup.button.callback("Ha ✅", "items-distributed-yes"),
          Markup.button.callback("Yo'q ❌", "items-distributed-no"),
        ])
      );
    }

    selectedBuyer.itemsDelivered = itemsData || [];
   
    ctx.session[itemsDataKey] = undefined;
    ctx.session.categories = null;
    ctx.session.currentCategoryIndex = null;
  } catch (error) {
    logger.error(error);
    await ctx.reply("Xatolik yuz berdi. Qayta urunib ko'ring.");
  }
};

module.exports.confirmItemsDelivered = async (ctx) => {
  try {
    if (ctx.match[0] === "items-distributed-yes") {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    }
    await paymentReceived(ctx);
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
}