const axios = require("../../axios");
const { Markup } = require("telegraf");
const groups = require("../data/groups");
const message = require("../data/message");

const sendSMS = require("../../utils/message/index");

const cancel = require("../general/cancel");

const { logger, readLog } = require("../../utils/logging");

const report = require("./report");

module.exports = async (ctx) => {
  try {
    // await ctx.deleteMessage();
    ctx.session.awaitingPaymentAmount = true;
    await ctx.reply(`Mijoz: ${ctx.session.buyer.full_name}\n\nNecha pul olganingizni kiriting:`);
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.completeTransaction = async (ctx) => {
  try {
    const selectedBuyer = ctx.session.buyer;
  
    const paymentAmount = ctx.message.text
    selectedBuyer.paymentAmount = paymentAmount;
  
    if (paymentAmount < 0) {
      await ctx.reply("Noldan baland bo’lgan pul qiymatini kiriting");
      return;
    }

    ctx.session.awaitingPaymentAmount = false;
  
    await ctx.reply(`Siz ${paymentAmount} so’m pul olganingizni kiritdingiz`);
  
    await ctx.reply(
      `Tasdiqlaysizmi?`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Ha ✅ ", "confirm-transaction"), 
          Markup.button.callback("Yo’q ❌", "confirm-transaction-no")
        ],
      ])
    );
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.confirmTransaction = async (ctx) => {
  try {
    await handleCircleVideo(ctx);
  
    // Delete the previous message
    await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
  } catch (error) {
    logger.info(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

const handleCircleVideo = async (ctx) => {
  try {
    const phone_num = ctx.session.user.phone_num;

    // Find the group id by courier's phone number
    let groupId = groups;

    if (!groupId) {
      logger.info("paymentReceived. Courier groupId not found:", groupId, !groupId);
      await ctx.reply("Guruh topilmadi. Qayta urunib ko‘ring.");
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

    const paymentAmount = parseInt(selectedBuyer.paymentAmount, 10);

    let totalPrice = 0;
    let eggsMsg = "";

    const current = courierActivity.current || {};

    const egg_price = selectedBuyer.egg_price;

    for (let x in selectedBuyer.eggsDelivered) {   
      const amount = selectedBuyer.eggsDelivered[x].amount;
      const category = selectedBuyer.eggsDelivered[x].category;

      // Necessary to have the price of eggs in the report
      selectedBuyer.eggsDelivered[x].price = egg_price[selectedBuyer.eggsDelivered[x].category];

      totalPrice += amount * egg_price[category];
      
      eggsMsg += amount > 0 ? `${category}: ${amount}ta (${egg_price[category]})\n` : "";

      if (Object.keys(current).length > 0) {
        if (current[category] - amount < 0) { 
          ctx.reply("Sizning moshinangizda tuxum yetarli emas"); 
          return; 
        } else { 
          current[category] = current[category] - amount;
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
      debt: buyerActivity.debt + (totalPrice || 0) - (paymentAmount || 0),
      time: new Date().toLocaleString(),
    };

    // Update buyer's activity
    const updatedBuyerActivity = {
      ...buyerActivity,
      accepted: [...buyerActivity.accepted, deliveryDetailsBuyer],
      debt: buyerActivity.debt + (totalPrice || 0) - (paymentAmount || 0),
    };

    const text = await message(
      eggsMsg,
      selectedBuyer.paymentAmount,
      totalPrice - paymentAmount,
      totalPrice,
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

    const full_name = `${courier.full_name} ${courier.car_num ? "(" + courier.car_num + ")" : ""}`;

    updatedCourierActivity.courier_name = courier.full_name;
    updatedCourierActivity.car_num = courier.car_num;
        
    await report(updatedCourierActivity, ctx, groupId, phone_num, full_name, "Tuxum yetkazildi", forward = true);

    cancel(ctx, "Tanlang:");
  } catch (error) {
    logger.info(error);
    await ctx.reply(
      "Yetkazishni yakunlashda xatolik yuz berdi. Qayta urunib ko‘ring."
    );
  }
};