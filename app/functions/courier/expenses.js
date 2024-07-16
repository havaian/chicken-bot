const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logging");

const cancel = require("../general/cancel");

exports.sendExpenses = async (ctx) => {
  ctx.session.awaitingExpenses = true;
  await ctx.reply(
    "Bugungi chiqim miqdori necha so’mligini kiriting",
    Markup.keyboard([
      ["Bekor qilish"]
    ]).resize().oneTime()
  );
};

exports.confirmExpenses = async (ctx) => {
  if (ctx.session.awaitingExpenses) {
    const amount = parseInt(ctx.message.text, 10);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(
        "Noto’g’ri qiymat. Iltimos, chiqim miqdorini yozib yuboring.",
        Markup.keyboard([
            ["Bekor qilish"]
        ]).resize().oneTime()
      );
      return;
    }
    ctx.session.expenseAmount = amount;
    await ctx.reply(
      `Siz ${amount} so’m chiqim kiritmoqchimisiz?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Tasdiqlash", `confirm-expenses:${amount}`)],
        [Markup.button.callback("Bekor qilish", "cancel")],
      ])
    );

    // Delete the previous message
    await ctx.deleteMessage();
    ctx.session.awaitingExpenses = false;
  }
};

exports.addExpenses = async (ctx) => {
  const amount = ctx.session.expenseAmount;
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

    // Update courier"s activity with expenses
    const updatedCourierActivity = {
      ...courierActivity,
      expenses: courierActivity.expenses + amount,
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

    cancel(ctx, `${amount} so’m chiqim hisobingizga qo’shildi.`);
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Chiqim qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
