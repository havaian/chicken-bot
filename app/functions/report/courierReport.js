const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const moment = require('moment-timezone');

const eggs_prices = require("../data/prices");

const { logger, readLog } = require("../../utils/logging");

const axios = require("../../axios");

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

    const calculateShortage = (category) => {
      // Calculate total accepted eggs for the category across all entries
      const totalAcceptedEggs = accepted.reduce((sum, entry) => {
        return sum + (entry.eggs[category] || 0);
      }, 0);
    
      const by_morning = accepted[0].remained || {};
    
      const acceptedAmount = totalAcceptedEggs + (by_morning[category] || 0);
      const remaining = current_by_courier[category] || 0;
      const delivered = totalDeliveredByCategory[category] || 0;
      const brokenAmount = incision[category] || 0;
      const melangeAmount = (melange_by_courier[category] || 0) * 28;
    
      const shortage = acceptedAmount - (remaining + delivered + brokenAmount + melangeAmount);
      return shortage;
    };

    // Function to generate the delivery table HTML
    const generateDeliveryTableHTML = (deliveries, startIndex) => {
      let deliveryHtml = "";
      let deliveredToIndex = startIndex;

      deliveries.forEach((delivery, rowIndex) => {
        if (Object.keys(delivery).length > 0) {
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
                  <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">${delivery.buyer.full_name}</td>
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
                  <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">${delivery.buyer.full_name}</td>
                  <td style="text-align: left; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">−</td>
                  <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">−</td>
                  <td style="text-align: center; vertical-align: middle; background-color: ${deliveryIndex % 2 !== 0 ? '#f6f6f6' : '#ffffff'};">−</td>
                  ${paymentHtml}
                  ${debtHtml}
                </tr>`;
            }
          }
          
          totalPayments += parseInt(delivery.payment || 0, 10);
        } else {
          deliveryHtml += "";
        }
      });
      
      return deliveryHtml;
    };

    // Function to generate the full HTML report
    const generateFullHTML = (deliveryTableHTML, partNumber, totalParts) => {
      const rows = [
        ["1", "Tarqatilgan tuxum soni", ...Object.keys(eggPrices).map(category => formatNumber(totalDeliveredByCategory[category] || 0)), "", "Umumiy yig'ilgan pul:", formatNumber(totalPayments)],
        ["2", "Qolgan tuxum soni", ...Object.keys(eggPrices).map(category => formatNumber(current_by_courier[category] || 0)), "", "Chiqim:", formatNumber(expenses)],
        ["3", "Nasechka tuxum soni", ...Object.keys(eggPrices).map(category => formatNumber(incision[category] || 0)), "", "Topshiriladigan pul:", expenses > 0 ? formatNumber(totalPayments - expenses) : 0],
        ["4", "Tuxum kamomad", ...Object.keys(eggPrices).map(category => {
          const shortage = calculateShortage(category);
          return day_finished ? formatNumber(shortage) : 0;
        }), "", "Kassa topshirildi:", formatNumber(money_by_courier)],
        ["5", "Melanj", ...Object.keys(eggPrices).map(category => {
          const amount = melange_by_courier[category] || 0;
          return `${formatNumber(amount)} (${formatNumber(amount * 28)})`;
        }), "", "Kassa kamomad:", day_finished ? formatNumber((totalPayments - expenses) - money_by_courier) : 0]
      ];

      let acceptedHtml = 
        `<tr>
          <td style="padding: 5px 0; text-align: center; vertical-align: middle;">Berilgan vaqti:</td>
          <td style="padding: 5px 0; text-align: center; vertical-align: middle;">Olingan tuxum soni:</td>
          <td style="text-align: center; vertical-align: middle;">Bor edi:</td>
          <td style="text-align: center; vertical-align: middle;">Jami:</td>
        </tr>`;

      let totalAccepted = {};

      accepted.forEach((element, index) => {
        const eggs = element.eggs || {};
        const remained = element.remained || {};
        const date = new Date(element.loadingTime);
      
        // Initialize totalAccepted with remained from the first entry
        if (index === 0) {
          Object.keys(remained).forEach(category => {
            totalAccepted[category] = remained[category] || 0;
          });
        }
      
        // Accumulate eggs for each category
        Object.keys(eggs).forEach(category => {
          totalAccepted[category] = (totalAccepted[category] || 0) + eggs[category];
        });
      
        acceptedHtml += 
        `<tr>
          <td style="padding: 5px 0; text-align: center; vertical-align: middle;">${date.toLocaleString("uz-UZ")}</td>  
          <td style="padding: 5px 5px; text-align: center; vertical-align: middle;">${Object.entries(eggs).map(([category, amount]) => `${category}: <b>${formatNumber(amount)}</b>`).join(", ")}</td>
          <td style="padding: 5px 0; text-align: center; vertical-align: middle;">${remained ? Object.entries(remained).map(([category, amount]) => `${category}: <b>${formatNumber(amount)}</b>`).join("</br>") : "−"}</td>
          <td style="padding: 5px 0; text-align: center; vertical-align: middle;">${Object.entries(totalAccepted).map(([category, amount]) => `${category}: <b>${formatNumber(amount)}</b>`).join("</br>")}</td>
        </tr>`;
      });

      return `
        <html>
        <head>
          <style>
            table { border-collapse: collapse; width: 100%; }
          </style>
        </head>
        <body>
          <h3 style="text-align: center; vertical-align: middle; background-color: '#f6f6f6'">Qism ${partNumber} / ${totalParts}</h3>
          <table style="width:100%;" border="1">
            <tr>
              <td style="padding-left: 2%;" colspan="2">Men yetkazib beruvchi: ${courier_name}</td>
              <td style="padding-left: 2%;" colspan="3">Avtomobil davlat raqami: ${car_num}</td>
            </tr>
            <tr height="30px" style="width:100%">
              <td style="padding-left: 2%;">Sana: ${today6amStr}</td>
              <td style="padding-left: 2%;">Hisobot sanasi: ${reportDate}</td>
              <td style="padding-left: 2%;" colspan="2">Sanab oldim_____________</td>
            </tr>`
           + acceptedHtml +
          `</table>
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

    const splitDeliveries = (delivered_to = [], maxPerPart = 45) => {
      const parts = [];
      let y = 0;
      let page = 0;

      lastIndexes[page] = 0;

      if (delivered_to.length === 0) {
        delivered_to.push({});
      }
      
      delivered_to.forEach((delivery, rowIndex) => {
        if (Object.keys(delivery).length > 0) {
          if (y === maxPerPart) {
            y = 0;
            page++;
          }
  
          if (!parts[page] || typeof parts[page] === "undefined") {
            parts[page] = [];
          }
  
          parts[page].push(delivery);
  
          lastIndexes[page] = y > lastIndexes[page] ? y : lastIndexes[page];
  
          const deliveredEggs = delivery.eggs.filter(egg => egg.amount > 0);
          const hasDelivery = deliveredEggs.length > 0;
          const hasPayment = delivery.payment > 0;
  
          if (hasDelivery) {
            deliveredEggs.forEach((egg, index) => {
              y++;
            });
          } else if (hasPayment) {
            y++;
          }
        } else {
          if (y === maxPerPart) {
            y = 0;
            page++;
          }

          if (!parts[page] || typeof parts[page] === "undefined") {
            parts[page] = [];
          }
  
          parts[page].push(delivery);
        }
      });

      return parts;
    };

    // Split deliveries into parts
    const deliveryParts = splitDeliveries(delivered_to);

    const totalParts = deliveryParts.length;

    const htmlFiles = [];

    // Generate and save HTML files for each part
    deliveryParts.forEach((part, index) => {
      const partNumber = index + 1;
      const partFilename = totalParts > 1 
        ? filename.replace('.html', `_${partNumber}.html`)
        : filename;

      const deliveryTableHTML = generateDeliveryTableHTML(part, (partNumber - 2) < 0 ? 0 : (lastIndexes[partNumber - 2] + 1));
      const fullHTML = generateFullHTML(deliveryTableHTML, partNumber, totalParts);

      const directory = path.dirname(partFilename);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      fs.writeFileSync(partFilename, fullHTML);
      htmlFiles.push(partFilename);
    });

    return htmlFiles;
  } catch (error) {
    logger.error(error);
  }
};

const generateCourierExcel = async (data, filename) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Courier Report");

    // Set up headers
    const headers = [
      "ID",
      "Дата",
      "Доставка",
      "Харидор",
      "Категория",
      "Кол-во",
      "Цена",
      "Сумма",
      "Оплата",
      "Остаток"
    ];
    const headerRow = sheet.addRow(headers);

    // Style the header row
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
    });

    const courierName = data.courier_name || "Unknown Courier";

    data.delivered_to.forEach(delivery => {
      if (Object.keys(delivery).length > 0) {
        const deliveryDate = new Date(data.date).toLocaleDateString("uz-UZ");
        
        const nonZeroEggs = delivery.eggs.filter(egg => egg.amount > 0);
        
        if (nonZeroEggs.length > 0) {
          nonZeroEggs.forEach(egg => {
            const row = sheet.addRow([
              delivery._id ? delivery._id : '',
              deliveryDate,
              courierName,
              delivery.buyer.full_name,
              egg.category,
              egg.amount,
              egg.price,
              egg.amount * egg.price,
              delivery.payment,
              delivery.debt
            ]);
            
            // Lock only the ID cell in this row
            row.getCell(1).protection = { locked: true };
          });
        } else if (delivery.payment > 0) {
          const row = sheet.addRow([
            delivery._id ? delivery._id : '',
            deliveryDate,
            courierName,
            delivery.buyer.full_name,
            ' ',
            ' ',
            ' ',
            ' ',
            delivery.payment,
            delivery.debt
          ]);
          
          // Lock only the ID cell in this row
          row.getCell(1).protection = { locked: true };
        }
      }
    });

    // Hide the ID column
    sheet.getColumn(1).hidden = true;

    // Protect the sheet, but allow editing of unlocked cells
    sheet.protect(process.env.EXCEL_PASS, {
      selectLockedCells: false,
      selectUnlockedCells: true,
      formatCells: true,
      formatColumns: true,
      formatRows: true,
      insertColumns: false,
      insertRows: true,
      insertHyperlinks: true,
      deleteColumns: false,
      deleteRows: true,
      sort: true,
      autoFilter: true,
      pivotTables: true
    });

    // Auto-fit columns (excluding the hidden ID column)
    sheet.columns.forEach((column, index) => {
      if (index > 0) { // Skip the first (hidden) column
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength;
      }
    });

    // Unlock all cells except the ID column
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          if (colNumber > 1) { // Skip ID column
            cell.protection = { locked: false };
          }
        });
      }
    });

    await workbook.xlsx.writeFile(filename);
  } catch (error) {
    logger.error("Error generating Excel report:", error);
    throw error;
  }
};

module.exports = {
  generateCourierHTML,
  generateCourierExcel,
};