const { Markup } = require("telegraf");
const axios = require("../../axios");

const { logger, readLog } = require("../../utils/logging");

const cancel = require("../general/cancel");

const report = require("./report");

exports.sendDayFinished = async (ctx) => {
  try {
    await ctx.reply(
      "Kun yakunlanganidan keyin ma’lumot kiritish taqiqlanadi. Tasdiqlaysizmi?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Tasdiqlash ✅ ", `confirm-day-finished`),
          Markup.button.callback("Bekor qilish ❌", "cancel")
        ],
      ]),
      Markup.keyboard([
        ["Bekor qilish ❌"]
      ])
    );
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Ish kunni yakunlashda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

exports.confirmDayFinished = async (ctx) => {
  try {
    const phone_num = ctx.session.user.phone_num;

    const courierResponse = await axios.get(`/courier/${phone_num}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courier = courierResponse.data;

    // Update courier"s activity with left
    const updatedCourierActivity = {
      ... ctx.session.updatedActivity,
      day_finished: true,
    };

    const full_name = `${courier.full_name} ${courier.car_num ? "(" + courier.car_num + ")" : ""}`;

    updatedCourierActivity.courier_name = courier.full_name;
    updatedCourierActivity.car_num = courier.car_num;

    // ctx.session.dayFinished = true;
    ctx.session.accepted = false;
    ctx.session.currentEggs = null;

    await axios.put(
      `/courier/activity/${updatedCourierActivity._id}`,
      updatedCourierActivity,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );

    // Delete the previous message
    await ctx.deleteMessage();

    ctx.session.updatedActivity = undefined;
        
    await report(updatedCourierActivity, ctx, phone_num, full_name, "📊 Kun tugatildi", forward = true);

    cancel(ctx, `Ish kunini yakunladingiz.`);
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Ish kunni yakunlashda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
