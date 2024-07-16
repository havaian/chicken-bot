const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logs");

const cancel = require("../general/cancel");

exports.sendBrokenEggs = async (ctx) => {
  ctx.session.awaitingBrokenEggs = true;
  await ctx.reply(
    "Iltimos, singan tuxumlar miqdorini yozib yuboring.",
    Markup.keyboard([
      ["Bekor qilish"]
    ]).resize().oneTime()
  );
};

exports.confirmBrokenEggs = async (ctx) => {
  if (ctx.session.awaitingBrokenEggs) {
    const amount = parseInt(ctx.message.text, 10);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(
        "Noto’g’ri qiymat. Iltimos, singan tuxumlar miqdorini yozib yuboring.",
        Markup.keyboard([
            ["Bekor qilish"]
        ]).resize().oneTime()
      );
      return;
    }
    ctx.session.brokenEggsAmount = amount;
    await ctx.reply(
      `Siz ${amount}ta singan tuxum kiritilganini tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Tasdiqlash", `confirm-broken-eggs:${amount}`)],
        [Markup.button.callback("Bekor qilish", "cancel")],
      ])
    );
    ctx.session.awaitingBrokenEggs = false;
  }
};

exports.addBrokenEggs = async (ctx) => {
  const amount = ctx.session.brokenEggsAmount;
  const courierPhoneNum = ctx.session.user.phone_num;

  try {
    // Get today's activity for the courier
    const courierActivityResponse = await axios.get(
      `/courier/activity/today/${courierPhoneNum}`,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const courierActivity = courierActivityResponse.data;

    // Update courier"s activity with broken eggs
    const updatedCourierActivity = {
      ...courierActivity,
      broken: courierActivity.broken + amount,
    };

    await axios.put(
      `/courier/activity/${courierActivity._id}`,
      updatedCourierActivity,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );

    // Delete the previous message
    await ctx.deleteMessage();

    cancel(ctx, `Sizning hisobingizga ${amount}ta singan tuxum qo’shildi`);
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Singan tuxumlar qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
