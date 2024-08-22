const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logging");

const cancel = require("../general/cancel");

const { sendDayFinished } = require("./finishDay");

const eggsDataKey = "leftMoneyAmount";

exports.sendLeftMoney = async (ctx) => {
  try {
    ctx.session.awaitingMoney = true;
    await ctx.reply(
      "Kassaga necha pul topshirilganini kiriting",
      Markup.keyboard([
        ["Bekor qilish ❌"]
      ])
    );

    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-money-left-no";

    if (deleteMsg) {
      await ctx.deleteMessage();
    }

  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

exports.confirmLeftMoney = async (ctx) => {
  try {
    if (ctx.session.awaitingMoney) {
      const amount = parseInt(ctx.message.text, 10);
      if (isNaN(amount) || amount < 0) {
        await ctx.reply(
          "Noto’g’ri qiymat. Iltimos, topshirilgan kassa miqdorini yozib yuboring.",
          Markup.keyboard([
              ["Bekor qilish ❌"]
          ])
        );
        return;
      }
      ctx.session[eggsDataKey] = amount;
  
      await ctx.reply(
        `Siz ${amount} so’m pul kassaga topshirdingizmi?`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Ha ✅ ", `confirm-money-left-yes`),
            Markup.button.callback("Yo’q ❌", "confirm-money-left-no")
          ],
        ])
      );
      
      ctx.session.awaitingMoney = false;
    }
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

exports.addLeftMoney = async (ctx) => {
  try {
    ctx.session.updatedActivity = {
      ...ctx.session.updatedActivity,
      money_by_courier: ctx.session[eggsDataKey],
    };

    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-money-left-yes";

    if (deleteMsg) {
      await ctx.deleteMessage();
    }
  
    ctx.session[eggsDataKey] = undefined;
    ctx.session.categories = null;
    ctx.session.currentCategoryIndex = null;

    await sendDayFinished(ctx);
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Kassaga topshirilgan pul qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
