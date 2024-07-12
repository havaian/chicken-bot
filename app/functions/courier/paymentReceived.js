const axios = require("../../axios");
const {
  generateCourierHTML,
  generateCourierExcel,
} = require("../report/courierReport");
const convertHTMLToImage = require("../report/convertHTMLToImage");
const { Markup } = require("telegraf");
const path = require("path");
const fs = require("fs");
const groups = require("../data/groups");
const egg_price = require("../data/prices");

const sendSMS = require("../../utils/message");

const { logger, readLog } = require("../../utils/logs");

module.exports = async (ctx) => {
  const action = ctx.match[0];
  ctx.session.buyers = ctx.session.buyers || [];

  switch (action) {
    case "payment-received-yes":
      await ctx.reply(
        "Nech pul olindi?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("30", "payment-amount:30"),
            Markup.button.callback("60", "payment-amount:60"),
          ],
          [
            Markup.button.callback("90", "payment-amount:90"),
            Markup.button.callback("120", "payment-amount:120"),
          ],
          [
            Markup.button.callback("150", "payment-amount:150"),
            Markup.button.callback("180", "payment-amount:180"),
          ],
          [Markup.button.callback("Boshqa", "payment-other")],
          [Markup.button.callback("Bekor qilish", "cancel")],
        ])
      );
      break;

    case "payment-received-no":
      await completeTransaction(ctx, 0);
      break;

    case "payment-other":
      ctx.session.awaitingPaymentAmount = true;
      await ctx.reply("Iltimos, necha pul olganingizni kiriting:");
      break;

    default:
      const amount = action.split(":")[1];
      await completeTransaction(ctx, parseInt(amount, 10));
      break;
  }

  // Delete the previous message
  await ctx.deleteMessage();
};

async function completeTransaction(ctx, paymentAmount) {
  const selectedBuyer = ctx.session.buyers[ctx.session.buyers.length - 1];

  selectedBuyer.paymentAmount = paymentAmount;

  if (paymentAmount < 0) {
    await ctx.reply("Noldan baland bo’lgan pul qiymatini kiriting");
    return;
  }

  await ctx.reply(`Siz ${paymentAmount} so’m pul olganingizni kiritdingiz`);

  await ctx.reply(
    `Tasdiqlaysizmi?`,
    Markup.inlineKeyboard([
      [Markup.button.callback("Tasdiqlash", "confirm-transaction")],
      [Markup.button.callback("Bekor qilish", "cancel")],
    ])
  );
}

module.exports.confirmTransaction = async (ctx) => {
  await ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.");
  ctx.session.awaitingCircleVideo = true;

  // Delete the previous message
  await ctx.deleteMessage();
};

module.exports.handleCircleVideo = async (ctx) => {
  if (!ctx.message.video_note || ctx.message.forward_from) {
    await ctx.reply("Iltimos, hisobot uchun dumaloq video yuboring.");
    return;
  }

  if (ctx.message.video_note.duration < 5) {
    await ctx.reply("Hisobot uchun dumaloq video uzunligi 4 soniyadan kam bo‘lmasligi kerak.");
    return;
  }

  const courierPhoneNum = ctx.session.user.phone_num;

  // Find the group id by courier"s phone number
  let groupId = null;
  for (const [id, numbers] of Object.entries(groups)) {
    if (numbers.includes(courierPhoneNum)) {
      groupId = id;
      break;
    }
  }

  if (!groupId) {
    await ctx.reply("Guruh topilmadi. Qayta urunib ko‘ring.");
    return;
  }

  try {
    // Forward the video to the group
    await ctx.forwardMessage(groupId);

    const selectedBuyer = ctx.session.buyers[ctx.session.buyers.length - 1];
    // Get today's activity for the buyer
    const buyerActivityResponse = await axios.get(
      `/buyer/activity/today/${selectedBuyer.phone_num || selectedBuyer._id}`,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );
    const buyerActivity = buyerActivityResponse.data;

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

    // Create delivered_to object with details
    const deliveryDetailsBuyer = {
      courier: {
        _id: courier._id,
        full_name: courier.full_name,
        phone_num: courier.phone_num,
        car_num: courier.car_num,
      },
      eggs: selectedBuyer.eggsDelivered || 0,
      payment: selectedBuyer.paymentAmount || 0,
      price: egg_price,
      debt: buyerActivity.payment,
      time: new Date().toLocaleString(), // Add the time of the delivery
    };

    // Update buyer"s activity
    const updatedBuyerActivity = {
      ...buyerActivity,
      accepted: [...buyerActivity.accepted, deliveryDetailsBuyer],
      payment:
        buyerActivity.payment -
        selectedBuyer.paymentAmount +
        (selectedBuyer.eggsDelivered || 0) * egg_price,
    };

    await axios.put(
      `/buyer/activity/${buyerActivity._id}`,
      updatedBuyerActivity,
      {
        headers: {
          "x-user-telegram-chat-id": ctx.chat.id,
        },
      }
    );

    // Create delivered_to object with details
    const deliveryDetailsCourier = {
      id: selectedBuyer._id,
      name: selectedBuyer.full_name,
      eggs: selectedBuyer.eggsDelivered || 0,
      payment: selectedBuyer.paymentAmount || 0,
      price: egg_price,
      debt: updatedBuyerActivity.payment,
      time: new Date().toLocaleString(), // Add the time of the delivery
    };

    // Update courier"s activity
    const updatedCourierActivity = {
      ...courierActivity,
      delivered_to: [...courierActivity.delivered_to, deliveryDetailsCourier],
      earnings: courierActivity.earnings + selectedBuyer.paymentAmount,
      current: courierActivity.current - (selectedBuyer.eggsDelivered || 0), // Subtract eggs delivered from current
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

    const htmlFilename = path.join(reportDir, `${courierActivity._id}.html`);
    const imageFilename = path.join(reportDir, `${courierActivity._id}.jpg`);
    const excelFilename = path.join(reportDir, `${courierActivity._id}.xlsx`);

    // Generate HTML and Excel reports
    generateCourierHTML(updatedCourierActivity, htmlFilename);
    await generateCourierExcel(updatedCourierActivity, excelFilename);

    // Convert HTML report to image
    await convertHTMLToImage(htmlFilename, imageFilename);

    // Send image and Excel file to user
    await ctx.replyWithPhoto({ source: imageFilename });
    await ctx.replyWithDocument({ source: excelFilename });

    // Forward reports to the group
    await ctx.telegram.sendDocument(
      groupId,
      { source: excelFilename },
      { caption: `Xisobot: ${courier.full_name}` }
    );
    await ctx.telegram.sendPhoto(
      groupId,
      { source: imageFilename },
      { caption: `Xisobot: ${courier.full_name}` }
    );

    // Show main menu buttons
    await ctx.reply(
      "Tanlang:",
      Markup.keyboard([
        ["Tuxum yetkazildi", "Singan tuxumlar"],
        ["Chiqim", "Hisobot"],
      ]).resize()
    );

    // Clear session video flag
    ctx.session.awaitingCircleVideo = false;
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Tranzaktsiyani yakunlashda xatolik yuz berdi. Qayta urunib ko‘ring."
    );
  }
};
