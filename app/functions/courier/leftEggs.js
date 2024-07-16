const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logs");

exports.sendLeft = async (ctx) => {
  ctx.session.awaitingLeft = true;
  await ctx.reply(
    "Mashinada nechta tuxum qolganini kiriting",
    Markup.inlineKeyboard([[Markup.button.callback("Bekor qilish", "cancel")]])
  );
};

exports.confirmLeft = async (ctx) => {
  if (ctx.session.awaitingLeft) {
    const amount = parseInt(ctx.message.text, 10);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(
        "Noto’g’ri qiymat. Iltimos, chiqim miqdorini yozib yuboring."
      );
      return;
    }
    ctx.session.leftAmount = amount;

    await ctx.reply(
      `Siz ${amount}ta qolgan tuxum kiritmoqchimisiz?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Tasdiqlash", `confirm-left:${amount}`)],
        [Markup.button.callback("Bekor qilish", "cancel")],
      ])
    );

    // Delete the previous message
    await ctx.deleteMessage();
    ctx.session.awaitingLeft = false;
  }
};

exports.addLeft = async (ctx) => {
  const amount = ctx.session.leftAmount;
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

    // Update courier"s activity with left
    const updatedCourierActivity = {
      ...courierActivity,
      current_by_courier: ctx.session.leftAmount,
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

    await ctx.reply(
      `${amount}ta tuxum qoldiq hisobingizga qo’shildi.`,
      Markup.keyboard([
        ["Tuxum yetkazildi", "Singan tuxumlar"],
        ["Chiqim", "Qolgan tuxumlar"],
        ["Hisobot"]
      ]).resize()
    );

    // Clear the session variable
    delete ctx.session.leftAmount;
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Qolgan tuxum qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
