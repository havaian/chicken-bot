const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const moment = require('moment-timezone');

const eggs_prices = require("../data/prices");

const { logger, readLog } = require("../../utils/logging");

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
      accepted = [],
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

    const reportDate = moment(date).tz('Asia/Karachi').format('DD/MM/YYYY');

    // Prepare prices from eggs_prices
    const eggPrices = eggs_prices; // Assuming eggs_prices is an object {category: price}

    // Calculate total accepted eggs
    const totalAccepted = accepted.reduce((acc, distribution) => {
      Object.entries(distribution.eggs).forEach(([category, amount]) => {
        acc[category] = (acc[category] || 0) + amount;
      });
      return acc;
    }, {});

    const calculateShortage = (category) => {
      const initial = by_morning[category] || 0;
      const acceptedAmount = totalAccepted[category] || 0;
      const remaining = current_by_courier[category] || 0;
      const delivered = totalDeliveredByCategory[category] || 0;
      const brokenAmount = incision[category] || 0;
      const melangeAmount = (melange_by_courier[category] || 0) * 28;
    
      const shortage = (initial + acceptedAmount) - (remaining + delivered + brokenAmount + melangeAmount);
      return shortage;
    };

    // Function to generate the delivery table HTML
    const generateDeliveryTableHTML = (deliveries, startIndex) => {
      let deliveryHtml = "";
      let deliveredToIndex = startIndex;

      deliveries.forEach((delivery, rowIndex) => {
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

              totalDeliveredByCategory[egg.category] = (totalDeliveredByCategory[egg.category] || 0) + egg.amount;
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
      });
      
      return deliveryHtml;
    };

    // Function to generate the full HTML report
    const generateFullHTML = (deliveryTableHTML, partNumber, totalParts) => {
      const rows = [
        ["1", "Tarqatilgan tuxum soni", ...Object.keys(eggPrices).map(category => formatNumber(totalDeliveredByCategory[category] || 0)), "", "Umumiy yig'ilgan pul:", formatNumber(totalPayments)],
        ["2", "Qolgan tuxum soni", ...Object.keys(eggPrices).map(category => formatNumber(current_by_courier[category] || 0)), "", "Chiqim:", formatNumber(expenses)],
        ["3", "Nasechka tuxum soni", ...Object.keys(eggPrices).map(category => formatNumber(incision[category] || 0)), "", "Topshiriladigan pul:", formatNumber(totalPayments - expenses)],
        ["4", "Tuxum kamomad", ...Object.keys(eggPrices).map(category => {
          const shortage = calculateShortage(category);
          return formatNumber(shortage);
        }), "", "Kassa topshirildi:", formatNumber(money_by_courier)],
        ["5", "Melanj", ...Object.keys(eggPrices).map(category => {
          const amount = melange_by_courier[category] || 0;
          return `${formatNumber(amount)} (${formatNumber(amount * 28)})`;
        }), "", "Kassa kamomad:", formatNumber((totalPayments - expenses) - money_by_courier)]
      ];

      return `
        <html>
        <head>
          <style>
            table { border-collapse: collapse; width: 100%; }
          </style>
        </head>
        <body>
          <h3 style="text-align: center; vertical-align: middle; background-color: '#f6f6f6'">Qism ${partNumber} / ${totalParts}</h3>
          <table style="width:100%">
            <tr>
              <td colspan="2">Men yetkazib beruvchi: ${courier_name}</td>
              <td colspan="3">Avtomobil davlat raqami: ${car_num}</td>
            </tr>
            <tr height="30px" style="width:100%">
              <td>Sana: ${today6amStr}</td>
              <td>Hisobot sanasi: ${reportDate}</td>
            </tr>
            <tr>
              <td>Olingan tuxum soni:</br>${Object.entries(totalAccepted).map(([category, amount]) => `${category}: <b>${formatNumber(amount)}</b>`).join("</br>")}</td>
              <td>Bor edi:</br>${Object.entries(by_morning).map(([category, amount]) => `${category}: <b>${formatNumber(amount)}</b>`).join("</br>")}</td>
              <td>Jami:</br>${Object.entries(totalAccepted).map(([category, amount]) => `${category}: <b>${formatNumber((amount ?? 0) + (by_morning[category] ?? 0))}</b>`).join("</br>")}</td>
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
            ${deliveryTableHTML}
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
          <p>______________________________________________________________________________________________</p>
          <p>______________________________________________________________________________________________</p>
          <table style="width:100%">
            <tr>
              <td>Yetkazib beruvchi: ${courier_name}</td>
              <td>Tasdiqlayman_____________</td>
            </tr>
          </table>
        </body>
        </html>
      `;
    };

    let lastIndexes = [];

    const splitDeliveries = (delivered_to = [], maxPerPart = 40) => {
      const parts = [];
      let y = 0;
      let page = 0;

      lastIndexes[page] = 0;

      for (let i = 0; i < delivered_to.length; i++) {
        if (!parts[page] || typeof parts[page] === "undefined") {
          parts[page] = [];
        }
        parts[page].push(delivered_to[i]);

        y += delivered_to[i].eggs.length;

        lastIndexes[page] = y > lastIndexes[page] ? y : lastIndexes[page];

        if (y > maxPerPart) {
          y = 0;
          page++;
        }
      }

      return parts;
    };

    // Split deliveries into parts
    const deliveryParts = splitDeliveries(delivered_to);

    const totalParts = deliveryParts.length;

    if (deliveryParts.length > 0) {
      // Generate and save HTML files for each part
      deliveryParts.forEach((part, index) => {
        const partNumber = index + 1;
        const partFilename = totalParts > 1 
          ? filename.replace('.html', `${partNumber === deliveryParts.length ? "" : "_" + partNumber}.html`)
          : filename;
    
        const deliveryTableHTML = generateDeliveryTableHTML(part, (partNumber - 2) < 0 ? 0 : lastIndexes[partNumber - 2]);
        const fullHTML = generateFullHTML(deliveryTableHTML, partNumber, totalParts);
    
        const directory = path.dirname(partFilename);
        if (!fs.existsSync(directory)) {
          fs.mkdirSync(directory, { recursive: true });
        }
    
        fs.writeFileSync(partFilename, fullHTML);
      });
    } else {
      // Handle case where there are no delivery parts
      const emptyDeliveryTableHTML = generateDeliveryTableHTML([], 0);
      const fullHTML = generateFullHTML(emptyDeliveryTableHTML, 1, 1);
    
      const directory = path.dirname(filename);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
    
      fs.writeFileSync(filename, fullHTML);
    }

  } catch (error) {
    logger.error(error);
  }
};

const generateCourierExcel = async (data, filename) => {
  try {
    const {
      delivered_to = [],
      by_morning = {},
      current = {},
      current_by_courier = {},
      accepted = [],
      broken = {},
      expenses = 0,
      earnings = 0,
      courier_name = "",
      car_num = "",
      date = new Date().toLocaleDateString(),
    } = data;
    let totalDelivered = 0;
    let totalPayments = 0;
  
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Courier Report");
  
    // Calculate total accepted eggs
    const totalAccepted = accepted.reduce((acc, distribution) => {
      Object.entries(distribution).forEach(([category, amount]) => {
        acc[category] = (acc[category] || 0) + amount;
      });
      return acc;
    }, {});

    sheet.addRow(["Men yetkazib beruvchi F.I.O", courier_name]);
    sheet.addRow(["Avtomobil davlat raqami:", car_num]);
    sheet.addRow(["Sana", date]);
    sheet.addRow(["Olingan tuxum soni", Object.entries(totalAccepted).map(([category, amount]) => `${category}: ${amount}`).join(", ")]);
    sheet.addRow(["Bor edi", Object.entries(by_morning).map(([category, amount]) => `${category}: ${amount}`).join(", ")]);
    sheet.addRow(["Jami", Object.entries(totalAccepted).reduce((sum, [category, amount]) => sum + amount, 0) + Object.entries(by_morning).reduce((sum, [category, amount]) => sum + amount, 0)]);
    sheet.addRow(["Sanab oldim_____________"]);
  
    sheet.addRow([]);
    sheet.addRow(["Mijoz", "Tuxum soni", "Narxi", "Olingan pul", "Qolgan pul"]);
  
    let deliveredToIndex = 0;
  
    delivered_to.forEach((delivery) => {
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
    sheet.addRow(["Umumiy yig'ilgan pul:", totalPayments]);
    sheet.addRow(["Qolgan tuxum soni", Object.entries(current_by_courier).map(([category, amount]) => `${category}: ${amount}`).join(", ")]);
    sheet.addRow(["Nasechka tuxum soni", Object.entries(broken).map(([category, amount]) => `${category}: ${amount}`).join(", ")]);
    sheet.addRow(["Topshiriladigan pul", earnings - expenses]);
    sheet.addRow(["Tuxum kamomad", Object.entries(current).map(([category, amount]) => `${category}: ${amount}`).join(", ")]);
    sheet.addRow(["Chiqim", expenses]);
    sheet.addRow(["Kassa topshirildi", totalPayments]);
    sheet.addRow(["Kassa kamomad", totalPayments - (earnings - expenses)]);
  
    await workbook.xlsx.writeFile(filename);
  } catch (error) {
    logger.error(error);
  }
};

module.exports = {
  generateCourierHTML,
  generateCourierExcel,
};

