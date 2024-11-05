const axios = require("../../axios");
const { Markup } = require("telegraf");
const message = require("../data/message");

const sendSMS = require("../../utils/message/index");

const cancel = require("../general/cancel");

const generateUniqueId = require('../general/generateId');

const { logger, readLog } = require("../../utils/logging");

const report = require("./report");

module.exports = async (ctx) => {
  try {
    const deleteMsg = ctx?.match && ctx?.match[0] === "confirm-transaction-no";

    if (deleteMsg) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });;
    }
    
    ctx.session.awaitingPaymentAmount = true;
    await ctx.reply(`Mijoz: ${ctx.session.buyer.full_name}\n\nQarz: ${ctx.session.buyer.debt.toLocaleString()}\n\nNecha pul olganingizni kiriting:`);
  } catch (error) {
    logger.error(error);
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
          Markup.button.callback("Ha ✅", "confirm-transaction"), 
          Markup.button.callback("Yo’q ❌", "confirm-transaction-no")
        ],
      ])
    );
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

module.exports.confirmTransaction = async (ctx) => {
  try {
    await handleCircleVideo(ctx);
  
    // Delete the previous message
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });(ctx.callbackQuery.message.message_id);
  } catch (error) {
    logger.error(error);
    ctx.reply("Xatolik yuz berdi. Qayta urunib ko’ring.");
  }
};

const handleCircleVideo = async (ctx) => {
  try {
    const phone_num = ctx.session.user.phone_num;
    const selectedBuyer = ctx.session.buyer;

    console.log(selectedBuyer.debt);

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

    console.log(buyerActivity.debt);

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
    let itemsMsg = "";

    const current = courierActivity.current || {};

    const item_price = selectedBuyer.item_price;

    for (let x in selectedBuyer.itemsDelivered) {   
      const amount = selectedBuyer.itemsDelivered[x].amount;
      const category = selectedBuyer.itemsDelivered[x].category;

      // Necessary to have the price of items in the report
      selectedBuyer.itemsDelivered[x].price = item_price[selectedBuyer.itemsDelivered[x].category];

      totalPrice += amount * item_price[category];
      
      itemsMsg += amount > 0 ? `${category}: ${amount}ta (${item_price[category]})\n` : "";

      if (Object.keys(current).length > 0) {
        if (current[category] - amount < 0) { 
          await ctx.reply("Sizning moshinangizda maxsulot yetarli emas"); 
          return; 
        } else { 
          current[category] = current[category] - amount;
        }
      }
    }

    const uniqueId = await generateUniqueId();

    // Create delivered_to object with details
    const deliveryDetailsBuyer = {
      _id: uniqueId,
      courier: {
        _id: courier._id,
        full_name: courier.full_name,
        phone_num: courier.phone_num,
        car_num: courier.car_num,
      },
      items: selectedBuyer.itemsDelivered || [],
      payment: paymentAmount || 0,
      debt: buyerActivity.debt + (totalPrice || 0) - (paymentAmount || 0),
      time: new Date().toLocaleString(),
    };

    console.log(totalPrice);
    console.log(paymentAmount);
    console.log(deliveryDetailsBuyer.debt);

    // Update buyer's activity
    const updatedBuyerActivity = {
      ...buyerActivity,
      accepted: [...buyerActivity.accepted, deliveryDetailsBuyer],
      debt: buyerActivity.debt + (totalPrice || 0) - (paymentAmount || 0),
    };

    console.log(totalPrice);
    console.log(paymentAmount);
    console.log(updatedBuyerActivity.debt);

    const text = await message(
      itemsMsg,
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
      _id: uniqueId,
      buyer: {
        _id: selectedBuyer._id,
        full_name: selectedBuyer.full_name,
        phone_num: selectedBuyer.phone_num,
      },
      items: selectedBuyer.itemsDelivered || [],
      payment: paymentAmount || 0,
      debt: buyerActivity.debt + totalPrice - paymentAmount,
      time: new Date().toLocaleString(), // Add the time of the delivery
    };

    console.log(totalPrice);
    console.log(paymentAmount);
    console.log(deliveryDetailsCourier.debt);

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
    
    try {
      await report(updatedCourierActivity, ctx, phone_num, full_name, "Maxsulot yetkazildi", forward = true);
    } catch (reportError) {
      console.log("Error in report function:", reportError);
      // Optionally, you can send a message to the user or perform any other error handling
      // await ctx.reply("Hisobotni yuborishda xatolik yuz berdi, lekin ma'lumotlar saqlandi.");
    }

    await cancel(ctx, "Tanlang:");
  } catch (error) {
    logger.error(error);
    await ctx.reply(
      "Yetkazishni yakunlashda xatolik yuz berdi. Qayta urunib ko‘ring."
    );
  }
};