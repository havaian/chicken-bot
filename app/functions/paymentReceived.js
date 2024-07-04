const axios = require("../axios");
const { Markup } = require("telegraf");

module.exports = async (ctx) => {
    const action = ctx.match[0];
    ctx.session.buyers = ctx.session.buyers || [];

    switch (action) {
        case 'payment_received_yes':
            await ctx.reply('Nech pul olindi?', Markup.inlineKeyboard([
                [Markup.button.callback('30', 'payment_amount:30'), Markup.button.callback('60', 'payment_amount:60')],
                [Markup.button.callback('90', 'payment_amount:90'), Markup.button.callback('120', 'payment_amount:120')],
                [Markup.button.callback('150', 'payment_amount:150'), Markup.button.callback('180', 'payment_amount:180')],
                [Markup.button.callback('Bekor qilish', 'cancel')]
            ]));
            break;

        case 'payment_received_no':
            await completeTransaction(ctx, 0);
            break;

        default:
            const amount = action.split(':')[1];
            await completeTransaction(ctx, parseInt(amount, 10));
            break;
    }

    // Delete the previous message
    await ctx.deleteMessage();
};

async function completeTransaction(ctx, paymentAmount) {
    const selectedBuyer = ctx.session.buyers[ctx.session.buyers.length - 1];

    selectedBuyer.paymentAmount = paymentAmount;

    await ctx.reply('Tasdiqlaysizmi?', Markup.inlineKeyboard([
        [Markup.button.callback('Tasdiqlash', 'confirm_transaction')],
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));
}

module.exports.confirmTransaction = async (ctx) => {
    const selectedBuyer = ctx.session.buyers[ctx.session.buyers.length - 1];
    const courierPhoneNum = ctx.session.user.phone_num;
    try {
        // Get today's activity for the buyer
        const buyerActivityResponse = await axios.get(`/buyer/activity/today/${selectedBuyer.phone_num}`);
        const buyerActivity = buyerActivityResponse.data;

        // Update buyer's activity
        const updatedBuyerActivity = {
            ...buyerActivity,
            remained: buyerActivity.remained + (selectedBuyer.eggsDelivered || 0),
            debt: buyerActivity.debt + selectedBuyer.paymentAmount
        };

        await axios.put(`/buyer/activity/${buyerActivity._id}`, updatedBuyerActivity);

        // Get today's activity for the courier
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierPhoneNum}`);
        const courierActivity = courierActivityResponse.data;

        // Create delivered_to object with details
        const deliveryDetails = {
            id: selectedBuyer._id,
            name: selectedBuyer.full_name,
            eggs: selectedBuyer.eggsDelivered || 0,
            payment: selectedBuyer.paymentAmount || 0,
            time: new Date().toLocaleString() // Add the time of the delivery
        };

        // Update courier's activity
        const updatedCourierActivity = {
            ...courierActivity,
            delivered_to: [...courierActivity.delivered_to, deliveryDetails],
            earnings: courierActivity.earnings + selectedBuyer.paymentAmount,
            remained: courierActivity.remained - (selectedBuyer.eggsDelivered || 0) // Subtract eggs delivered from remaining
        };

        await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity);

        // Send today's report and "Yana qo'shish" button
        let report = `Today's Deliveries:\nDelivered to: ${courierActivity.delivered_to.length} clients\nRemained: ${courierActivity.remained}\nTotal Earnings: ${courierActivity.earnings}\nBroken Eggs: ${courierActivity.broken}\nExpenses: ${courierActivity.expenses}\nTotal Eggs Delivered: ${totalEggsDelivered}\n\nDetails:\n`;
        courierActivity.delivered_to.forEach((delivery, index) => {
            report += `${index + 1}. ${delivery.name}: ${delivery.eggs ? delivery.eggs : 0} eggs, ${delivery.payment ? delivery.payment : 0} received, Time: ${delivery.time}\n`;
        });
        await ctx.reply(report, Markup.inlineKeyboard([
            [Markup.button.callback("Yana qo'shish", 'add_more')],
            [Markup.button.callback('Bekor qilish', 'cancel')]
        ]));

        // Show main menu buttons
        await ctx.reply('Menu:', Markup.keyboard([
            ['Tuxum yetkazildi', 'Singan tuxumlar'],
            ['Chiqim', 'Bugungi yetkazilganlar']
        ]).resize());
    } catch (error) {
        console.log(error);
        await ctx.reply('Failed to complete transaction. Please try again.');
    }

    // Delete the previous message
    await ctx.deleteMessage();
};
