const { Markup } = require("telegraf");
const axios = require("../../axios");
const {
  generateCourierHTML,
  generateCourierExcel,
} = require("../report/courierReport");
const convertHTMLToImage = require("../report/convertHTMLToImage");
const path = require("path");
const fs = require("fs");
const groups = require("../data/groups");

const { logger, readLog } = require("../../utils/logging");

const cancel = require("../general/cancel");

exports.sendDayFinished = async (ctx) => {
  try {
    await ctx.reply(
      "Kun yakunlanganidan keyin ma’lumot kiritish taqiqlanadi. Tasdiqlaysizmi?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Tasdiqlash", `confirm-day-finished`),
          Markup.button.callback("Bekor qilish", "cancel")
        ],
      ]),
      Markup.keyboard([
        ["Bekor qilish"]
      ])
    );
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Ish kunni yakunlashda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

exports.confirmDayFinished = async (ctx) => {
  try {
    const courierPhoneNum = ctx.session.user.phone_num;

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

    const courierResponse = await axios.get(`/courier/${courierPhoneNum}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const courier = courierResponse.data;
    courierActivity.courier_name = courier.full_name;
    courierActivity.car_num = courier.car_num;

    // Update courier"s activity with left
    const updatedCourierActivity = {
      ... ctx.session.updatedActivity,
      day_finished: true,
    };

    ctx.session.dayFinished = true;

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

    // Find the group id by courier's phone number
    let groupId = null;
    for (const [id, numbers] of Object.entries(groups)) {
      if (numbers.includes(courierPhoneNum)) {
        groupId = id;
        break;
      }
    }

    if (!groupId) {
      logger.info("finishDay. Courier groupId not found:", groupId, !groupId);
      await ctx.reply("Guruh topilmadi. Qayta urunib ko‘ring.");
      return;
    }

    // File paths
    const reportDate = new Date().toISOString().split("T")[0];
    const reportDir = path.join(
      "reports",
      `courier/${reportDate}`,
      courierPhoneNum
    );
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Delete old reports
    fs.readdirSync(reportDir).forEach((file) => {
      fs.unlinkSync(path.join(reportDir, file));
    });

    const htmlFilename = path.join(reportDir, `${updatedCourierActivity._id}.html`);
    const imageFilename = path.join(reportDir, `${updatedCourierActivity._id}.jpg`);
    const excelFilename = path.join(reportDir, `${updatedCourierActivity._id}.xlsx`);

    // Generate HTML and Excel reports
    generateCourierHTML(updatedCourierActivity, htmlFilename);
    await generateCourierExcel(updatedCourierActivity, excelFilename);

    // Convert HTML report to image
    await convertHTMLToImage(htmlFilename, imageFilename);

    // Send image and Excel file to user
    await ctx.replyWithPhoto({ source: imageFilename });
    // await ctx.replyWithDocument({ source: excelFilename });

    // // Forward reports to the group
    // await ctx.telegram.sendDocument(
    //   groupId,
    //   { source: excelFilename },
    //   { caption: `${courier.full_name}. Kun tugatildi. Xisobot:` }
    // );
    // Forward reports to the group
    await ctx.telegram.sendPhoto(
      groupId,
      { source: imageFilename },
      { caption: `${courier.full_name}. Kun tugatildi. Xisobot:` }
    );

    cancel(ctx, `Ish kunini yakunladingiz.`);
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Ish kunni yakunlashda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
