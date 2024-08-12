const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logging");

const cancel = require("../general/cancel");

const { sendDayFinished } = require("./finishDay");

const eggsDataKey = "leftMoneyAmount";

exports.sendLeftMoney = async (ctx) => {
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

  if (courierActivity.money_by_courier > 0) {
    sendDayFinished(ctx);
    return;
  }

  ctx.session.awaitingMoney = true;
  await ctx.reply(
    "Kassaga necha pul topshirilganini kiriting",
    Markup.keyboard([
      ["Bekor qilish"]
    ])
  );
};

exports.confirmLeftMoney = async (ctx) => {
  if (ctx.session.awaitingMoney) {
    const amount = parseInt(ctx.message.text, 10);
    if (isNaN(amount) || amount < 0) {
      await ctx.reply(
        "Noto’g’ri qiymat. Iltimos, topshirilgan kassa miqdorini yozib yuboring.",
        Markup.keyboard([
            ["Bekor qilish"]
        ])
      );
      return;
    }
    ctx.session[eggsDataKey] = amount;

    await ctx.reply(
      `Siz ${amount} so’m pul kassaga topshirdingizmi?`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Tasdiqlash", `confirm-money-left:${amount}`),
          Markup.button.callback("Bekor qilish", "cancel")
        ],
      ])
    );

    // Delete the previous message
    await ctx.deleteMessage();
    ctx.session.awaitingMoney = false;
  }
};

exports.addLeftMoney = async (ctx) => {
  try {
    ctx.session.updatedActivity = {
      ...ctx.session.updatedActivity,
      money_by_courier: ctx.session[eggsDataKey],
    };

    // Delete the previous message
    await ctx.deleteMessage();
  
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
