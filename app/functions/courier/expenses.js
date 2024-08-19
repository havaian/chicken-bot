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

exports.sendExpenses = async (ctx) => {
  try {
    ctx.session.awaitingExpenses = true;
    await ctx.reply(
      "Bugungi chiqim miqdori necha so’mligini kiriting",
      Markup.keyboard([
        ["Bekor qilish ❌"]
      ])
    );
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Chiqim qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

exports.confirmExpenses = async (ctx) => {
  try {
    if (ctx.session.awaitingExpenses) {
      const amount = parseInt(ctx.message.text, 10);
      if (isNaN(amount) || amount <= 0) {
        await ctx.reply(
          "Noto’g’ri qiymat. Iltimos, chiqim miqdorini yozib yuboring.",
          Markup.keyboard([
              ["Bekor qilish ❌"]
          ])
        );
        return;
      }
      ctx.session.expenseAmount = amount;
      await ctx.reply(
        `Siz ${amount} so’m chiqim kiritmoqchimisiz?`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Tasdiqlash ✅ ", `confirm-expenses:${amount}`), 
            Markup.button.callback("Bekor qilish ❌", "cancel")
          ],
        ])
      );
  
      // Delete the previous message
      await ctx.deleteMessage();
      ctx.session.awaitingExpenses = false;
    }
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Chiqim qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};

exports.addExpenses = async (ctx) => {
  const amount = ctx.session.expenseAmount;

  try {
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

    updatedCourierActivity.courier_name = courier.full_name;
    updatedCourierActivity.car_num = courier.car_num;

    // Find the group id by courier's phone number
    let groupId = null;
    for (const [id, numbers] of Object.entries(groups)) {
      if (numbers.includes(courierPhoneNum)) {
        groupId = id;
        break;
      }
    }

    if (!groupId) {
      logger.info("expenses. Courier groupId not found:", groupId, !groupId);
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
      { caption: `${courier.full_name}. Pul chiqimi. Xisobot:` }
    );

    cancel(ctx, `${amount} so’m chiqim hisobingizga qo’shildi.`);
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Chiqim qo’shishda xatolik yuz berdi. Qayta urunib ko’ring"
    );
  }
};
