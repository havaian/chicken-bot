const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logging");

const { sendMelange } = require("./melange");

const nonZero = require("../general/non-zero");

const letters = require("../data/btnEmojis");

const sessionKey = "awaitingLeft";
const eggsDataKey = "eggsLeftData";

const promptLeft = async (ctx, type) => {
  try {
    const eggs = nonZero(ctx.session.currentEggs);

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

        // if (amount > eggs[category]) {
        //   await ctx.reply(`Sizning mashinangizda ${eggs[category]}ta ${letters[category]} kategoriya tuxum qolgan!`);
        //   return;
        // }
  
        if (!ctx.session[eggsDataKey][category]) {
          ctx.session[eggsDataKey][category] = 0;
        }
        ctx.session[eggsDataKey][category] += amount;
  
        ctx.session.currentCategoryIndex++;
      }
  
      if (ctx.session.currentCategoryIndex < ctx.session.categories.length) {
        const nextCategory = ctx.session.categories[ctx.session.currentCategoryIndex];
        await ctx.reply(`Nechta ${letters[nextCategory]} kategoriya tuxum butun qolgan?`);
      } else {
        await confirmLeftEggs(ctx);
      }
    }
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
}

exports.sendLeft = async (ctx) => {
  try {
    const type = ((ctx?.match && ctx?.match[0] === "confirm-left-no") || typeof ctx.session[eggsDataKey] === "undefined") ? 2 : 1;

    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-left-no";

    if (deleteMsg) {
      await ctx.deleteMessage();
    }

    if (type === 2) {
      await ctx.reply(
        "Mashinada nechta tuxum butun qolganini kiriting",
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ])
      );
    }

    promptLeft(ctx, type);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Qolgan butun tuxum qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

const confirmLeftEggs = async (ctx) => {
  try {
    const leftEggs = ctx.session[eggsDataKey];
    let amountMsg = "";

    if (!leftEggs || Object.keys(leftEggs).length === 0) {
      amountMsg = "yo'q";
      await ctx.reply(`Qolgan butun tuxumlar: ${amountMsg}`);
      this.addLeft(ctx);
      return;
    } else {
      for (let category in leftEggs) {
        amountMsg += `${letters[category]}: ${leftEggs[category]}\n`;
      }
    }

    ctx.session[sessionKey] = false;

    await ctx.reply(`Qolgan butun tuxumlar\n\n${amountMsg}`);
    await ctx.reply(`Kiritilganini qolgan butun tuxumlar sonini tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Ha ✅", "confirm-left-yes"),
        Markup.button.callback("Yo'q ❌", "confirm-left-no")],
      ])
    );

    ctx.session.awaitingLeft = false;
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Qolgan butun tuxum qo'shishda xatolik yuz berdi. Qayta urunib ko'ring"
    );
  }
};

exports.addLeft = async (ctx) => {
  try {
    const courierActivity = ctx.session.updatedActivity;
    const current = courierActivity.current || {};
    const incision = courierActivity.incision || {};

    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-left-yes";

    if (deleteMsg) {
      await ctx.deleteMessage();
    }

    // for (let y in Object.keys(ctx.session[eggsDataKey] || {})) {
    //     const x = Object.keys(ctx.session[eggsDataKey])[y];
      
    //     // If current[x] is not defined, set it to 0
    //     if (typeof current[x] === 'undefined') {
    //       current[x] = 0;
    //     }
      
    //     // If incision[x] is not defined, set it to 0
    //     if (typeof incision[x] === 'undefined') {
    //       incision[x] = 0;
    //     }

    //     if (current[x] < ctx.session[eggsDataKey][x]) {
    //       await ctx.reply(`Sizda ${letters[x]} kategoriya bo’yicha ${current[x]}ta dan ko’p qolishi mumkin emas!`,
    //         Markup.keyboard([["Bekor qilish ❌"]])
    //       );

    //       ctx.session[eggsDataKey] = undefined;
    //       ctx.session.categories = null;
    //       ctx.session.currentCategoryIndex = null;

    //       return;
    //     }
    // };

    ctx.session.updatedActivity = {
      ...ctx.session.updatedActivity,
      current_by_courier: ctx.session[eggsDataKey],
    };
  
    ctx.session[eggsDataKey] = undefined;
    ctx.session.categories = null;
    ctx.session.currentCategoryIndex = null;

    await sendMelange(ctx);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Qolgan butun tuxum qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
