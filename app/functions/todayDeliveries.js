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
        let report = `Today's Deliveries:\nDelivered to: ${courierActivity.delivered_to.length} clients\nRemained: ${courierActivity.remained}\nTotal Earnings: ${courierActivity.earnings}\nBroken Eggs: ${courierActivity.broken}\nExpenses: ${courierActivity.expenses}\nTotal Eggs Delivered: ${totalEggsDelivered}\n\nDetails:\n`;
        courierActivity.delivered_to.forEach((delivery, index) => {
            report += `${index + 1}. ${delivery.name}: ${delivery.eggs ? delivery.eggs : 0} eggs, ${delivery.payment ? delivery.payment : 0} received, Time: ${delivery.time}\n`;
        });

        await ctx.reply(report);
    } catch (error) {
        console.log(error);
        await ctx.reply('Failed to fetch today\'s deliveries. Please try again.');
    }
};
