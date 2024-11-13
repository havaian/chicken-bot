const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logging");

const { sendMelange } = require("./melange");

const nonZero = require("../general/non-zero");

const letters = require("../data/btnEmojis");

const sessionKey = "awaitingLeft";
const itemsDataKey = "itemsLeftData";

const promptLeft = async (ctx, type) => {
  try {
    const items = nonZero(ctx.session.currentItems);

    if (!ctx.session.categories || type === 2) {
      ctx.session.categories = Object.keys(items);
      ctx.session.currentCategoryIndex = 0;
      ctx.session[itemsDataKey] = {};
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
        await ctx.reply(`Nechta ${letters[nextCategory]} kategoriya maxsulot butun qolgan?`);
      } else {
        await confirmLeftItems(ctx);
      }
    }
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
}

exports.sendLeft = async (ctx) => {
  try {
    const type = ((ctx?.match && ctx?.match[0] === "confirm-left-no") || typeof ctx.session[itemsDataKey] === "undefined") ? 2 : 1;

    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-left-no";

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }

    if (type === 2) {
      await ctx.reply(
        "Mashinada nechta maxsulot butun qolganini kiriting",
        Markup.keyboard([
          ["Bekor qilish ❌"]
        ])
      );
    }

    promptLeft(ctx, type);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Qolgan butun maxsulot qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

const confirmLeftItems = async (ctx) => {
  try {
    const leftItems = ctx.session[itemsDataKey];
    let amountMsg = "";

    if (!leftItems || Object.keys(leftItems).length === 0) {
      amountMsg = "yo'q";
      await ctx.reply(`Qolgan butun maxsulotlar: ${amountMsg}`);
      this.addLeft(ctx);
      return;
    } else {
      for (let category in leftItems) {
        amountMsg += `${letters[category]}: ${leftItems[category]}\n`;
      }
    }

    ctx.session[sessionKey] = false;

    await ctx.reply(`Qolgan butun maxsulotlar\n\n${amountMsg}`);
    await ctx.reply(`Kiritilganini qolgan butun maxsulotlar sonini tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Ha ✅", "confirm-left-yes"),
        Markup.button.callback("Yo'q ❌", "confirm-left-no")],
      ])
    );

    ctx.session.awaitingLeft = false;
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Qolgan butun maxsulot qo'shishda xatolik yuz berdi. Qayta urunib ko'ring"
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
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }

    // for (let y in Object.keys(ctx.session[itemsDataKey] || {})) {
    //     const x = Object.keys(ctx.session[itemsDataKey])[y];
      
    //     // If current[x] is not defined, set it to 0
    //     if (typeof current[x] === 'undefined') {
    //       current[x] = 0;
    //     }
      
    //     // If incision[x] is not defined, set it to 0
    //     if (typeof incision[x] === 'undefined') {
    //       incision[x] = 0;
    //     }

    //     if (current[x] < ctx.session[itemsDataKey][x]) {
    //       await ctx.reply(`Sizda ${letters[x]} kategoriya bo’yicha ${current[x]}ta dan ko’p qolishi mumkin emas!`,
    //         Markup.keyboard([["Bekor qilish ❌"]])
    //       );

    //       ctx.session[itemsDataKey] = undefined;
    //       ctx.session.categories = null;
    //       ctx.session.currentCategoryIndex = null;

    //       return;
    //     }
    // };

    ctx.session.updatedActivity = {
      ...ctx.session.updatedActivity,
      current_by_courier: ctx.session[itemsDataKey],
    };
  
    ctx.session[itemsDataKey] = undefined;
    ctx.session.categories = null;
    ctx.session.currentCategoryIndex = null;

    await sendMelange(ctx);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Qolgan butun maxsulot qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
