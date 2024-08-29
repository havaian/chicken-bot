const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logging");

const { sendLeftMoney } = require("./leftMoney");
;
const letters = require("../data/btnEmojis");

const nonZero = require("../general/non-zero");
let eggs = "";

const sessionKey = "awaitingMelangeEggs";
const eggsDataKey = "eggsMelangeData";

const promptMelange = async (ctx, type) => {
    try {
        eggs = nonZero(ctx.session.currentEggs);
    
        if (
            !ctx.session.categories || type === 2) {
            ctx.session.categories = Object.keys(eggs);
            ctx.session.currentCategoryIndex = 0;
            ctx.session[eggsDataKey] = {};
            ctx.session[sessionKey] = true;
        }
    
        if (sessionKey) {
            const category = ctx.session.categories[ctx.session.currentCategoryIndex];
    
            if (ctx.message && ctx.message.text && type != 2) {
                const amount = parseFloat(ctx.message.text, 2);
                if (isNaN(amount) || amount < 0) {
                    await ctx.reply("Iltimos, to’g’ri son kiriting:");
                    return;
                }
    
                if (amount < 0) {
                    await ctx.reply(`Melanj 0 litrdan kam bolishi mumkin emas`);
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
                await ctx.reply(`Nechta ${letters[nextCategory]} kategoriya melanj chiqdi?`);
            } else {
                await this.acceptMelange(ctx);
            }
        }
    } catch (error) {
        logger.info(error);
        ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
    }
}

exports.sendMelange = async (ctx) => {
  try {
    const type = ((ctx?.match && ctx?.match[0] === "confirm-melange-eggs-no") || typeof ctx.session[eggsDataKey] === "undefined") ? 2 : 1;

    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-melange-eggs-no";

    if (deleteMsg) {
      await ctx.deleteMessage();
    }

    promptMelange(ctx, type);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Qolgan butun tuxum qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

module.exports.acceptMelange = async (ctx) => {
    try {
      const melangeData = ctx.session[eggsDataKey];
      let amountMsg = "";
  
      if (!melangeData || Object.keys(melangeData).length === 0) {
        amountMsg = "Yo'q";
        this.confirmMelangeEggs(ctx);
        return;
      } else {
        for (let category in melangeData) {
          amountMsg += `${letters[category]}: ${melangeData[category]} litr\n`;
        }
      }
  
      ctx.session[sessionKey] = false;
  
      await ctx.reply(`Melanj\n\n${amountMsg}`);
      await ctx.reply("Kiritilgan melanj qiymatini tasdiqlaysizmi?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Ha ✅", "confirm-melange-eggs-yes"),
            Markup.button.callback("Yo'q ❌", "confirm-melange-eggs-no"),
          ]
        ])
      );
    } catch (error) {
      logger.info(error);
      await ctx.reply("Melanj kiritilganini tasdiqlastishda xatolik yuz berdi. Qayta uruni ko'ring");
    }
};

module.exports.confirmMelangeEggs = async (ctx) => {
    try {        
        const insicion = ctx.session.updatedActivity.incision;

        for (let y in Object.keys(insicion || {})) {
            const x = Object.keys(insicion)[y];
      
            // If insicion[x] is not defined, set it to 0
            if (typeof insicion[x] === 'undefined') {
                insicion[x] = 0;
            }

            ctx.session.updatedActivity.current[x] = ctx.session.updatedActivity.current[x] - (ctx.session[eggsDataKey][x] * 28);
        };

        ctx.session.updatedActivity = {
          ...ctx.session.updatedActivity,
          melange_by_courier: ctx.session[eggsDataKey],
        };

        const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-melange-eggs-yes";
    
        if (deleteMsg) {
          await ctx.deleteMessage();
        }

        ctx.session[eggsDataKey] = undefined;

        await sendLeftMoney(ctx);
    } catch (error) {
        logger.info(error);
        await ctx.reply(
            "Melanj qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
        );
    }
};