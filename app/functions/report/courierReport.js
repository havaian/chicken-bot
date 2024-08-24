const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const moment = require('moment');

const eggs_prices = require("../data/prices");

const { logger, readLog } = require("../../utils/logging");
const report = require("../courier/report");

const formatNumber = (num) => {
  if (isNaN(num) || !isFinite(num)) {
    return '0';
  }
  return num.toLocaleString('en-US');
};

const generateCourierHTML = (data, filename) => {
  try {
    const {
      delivered_to = [],
      by_morning = {},
      current = {},
      current_by_courier = {},
      money_by_courier = 0,
      accepted = {},
      incision = {},
      earnings = 0,
      expenses = 0,
      melange_by_courier = 0,
      courier_name = "",
      car_num = "",
      day_finished = false,
      date = ""
    } = data;
  
    let totalDeliveredByCategory = {};
    let totalPayments = 0;
  
    // Limit to 40 entries
    const limitedDeliveredTo = delivered_to.slice(0, 40);
  
    // Get today's date at 6 a.m.
    const today6am = new Date();
    const today6amStr = today6am.toLocaleString('uz-UZ', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const reportDate = date.toLocaleString('uz-UZ', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  
    // Prepare prices from eggs_prices
    const eggPrices = eggs_prices; // Assuming eggs_prices is an object {category: price}
  
    let deliveredToIndex = 0;
  
    limitedDeliveredTo.forEach((delivery) => {      
      totalPayments += parseInt(delivery.payment, 10);
      delivery.eggs.forEach((egg, index) => {
        totalDeliveredByCategory[egg.category] = totalDeliveredByCategory[egg.category] || 0;     
        totalDeliveredByCategory[egg.category] += egg.amount;
      });
    });    
  
    const rows = [
      ["1", "Tarqatilgan tuxum soni", ...Object.keys(eggPrices).map(category => formatNumber(totalDeliveredByCategory[category] || 0)), "", "Umumiy yig'ilgan pul:", formatNumber(totalPayments)],
      ["2", "Qolgan tuxum soni", ...Object.keys(eggPrices).map(category => formatNumber(current_by_courier[category] || 0)), "", "Chiqim:", formatNumber(expenses)],
      ["3", "Nasechka tuxum soni", ...Object.keys(eggPrices).map(category => formatNumber(incision[category] || 0)), "", "Topshiriladigan pul:", formatNumber(earnings - expenses)],
      ["4", "Tuxum kamomad", ...Object.keys(eggPrices).map(category => {
        const amount = (day_finished ? (by_morning[category] + accepted[category] ?? 0) - 
                        ((current_by_courier[category] ?? 0) + 
                         (melange_by_courier[category] ?? 0) * 28 + 
                         (incision[category] ?? 0) + 
                         (totalDeliveredByCategory[category] ?? 0)) : 0);
        return formatNumber(amount);
      }), "", "Kassa topshirildi:", formatNumber(money_by_courier)],
      ["5", "Melanj", ...Object.keys(eggPrices).map(category => {
        const amount = melange_by_courier[category] || 0;
        return `${formatNumber(amount)} (${formatNumber(amount * 28)})`;
      }), "", "Kassa kamomad:", formatNumber((earnings - expenses) - money_by_courier)]
    ];
    
    // Prepare the rows in the final HTML with alternating colors
    const summaryHtml = 
      `<table style="width:100%">
        <tr>
          <td colspan="2">Men yetkazib beruvchi: ${courier_name}</td>
          <td colspan="3">Avtomobil davlat raqami: ${car_num}</td>
        </tr>
        <tr height="50px" style="width:100%">
          <td>Sana: ${today6amStr}</td>
          <td>Hisobot sanasi: ${reportDate}</td>
        </tr>
        <tr>
          <td>Olingan tuxum soni:</br>${Object.entries(accepted).map(([category, amount]) => `${category}: <b>${formatNumber(amount)}</b>`).join(",</br>")}</td>
          <td>Bor edi:</br>${Object.entries(by_morning).map(([category, amount]) => `${category}: <b>${formatNumber(amount)}</b>`).join(",</br>")}</td>
          <td>Jami:</br>${Object.entries(accepted).map(([category, amount]) => `${category}: <b>${formatNumber((amount ?? 0) + (by_morning[category] ?? 0))}</b>`).join(",</br>")}</td>
          <td>Sanab oldim_____________</td>
        </tr>
      </table>
      <br>
      <table border="1" style="width:100%; border-collapse: collapse;">
        <tr>
          <th style="width:15px; text-align: center; vertical-align: middle">№</th>
          <th style="width:125px; text-align: center; vertical-align: middle">Mijoz</th>
          <th style="width:75px; text-align: center; vertical-align: middle">Tuxum soni</th>
          <th style="width:75px; text-align: center; vertical-align: middle">Narxi</th>
          <th style="width:100px; text-align: center; vertical-align: middle">Summa</th>
          <th style="width:75px; text-align: center; vertical-align: middle">Olingan pul</th>
          <th style="width:100px; text-align: center; vertical-align: middle">Qolgan pul</th>
        </tr>
        ${limitedDeliveredTo
          .map((delivery, rowIndex) => {
            let deliveryHtml = "";
            const deliveredEggs = delivery.eggs.filter(egg => egg.amount > 0);
            const hasDelivery = deliveredEggs.length > 0;
            const hasPayment = delivery.payment > 0;
            
            if (hasDelivery || hasPayment) {
              const rowspan = Math.max(deliveredEggs.length, 1);
              const paymentHtml = `<td style="text-align: center; vertical-align: middle; background-color: ${rowIndex % 2 === 0 ? '#f6f6f6' : '#ffffff'};" rowspan="${rowspan}">${formatNumber(delivery.payment || 0)}</td>`;
              const debtHtml = `<td style="text-align: center; vertical-align: middle; background-color: ${rowIndex % 2 === 0 ? '#f6f6f6' : '#ffffff'};" rowspan="${rowspan}">${formatNumber(delivery.debt)}</td>`;
              
              if (hasDelivery) {
                deliveredEggs.forEach((egg, index) => {
                  const deliveryIndex = ++deliveredToIndex;
                  deliveryHtml += `
                    <tr>
                      <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">${deliveryIndex}</td>
                      <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">${delivery.name}</td>
                      <td style="text-align: left; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">${egg.category}: ${formatNumber(egg.amount)}</td>
                      <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">${formatNumber(egg.price)}</td>
                      <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">${formatNumber(egg.price * egg.amount)}</td>
                      ${index === 0 ? paymentHtml : ''}
                      ${index === 0 ? debtHtml : ''}
                    </tr>`;
                });
              } else {
                const deliveryIndex = ++deliveredToIndex;
                deliveryHtml += `
                  <tr>
                    <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">${deliveryIndex}</td>
                    <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">${delivery.name}</td>
                    <td style="text-align: left; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">➖</td>
                    <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">➖</td>
                    <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">➖</td>
                    ${paymentHtml}
                    ${debtHtml}
                  </tr>`;
              }
            }
            
            totalPayments += parseInt(delivery.payment || 0, 10);
            return deliveryHtml;
          })
          .join("")}
      </table>
      <br>
      <table border="1" style="width:100%; border-collapse: collapse;">
        <tr>
          <th style="width:15px; text-align: center; vertical-align: middle">№</th>
          <th style="width:130px; text-align: center; vertical-align: middle">Nomi</th>
          ${Object.keys(eggPrices).map(category => `<th style="width:35px; text-align: center; vertical-align: middle">${category}</th>`).join("")}
          <th style="width:25px; text-align: center; vertical-align: middle"></th>
          <th style="width:95px; text-align: center; vertical-align: middle">Nomi</th>
          <th style="width:75px; text-align: center; vertical-align: middle">Qiymat</th>
        </tr>
        ${rows.map((row, rowIndex) => 
          `<tr>
            ${row.map(cell => `<td style="text-align: center; vertical-align: middle; background-color: ${rowIndex % 2 === 0 ? '#f6f6f6' : '#ffffff'};">${cell}</td>`).join("")}
          </tr>`
        ).join("")}
      </table>
      <br>
      <p>______________________________________________________________________________________________</p>
      <p>______________________________________________________________________________________________</p>
      <table style="width:100%">
        <tr>
          <td>Yetkazib beruvchi: ${courier_name}</td>
          <td>Tasdiqlayman_____________</td>
        </tr>
      </table>`;
  
    const directory = path.dirname(filename);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  
    fs.writeFileSync(filename, summaryHtml);
  } catch (error) {
    logger.info(error);
  }
};

const generateCourierExcel = async (data, filename) => {
  try {
    const {
      delivered_to = [],
      by_morning = {},
      current = {},
      current_by_courier = {},
      accepted = {},
      broken = {},
      expenses = 0,
      earnings = 0,
      courier_name = "",
      car_num = "",
      date = new Date().toLocaleDateString(),
    } = data;
    let totalDelivered = 0;
    let totalPayments = 0;
  
    // Limit to 40 entries
    const limitedDeliveredTo = delivered_to.slice(0, 40);
  
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Courier Report");
  
    sheet.addRow(["Men yetkazib beruvchi F.I.O", courier_name]);
    sheet.addRow(["Avtomobil davlat raqami:", car_num]);
    sheet.addRow(["Sana", date]);
    sheet.addRow(["Olingan tuxum soni", Object.entries(accepted).map(([category, amount]) => `${category}: ${amount}`).join(", ")]);
    sheet.addRow(["Bor edi", Object.entries(by_morning).map(([category, amount]) => `${category}: ${amount}`).join(", ")]);
    sheet.addRow(["Jami", Object.entries(accepted).reduce((sum, [category, amount]) => sum + amount, 0) + Object.entries(by_morning).reduce((sum, [category, amount]) => sum + amount, 0)]);
    sheet.addRow(["Sanab oldim_____________"]);
  
    sheet.addRow([]);
    sheet.addRow(["Mijoz", "Tuxum soni", "Narxi", "Olingan pul", "Qolgan pul"]);
  
    let deliveredToIndex = 0;
  
    limitedDeliveredTo.forEach((delivery) => {
      delivery.eggs.forEach(egg => {
        sheet.addRow([
          `${++deliveredToIndex}. ${delivery.name}`,
          `${egg.category}: ${egg.amount}`,
          egg.price,
          delivery.payment,
          delivery.debt,
        ]);
        totalDelivered += parseInt(egg.amount, 10);
      });
      totalPayments += parseInt(delivery.payment, 10);
    });
  
    sheet.addRow([]);
    sheet.addRow(["Tarqatilgan tuxum soni:", totalDelivered]);
    sheet.addRow(["Umumiy yig‘ilgan pul:", totalPayments]);
    sheet.addRow(["Qolgan tuxum soni", Object.entries(current_by_courier).map(([category, amount]) => `${category}: ${amount}`).join(", ")]);
    sheet.addRow(["Nasechka tuxum soni", Object.entries(broken).map(([category, amount]) => `${category}: ${amount}`).join(", ")]);
    sheet.addRow(["Topshiriladigan pul", earnings - expenses]);
    sheet.addRow(["Tuxum kamomad", Object.entries(current).map(([category, amount]) => `${category}: ${amount}`).join(", ")]);
    sheet.addRow(["Chiqim", expenses]);
    sheet.addRow(["Kassa topshirildi", totalPayments]);
    sheet.addRow(["Kassa kamomad", totalPayments - (earnings - expenses)]);
  
    await workbook.xlsx.writeFile(filename);
  } catch (error) {
    logger.info(error);
  }
};

module.exports = {
  generateCourierHTML,
  generateCourierExcel,
};
