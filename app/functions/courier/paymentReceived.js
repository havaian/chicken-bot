const axios = require("../../axios");
const { generateCourierHTML, generateCourierExcel } = require("../report/courierReport");
const convertHTMLToImage = require("../report/convertHTMLToImage");
const { Markup } = require("telegraf");
const path = require("path");
const fs = require("fs");
const groups = require("../../groups");
const egg_price = require("../../prices");

const { logger, readLog } = require("../../utils/logs");

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
            await ctx.reply('Iltimos, necha pul olganingizni kiriting:');
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

    await ctx.reply(`Siz ${paymentAmount} so’m pul olinganingizni kiritdingiz. Tasdiqlaysizmi?`);
    selectedBuyer.paymentAmount = paymentAmount;

    await ctx.reply('Tasdiqlaysizmi?', Markup.inlineKeyboard([
        [Markup.button.callback('Tasdiqlash', 'confirm_transaction')],
        [Markup.button.callback('Bekor qilish', 'cancel')]
    ]));
}

module.exports.confirmTransaction = async (ctx) => {
    await ctx.reply('Iltimos, hisobot uchun dumaloq video yuboring.');
    ctx.session.awaitingCircleVideo = true;
};

module.exports.handleCircleVideo = async (ctx) => {
    if (!ctx.message.video_note || ctx.message.forward_from) {
        await ctx.reply('Iltimos, hisobot uchun dumaloq video yuboring.');
        return;
    }

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
        await ctx.reply('Guruh topilmadi. Qayta urunib ko‘ring.');
        return;
    }

    try {
        // Forward the video to the group
        await ctx.forwardMessage(groupId);

        const selectedBuyer = ctx.session.buyers[ctx.session.buyers.length - 1];
        // Get today's activity for the buyer
        const buyerActivityResponse = await axios.get(`/buyer/activity/today/${selectedBuyer.phone_num}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const buyerActivity = buyerActivityResponse.data;

        // Update buyer's activity
        const updatedBuyerActivity = {
            ...buyerActivity,
            current: buyerActivity.current + (selectedBuyer.eggsDelivered || 0),
            payment: buyerActivity.payment - selectedBuyer.paymentAmount + ((selectedBuyer.eggsDelivered || 0) * egg_price)
        };

        await axios.put(`/buyer/activity/${buyerActivity._id}`, updatedBuyerActivity);

        // Get today's activity for the courier
        const courierActivityResponse = await axios.get(`/courier/activity/today/${courierPhoneNum}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const courierActivity = courierActivityResponse.data;

        const courierResponse = await axios.get(`/courier/${courierPhoneNum}`, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });
        const courier = courierResponse.data;
        courierActivity.courier_name = courier.full_name;

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
            current: courierActivity.current - (selectedBuyer.eggsDelivered || 0) // Subtract eggs delivered from current
        };

        await axios.put(`/courier/activity/${courierActivity._id}`, updatedCourierActivity, {
            headers: {
                'x-user-telegram-chat-id': ctx.chat.id
            }
        });

        // File paths
        const reportDate = new Date().toISOString().split('T')[0];
        const reportDir = path.join('reports', `courier/${reportDate}`, courierPhoneNum);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // Delete old reports
        fs.readdirSync(reportDir).forEach(file => {
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
        await ctx.telegram.sendDocument(groupId, { source: excelFilename }, { caption: `Xisobot: ${courier.full_name}` });
        await ctx.telegram.sendPhoto(groupId, { source: imageFilename }, { caption: `Xisobot: ${courier.full_name}` });

        // Show main menu buttons
        await ctx.reply('Tanlang:', Markup.keyboard([
            ['Tuxum yetkazildi', 'Singan tuxumlar'],
            ['Chiqim', 'Bugungi yetkazilganlar']
        ]).resize());

        // Clear session video flag
        ctx.session.awaitingCircleVideo = false;
    } catch (error) {
        logger.info(error);
        await ctx.reply('Tranzaktsiyani yakunlashda xatolik yuz berdi. Qayta urunib ko‘ring.');
    }
};
