const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logging");

const { sendLeft } = require("./leftEggs");

const nonZero = require("../general/non-zero");
let eggs = "";

const letters = require("../data/btnEmojis");

const sessionKey = "awaitingIncisionEggs";
const eggsDataKey = "eggsIncisionData";

const promptIncision = async (ctx, type) => {
  try {
    eggs = nonZero(ctx.session.currentEggs);
    
    if (!ctx.session.categories || type === 2) {
      ctx.session.categories = Object.keys(eggs);
      ctx.session.currentCategoryIndex = 0;
      ctx.session[eggsDataKey] = {};
      ctx.session[sessionKey] = true;
    }
  
    if (sessionKey) {
      const category = ctx.session.categories[ctx.session.currentCategoryIndex];
  
      if (ctx.message && ctx.message.text && type != 2) {
        const amount = parseInt(ctx.message.text, 10);
        if (isNaN(amount) || amount < 0) {
          await ctx.reply("Iltimos, to’g’ri son kiriting:");
          return;
        }
  
        if (!ctx.session[eggsDataKey][category]) {
          ctx.session[eggsDataKey][category] = 0;
        }
        ctx.session[eggsDataKey][category] += amount;
  
        ctx.session.currentCategoryIndex++;
      }
  
      if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
        const nextCategory = ctx.session.categories[ctx.session.currentCategoryIndex];
        await ctx.reply(`Nechta ${letters[nextCategory]} kategoriya tuxum nasechka?`);
      } else {
        await confirmIncisionEggs(ctx);
      }
    }
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
}

exports.sendIncisionEggs = async (ctx) => {
  try {
    const type = ((ctx?.match && ctx?.match[0] === "confirm-incision-eggs-no") || typeof ctx.session[eggsDataKey] === "undefined") ? 2 : 1;

    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-incision-eggs-no";

    if (deleteMsg) {
      await ctx.deleteMessage();
    }

    if (type === 2) {
      await ctx.reply(`Nasechka tuxumlar sonini kiriting`,
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ]));
    }

    promptIncision(ctx, type);
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Nasechka tuxumlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

const confirmIncisionEggs = async (ctx) => {
  try {
    const incisionEggs = ctx.session[eggsDataKey];
    let amountMsg = "";

    if (!incisionEggs || Object.keys(incisionEggs).length === 0) {
      amountMsg = "yo'q";
      await ctx.reply(`Nasechka tuxumlar: ${amountMsg}\n\n`);
      this.addIncisionEggs(ctx);
      return;
    } else {
      for (let category in incisionEggs) {
        amountMsg += `${letters[category]}: ${incisionEggs[category]}\n`;
      }
    }

    ctx.session[sessionKey] = false;

    await ctx.reply(`Nasechka tuxumlar\n\n${amountMsg}\n\n`);
    await ctx.reply(`Nasechka tuxum kiritilganini tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Ha ✅", "confirm-incision-eggs-yes"),
        Markup.button.callback("Yo'q ❌", "confirm-incision-eggs-no")],
      ])
    );
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Nasechka tuxumlar qo'shishda xatolik yuz berdi. Qayta urunib ko'ring"
    );
  }
};

exports.addIncisionEggs = async (ctx) => {
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

    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-incision-eggs-yes";

    if (deleteMsg) {
      await ctx.deleteMessage();
    }

    for (let y in Object.keys(ctx.session[eggsDataKey])) {
      const x = Object.keys(ctx.session[eggsDataKey])[y];
      
      // If current[x] is not defined, set it to 0
      if (typeof current[x] === 'undefined') {
        current[x] = 0;
      }

      current[x] = current[x] - ctx.session[eggsDataKey][x];

      if (current[x] - ctx.session[eggsDataKey][x] < 0) {
        ctx.reply("Sizning mashinangizdagi tuxum soni yetarli emas!");
  
        ctx.session[eggsDataKey] = undefined;
        ctx.session.categories = null;
        ctx.session.currentCategoryIndex = null;

        return;
      }
    }

    ctx.session.updatedActivity = {
      ...courierActivity,
      current: courierActivity.current,
      incision: ctx.session[eggsDataKey],
    };
  
    ctx.session[eggsDataKey] = undefined;
    ctx.session.categories = null;
    ctx.session.currentCategoryIndex = null;

    await sendLeft(ctx);
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Nasechka tuxumlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
