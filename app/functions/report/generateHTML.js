const fs = require('fs');
const path = require('path');

const generateHTML = (data, filename) => {
  const { delivered_to, remained, broken, earnings, expenses } = data;
  const totalDelivered = delivered_to.reduce((acc, delivery) => acc + delivery.eggs, 0);
  const customersCount = delivered_to.length;

  const summaryHtml = `
    <table>
      <tr><th colspan="2">Bugungi Yetkazmalar</th></tr>
      <tr><td>Yetkazilgan</td><td>${customersCount} mijozlar</td></tr>
      <tr><td>Qolgan tuxumlar</td><td>${remained}</td></tr>
      <tr><td>Umumiy daromad</td><td>${earnings}</td></tr>
      <tr><td>Singan tuxumlar</td><td>${broken}</td></tr>
      <tr><td>Chiqim</td><td>${expenses}</td></tr>
      <tr><td>Umumiy yetkazilgan tuxumlar</td><td>${totalDelivered}</td></tr>
    </table>
  `;

  const detailsHtml = `
    <table>
      <tr><th>Klient</th><th>Yetkazilgan tuxumlar</th><th>Olingan pul</th><th>Yetkazilgan vaqti</th></tr>
      ${delivered_to.map((delivery, index) => `
        <tr>
          <td>${index + 1}. ${delivery.name}</td>
          <td>${delivery.eggs}</td>
          <td>${delivery.payment}</td>
          <td>${delivery.time}</td>
        </tr>
      `).join('')}
    </table>
  `;

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Report</title>
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      ${summaryHtml}
      ${detailsHtml}
    </body>
    </html>
  `;

  const directory = path.dirname(filename);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  fs.writeFileSync(filename, fullHtml);
};

module.exports = generateHTML;
