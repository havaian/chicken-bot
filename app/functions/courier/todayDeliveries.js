const axios = require("../../axios");
const { Markup } = require("telegraf");

const { logger, readLog } = require("../../utils/logging");

const report = require("./report");

module.exports = async (ctx) => {
  const phone_num = ctx.session.user.phone_num;
  try {
    // Get today's activity for the courier
    const courierActivityResponse = await axios.get(
      `/courier/activity/today/${phone_num}`,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const courierActivity = courierActivityResponse.data;

    const courierResponse = await axios.get(`/courier/${phone_num}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courier = courierResponse.data;

    const full_name = `${courier.full_name} ${courier.car_num ? "(" + courier.car_num + ")" : ""}`;

    courierActivity.courier_name = courier.full_name;
    courierActivity.car_num = courier.car_num;
        
    await report(courierActivity, ctx, groupId = "", phone_num, full_name, "Hisobot", forward = false);

    // Show main menu buttons
    await ctx.reply(
      "Tanlang:",
      Markup.keyboard([
        ["Tuxum yetkazildi", "Kunni yakunlash"],
        ["Chiqim", "Hisobot"]
      ])
    );
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Bugungi yetkazmalarni olishda xatolik yuz berdi. Qayta urunib ko’ring."
    );
  }
};
