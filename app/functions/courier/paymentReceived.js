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
const message = require("../data/message");

const sendSMS = require("../../utils/message/index");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");

module.exports = async (ctx) => {
  await ctx.deleteMessage();
  ctx.session.awaitingPaymentAmount = true;
  await ctx.reply("Iltimos, necha pul olganingizni kiriting:");
};

module.exports.completeTransaction = async (ctx) => {
  const selectedBuyer = ctx.session.buyer;

  const paymentAmount = ctx.message.text
  selectedBuyer.paymentAmount = paymentAmount;

  if (paymentAmount < 0) {
    await ctx.reply("Noldan baland bo’lgan pul qiymatini kiriting");
    return;
  }

  await ctx.reply(`Siz ${paymentAmount} so’m pul olganingizni kiritdingiz`);

  await ctx.reply(
    `Tasdiqlaysizmi?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Tasdiqlash", "confirm-transaction"), 
        Markup.button.callback("Bekor qilish", "cancel")
      ],
    ])
  );
};

module.exports.confirmTransaction = async (ctx) => {
  await handleCircleVideo(ctx);

  // Delete the previous message
  await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
};

const handleCircleVideo = async (ctx) => {
  try {
    const courierPhoneNum = ctx.session.user.phone_num;

    // Find the group id by courier's phone number
    let groupId = null;
    for (const [id, numbers] of Object.entries(groups)) {
      if (numbers.includes(courierPhoneNum)) {
        groupId = id;
        break;
      }
    }

    if (!groupId) {
      logger.info("paymentReceived. Courier groupId not found:", groupId, !groupId);
      await ctx.reply("Guruh topilmadi. Qayta urunib ko‘ring.");
      return;
    }

    const selectedBuyer = ctx.session.buyer;
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
    courierActivity.car_num = courier.car_num;

    let msg = "";
    let totalPrice = 0;

    const paymentAmount = parseInt(selectedBuyer.paymentAmount, 10);

    const current = courierActivity.current || {};

    for (let x in Object.keys(selectedBuyer.eggsDelivered)) {
      msg += `${selectedBuyer.eggsDelivered[x].category}: ${selectedBuyer.eggsDelivered[x].amount} (${egg_price[selectedBuyer.eggsDelivered[x].category]} so‘m)\n`;
      totalPrice += selectedBuyer.eggsDelivered[x].amount * egg_price[selectedBuyer.eggsDelivered[x].category];
      selectedBuyer.eggsDelivered[x].price = egg_price[selectedBuyer.eggsDelivered[x].category];
      if (Object.keys(current).length > 0) {
        if (current[selectedBuyer.eggsDelivered[x].category] - selectedBuyer.eggsDelivered[x].amount < 0) { 
          ctx.reply("Sizning moshinangizda tuxum yetarli emas"); 
          return; 
        } else { 
          current[selectedBuyer.eggsDelivered[x].category] = current[selectedBuyer.eggsDelivered[x].category] - selectedBuyer.eggsDelivered[x].amount;
        }
      }
    }

    // Create delivered_to object with details
    const deliveryDetailsBuyer = {
      courier: {
        _id: courier._id,
        full_name: courier.full_name,
        phone_num: courier.phone_num,
        car_num: courier.car_num,
      },
      eggs: selectedBuyer.eggsDelivered || [],
      payment: paymentAmount || 0,
      debt: buyerActivity.payment + totalPrice - paymentAmount,
      time: new Date().toLocaleString(),
    };

    // Update buyer's activity
    const updatedBuyerActivity = {
      ...buyerActivity,
      accepted: [...buyerActivity.accepted, deliveryDetailsBuyer],
      debt: buyerActivity.debt + totalPrice - paymentAmount,
    };

    let eggsMsg = "";

    for (let y in Object.keys(selectedBuyer.eggsDelivered)) {
      const x = Object.keys(selectedBuyer.eggsDelivered)[y];
      eggsMsg += selectedBuyer.eggsDelivered[x].amount > 0 ? `${selectedBuyer.eggsDelivered[x].category}: ${selectedBuyer.eggsDelivered[x].amount}ta (${egg_price[selectedBuyer.eggsDelivered[x].category]} so'm)\n` : "";
    }

    const text = await message(
      eggsMsg,
      selectedBuyer.paymentAmount,
      totalPrice - paymentAmount,
      buyerActivity.debt + totalPrice - paymentAmount
    );

    selectedBuyer.phone_num ? sendSMS(selectedBuyer.phone_num, text) : {};

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
      buyer: {
        _id: selectedBuyer._id,
        full_name: selectedBuyer.full_name,
        phone_num: selectedBuyer.phone_num,
      },
      name: selectedBuyer.full_name,
      eggs: selectedBuyer.eggsDelivered || [],
      payment: paymentAmount || 0,
      debt: buyerActivity.debt + totalPrice - paymentAmount,
      time: new Date().toLocaleString(), // Add the time of the delivery
    };

    // Update courier's activity
    const updatedCourierActivity = {
      ...courierActivity,
      delivered_to: [...courierActivity.delivered_to, deliveryDetailsCourier],
      earnings: courierActivity.earnings + paymentAmount,
      current: courierActivity.current || {},
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
    // await ctx.replyWithDocument({ source: excelFilename });

    // // Forward reports to the group
    // await ctx.telegram.sendDocument(
    //   groupId,
    //   { source: excelFilename },
    //   { caption: `${courier.full_name}. Tuxum yetkazildi. Xisobot:` }
    // );
    // Forward reports to the group
    await ctx.telegram.sendPhoto(
      groupId,
      { source: imageFilename },
      { caption: `${courier.full_name}. Tuxum yetkazildi. Xisobot:` }
    );

    cancel(ctx, "Tanlang:");
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Yetkazishni yakunlashda xatolik yuz berdi. Qayta urunib ko‘ring."
    );
  }
};