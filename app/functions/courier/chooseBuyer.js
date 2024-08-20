const axios = require("../../axios");
const { Markup } = require("telegraf");
const fs = require('fs');
const path = require('path');

const { logger, readLog } = require("../../utils/logging");

const eggsDelivered = require("./eggsDelivered");

const cancel = require("../general/cancel");

// Function to read the debt limit
const getDebtLimit = () => {
  try {
    const debtLimitPath = path.join(__dirname, '../../debt_limit.js');
    const data = fs.readFileSync(debtLimitPath, 'utf8');
    const match = data.match(/module\.exports\s*=\s*(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    logger.info('Failed to extract debt limit from file');
    return null;
  } catch (error) {
    logger.info('Error reading debt limit file:', error);
    return null;
  }
};

module.exports = async (ctx) => {
  try {
    const buyerId = ctx.match[1];
    ctx.session.selectedBuyerId = buyerId;
    const response = await axios.get(`/buyer/${buyerId}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const buyer = response.data;

    const activityResponse = await axios.get(`/buyer/activity/today/${buyerId}`, {
      headers: {
        "x-user-telegram-chat-id": ctx.chat.id,
      },
    });
    const buyerActivity = activityResponse.data;

    ctx.session.buyer = {
      ...buyer,
      addedAt: new Date(),
      eggsDelivered: 0,
      paymentAmount: 0,
      egg_price: buyerActivity.price
    };

    const debtLimit = getDebtLimit();
    if (debtLimit === null) {
      cancel(ctx, "Qarzdorlik chegarasini o'qishda xatolik yuz berdi", true);
      return;
    }
    
    if (buyerActivity.debt > (buyer.debt_limit || debtLimit)) {
      cancel(ctx, "Ushbu mijozning qarzi ruxsat berilgan chegaradan oshgan", true);
      return;
    }

    ctx.reply("Yetkazilgan tuxumlar sonini kiriting:",
      Markup.keyboard([
        ["Bekor qilish ❌"]
    ]));
    eggsDelivered.deliverEggs(ctx);

    // // Delete the previous message
    // await ctx.deleteMessage();
  } catch (error) {
    logger.info(error);
    await ctx.reply("Klient tanlashda xatolik yuz berdi. Qayta urunib ko'ring");
  }
};