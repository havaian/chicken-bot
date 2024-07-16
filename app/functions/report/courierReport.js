const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const generateCourierHTML = (data, filename) => {
  const {
    delivered_to = [],
    by_morning = 0,
    current = 0,
    current_by_courier = 0,
    accepted = 0,
    broken = 0,
    expenses = 0,
    courier_name = "",
    car_num = "",
    date = new Date(date).toLocaleDateString(),
  } = data;
  const totalDelivered = delivered_to.reduce(
    (acc, delivery) => acc + delivery.eggs,
    0
  );
  const totalPayments = delivered_to.reduce(
    (acc, delivery) => acc + delivery.payment,
    0
  );
  const totalEarnings = totalPayments - expenses;

  // Limit to 40 entries
  const limitedDeliveredTo = delivered_to.slice(0, 40);

  const summaryHtml = `
    <table style="width:100%">
      <tr>
        <td colspan="2">Men yetkazib beruvchi F.I.O: ${courier_name}</td>
        <td colspan="3">Avtomobil davlat raqami: ${car_num}</td>
      </tr>
      <tr>
        <td colspan="2">Sana ${
          date ? new Date(date).toLocaleDateString() : ""
        }</td>
      </tr>
      <tr>
        <td>Olingan tuxum soni <b>${accepted}</b></td>
        <td>Bor edi <b>${by_morning}</b></td>
        <td>Jami <b>${(accepted) + (by_morning)}</b></td>
        <td>Sanab oldim_____________</td>
      </tr>
    </table>
    <br>
    <table border="1" style="width:100%; border-collapse: collapse;">
      <tr>
        <th style="width:15px; text-align: center; vertical-align: middle">№</th>
        <th style="width:100px; text-align: center; vertical-align: middle">Mijoz</th>
        <th style="width:75px; text-align: center; vertical-align: middle">Tuxum soni</th>
        <th style="width:75px; text-align: center; vertical-align: middle">Narxi</th>
        <th style="width:100px; text-align: center; vertical-align: middle">Olingan pul</th>
        <th style="width:150px; text-align: center; vertical-align: middle">Qolgan pul</th>
      </tr>
      ${limitedDeliveredTo
        .map(
          (delivery, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${delivery.name}</td>
          <td>${delivery.eggs}</td>
          <td>${delivery.price}</td>
          <td>${delivery.payment}</td>
          <td>${delivery.debt}</td>
        </tr>
      `
        )
        .join("")}
    </table>
    <br>
    <table style="width:100%">
      <tr>
        <td>Tarqatilgan tuxum soni <b>${totalDelivered}</b></td>
        <td>Umumiy yig‘ilgan pul <b>${totalPayments}</b></td>
      </tr>
      <tr>
        <td>Qolgan tuxum soni <b>${current_by_courier}</b></td>
        <td>Chiqim <b>${expenses}</b></td>
      </tr>
      <tr>
        <td>Singan tuxum soni <b>${broken}</b></td>
        <td>Topshiriladigan kassa <b>${totalEarnings}</b></td>
      </tr>
    </table>
    <p>______________________________________________________________________________________________</p>
    <p>______________________________________________________________________________________________</p>
    <table style="width:100%">
      <tr>
        <td>Yetkazib beruvchi ${courier_name}</td>
        <td>Tasdiqlayman_____________</td>
      </tr>
    </table>
  `;

  const directory = path.dirname(filename);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  fs.writeFileSync(filename, summaryHtml);
};

const generateCourierExcel = async (data, filename) => {
  const {
    delivered_to = [],
    by_morning = 0,
    current = 0,
    current_by_courier = 0,
    accepted = 0,
    broken = 0,
    expenses = 0,
    courier_name = "",
    car_num = "",
    date = new Date(date).toLocaleDateString(),
  } = data;
  const totalDelivered = delivered_to.reduce(
    (acc, delivery) => acc + delivery.eggs,
    0
  );
  const totalPayments = delivered_to.reduce(
    (acc, delivery) => acc + delivery.payment,
    0
  );
  const totalEarnings = totalPayments - expenses;

  // Limit to 40 entries
  const limitedDeliveredTo = delivered_to.slice(0, 40);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Courier Report");

  sheet.addRow(["Men yetkazib beruvchi F.I.O", courier_name]);
  sheet.addRow(["Avtomobil davlat raqami:", car_num]);
  sheet.addRow(["Sana", date]);
  sheet.addRow(["Olingan tuxum soni", accepted ]);
  sheet.addRow(["Bor edi", by_morning ]);
  sheet.addRow(["Jami", (accepted) + (by_morning)]);
  sheet.addRow(["Sanab oldim_____________"]);

  sheet.addRow([]);
  sheet.addRow(["Mijoz", "Tuxum soni", "Narxi", "Olingan pul", "Qolgan pul"]);

  limitedDeliveredTo.forEach((delivery, index) => {
    sheet.addRow([
      `${index + 1}. ${delivery.name}`,
      delivery.eggs,
      delivery.price,
      delivery.payment,
      delivery.debt,
    ]);
  });

  sheet.addRow([]);
  sheet.addRow(["Tarqatilgan tuxum soni", totalDelivered]);
  sheet.addRow(["Umumiy yig‘ilgan pul", totalPayments]);
  sheet.addRow(["Qolgan tuxum soni", current_by_courier || 0]);
  sheet.addRow(["Chiqim", expenses || 0]);
  sheet.addRow(["Singan tuxum soni", broken || 0]);
  sheet.addRow(["Topshirilgan kassa", totalEarnings]);

  sheet.addRow([]);
  sheet.addRow([
    "Ushbu xisobot bo‘yicha qolib ketgan pullarni VTT«Nasriddinov Sirojiddin Nuriddinovich»ga olib kelib topshirishini o‘z zimamga olaman.",
  ]);
  sheet.addRow(["Yetkazib beruvchi", courier_name || ""]);
  sheet.addRow(["Tasdiqlayman_____________"]);

  const directory = path.dirname(filename);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  await workbook.xlsx.writeFile(filename);
};

module.exports = { generateCourierHTML, generateCourierExcel };
