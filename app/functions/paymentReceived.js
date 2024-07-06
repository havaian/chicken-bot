const axios = require("../axios");
const generateHTML = require("./report/generateHTML");
const convertHTMLToImage = require("./report/convertHTMLToImage");
const { Markup } = require("telegraf");
const path = require("path");
const fs = require("fs");

module.exports = async (ctx) => {
    const action = ctx.match[0];
    ctx.session.buyers = ctx.session.buyers || [];

    switch (action) {
        case 'payment_received_yes':
            await ctx.reply('Nech pul olindi?', Markup.inlineKeyboard([
                [Markup.button.callback('30', 'payment_amount:30'), Markup.button.callback('60', 'payment_amount:60')],
                [Markup.button.callback('90', 'payment_amount:90'), Markup.button.callback('120', 'payment_amount:120')],
                [Markup.button.callback('150', 'payment_amount:150'), Markup.button.callback('180', 'payment_amount:180')],
                [Markup.button.callback('Boshqa', 'payment_other')],
                [Markup.button.callback('Bekor qilish', 'cancel')]
            ]));
            break;

        case 'payment_received_no':
            await completeTransaction(ctx, 0);
            break;

        case 'payment_other':
            ctx.session.awaitingPaymentAmount = true;
            await ctx.reply('Iltimos, qancha pul olganingizni kiriting:');
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

    await ctx.reply(`Siz ${paymentAmount} pul olinganini tanladingiz.`);
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
            payment: buyerActivity.payment + selectedBuyer.paymentAmount
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

        // Calculate total eggs delivered
        let totalEggsDelivered = 0;
        let totalMoneyReceived = 0;
        updatedCourierActivity.delivered_to.forEach(delivery => {
            totalEggsDelivered += delivery.eggs ? delivery.eggs : 0;
            totalMoneyReceived += delivery.payment;
        });

        await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity);

        // File paths
        const reportDate = new Date().toISOString().split('T')[0];
        const reportDir = path.join('reports', courierPhoneNum, reportDate);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        const htmlFilename = path.join(reportDir, `${courierActivity._id}.html`);
        const imageFilename = path.join(reportDir, `${courierActivity._id}.jpg`);

        // Generate HTML report
        generateHTML(updatedCourierActivity, htmlFilename);

        // Convert HTML report to image
        await convertHTMLToImage(htmlFilename, imageFilename);

        // Send image to user
        await ctx.replyWithPhoto({ source: imageFilename });

        // Show main menu buttons
        await ctx.reply('Tanlang:', Markup.keyboard([
            ['Tuxum yetkazildi', 'Singan tuxumlar'],
            ['Chiqim', 'Bugungi yetkazilganlar']
        ]).resize());

        // Delete the previous message
        await ctx.deleteMessage();
    } catch (error) {
        console.log(error);
        await ctx.reply('Tranzaktsiyani yakunlashda xatolik yuz berdi. Qayta urunib ko\'ring.');
    }
};
