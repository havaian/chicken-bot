const axios = require("../axios");

module.exports = async (ctx) => {
    const courierPhoneNum = ctx.session.user.phone_num;

    try {
        // Get today's activity for the courier
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierPhoneNum}`);
        const courierActivity = courierActivityResponse.data;

        // Aggregate total number of eggs delivered and total money received
        let totalEggsDelivered = 0;
        let totalMoneyReceived = 0;
        courierActivity.delivered_to.forEach(delivery => {
            totalEggsDelivered += delivery.eggs ? delivery.eggs : 0;
            totalMoneyReceived += delivery.payment;
        });

        // Create report
        let report = `Bugungi Yetkazmalar:\nYetkazilgan joylar: ${courierActivity.delivered_to.length} mijozlar\nQolgan tuxumlar: ${courierActivity.remained}\nUmumiy daromad: ${courierActivity.earnings}\nSingan tuxumlar: ${courierActivity.broken}\nChiqimlar: ${courierActivity.expenses}\nUmumiy yetkazilgan tuxumlar: ${totalEggsDelivered}\nUmumiy olingan pul: ${totalMoneyReceived}\n\nBatafsil ma'lumot:\n`;
        courierActivity.delivered_to.forEach((delivery, index) => {
            report += `${index + 1}. ${delivery.name}: ${delivery.eggs ? delivery.eggs : 0} tuxum, ${delivery.payment ? delivery.payment : 0} olindi, Vaqt: ${delivery.time}\n`;
        });

        await ctx.reply(report);
    } catch (error) {
        console.log(error);
        await ctx.reply('Bugungi yetkazmalarni olishda xatolik yuz berdi. Qayta urunib ko\'ring.');
    }
};
