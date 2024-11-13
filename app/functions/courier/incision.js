const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logging");

const { sendLeft } = require("./leftItems");

const nonZero = require("../general/non-zero");

const letters = require("../data/btnEmojis");

const sessionKey = "awaitingIncisionItems";
const itemsDataKey = "itemsIncisionData";

const promptIncision = async (ctx, type) => {
  try {
    const items = nonZero(ctx.session.currentItems);     
    
    if (!ctx.session.categories || type === 2) {
      ctx.session.categories = Object.keys(items);
      ctx.session.currentCategoryIndex = 0;
      ctx.session[itemsDataKey] = {};
      ctx.session[sessionKey] = true;
    }
  
    if (sessionKey) {
      if (typeof ctx.session[itemsDataKey] === "null") {
        ctx.session = { ...ctx.session.user };
        return;
      }

      const category = ctx.session.categories[ctx.session.currentCategoryIndex];
  
      if (ctx.message && ctx.message.text && type != 2) {
        const amount = parseInt(ctx.message.text, 10);
        if (isNaN(amount) || amount < 0) {
          if (ctx.session.awaitingDayFinish) {

            ctx.session[itemsDataKey] = undefined;
            this.sendIncisionItems(ctx);
          }
          if (ctx.session.awaitingIncisionItems) {
            await ctx.reply("Iltimos, to’g’ri son kiriting:");
          }
          return;
        }

        // if (amount > items[category]) {
        //   await ctx.reply(`Sizning mashinangizda ${items[category]}ta ${letters[category]} kategoriya maxsulot qolgan!`);
        //   return;
        // }
  
        if (ctx.session[itemsDataKey] && !ctx.session[itemsDataKey][category]) {
          ctx.session[itemsDataKey][category] = 0;
        } else {
          ctx.session = { ...ctx.session.user };
          return;
        }
        
        ctx.session[itemsDataKey][category] += amount;
  
        ctx.session.currentCategoryIndex++;
      }
  
      if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
        const nextCategory = ctx.session.categories[ctx.session.currentCategoryIndex];
        await ctx.reply(`Nechta ${letters[nextCategory]} kategoriya maxsulot nasechka?`);
      } else {
        await confirmIncisionItems(ctx);
      }
    }
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
}

exports.sendIncisionItems = async (ctx) => {
  try {
    const type = ((ctx?.match && ctx?.match[0] === "confirm-incision-items-no") || typeof ctx.session[itemsDataKey] === "undefined") ? 2 : 1;

    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-incision-items-no";

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }

    if (type === 2) {
      await ctx.reply(`Nasechka maxsulotlar sonini kiriting`,
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ]));
    }

    promptIncision(ctx, type);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Nasechka maxsulotlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

const confirmIncisionItems = async (ctx) => {
  try {
    const incisionItems = ctx.session[itemsDataKey];
    let amountMsg = "";

    if (!incisionItems || Object.keys(incisionItems).length === 0) {
      amountMsg = "yo'q";
      await ctx.reply(`Nasechka maxsulotlar: ${amountMsg}\n\n`);
      this.addIncisionItems(ctx);
      return;
    } else {
      for (let category in incisionItems) {
        amountMsg += `${letters[category]}: ${incisionItems[category]}\n`;
      }
    }

    ctx.session[sessionKey] = false;

    await ctx.reply(`Nasechka maxsulotlar\n\n${amountMsg}\n\n`);
    await ctx.reply(`Nasechka maxsulot kiritilganini tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Ha ✅", "confirm-incision-items-yes"),
        Markup.button.callback("Yo'q ❌", "confirm-incision-items-no")],
      ])
    );
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Nasechka maxsulotlar qo'shishda xatolik yuz berdi. Qayta urunib ko'ring"
    );
  }
};

exports.addIncisionItems = async (ctx) => {
  try {
    // Get today's activity for the courier
    const courierActivityResponse = await axios.get(
      `/courier/activity/today/${ctx.session.user.phone_num}`,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const courierActivity = courierActivityResponse.data;

    const current = courierActivity.current || {};

    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-incision-items-yes";

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }

    for (let y in Object.keys(ctx.session[itemsDataKey])) {
      const x = Object.keys(ctx.session[itemsDataKey])[y];
      
      // If current[x] is not defined, set it to 0
      if (typeof current[x] === 'undefined') {
        current[x] = 0;
      }     

      // if (current[x] < ctx.session[itemsDataKey][x]) {
      //   await ctx.reply(`Sizning mashinangizdagi ${letters[x]} qolgan maxsulot soni ${ctx.session.currentItems[x]}!`);
  
      //   ctx.session[itemsDataKey] = undefined;
      //   ctx.session.categories = null;
      //   ctx.session.currentCategoryIndex = null;

      //   return;
      // }

      current[x] = current[x] - ctx.session[itemsDataKey][x];
      // ctx.session.currentItems[x] = ctx.session.currentItems[x] - ctx.session[itemsDataKey][x];
    }

    ctx.session.updatedActivity = {
      ...courierActivity,
      current: courierActivity.current,
      incision: ctx.session[itemsDataKey],
    };
  
    ctx.session[itemsDataKey] = undefined;
    ctx.session.categories = null;
    ctx.session.currentCategoryIndex = null;

    await sendLeft(ctx);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Nasechka maxsulotlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
