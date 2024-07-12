const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const generateWarehouseHTML = (data, filename) => {
  const {
    distributed_to = [],
    by_morning = 0,
    accepted_from = [],
    current = 0,
    butun = 0,
    nasechka = 0,
    melaj = 0,
    kamomat = 0,
    accepted = 0,
  } = data;

  const totalDistributed = distributed_to.reduce(
    (acc, distribution) => acc + distribution.eggs || 0,
    0
  );

  const totalRemained = distributed_to.reduce(
    (acc, distribution) => acc + distribution.remained || 0,
    0
  );

  const totalBroken = distributed_to.reduce(
    (acc, distribution) => acc + distribution.broken || 0,
    0
  );

  // Get today's date at 6 a.m.
  const today6am = new Date();
  today6am.setHours(6, 0, 0, 0);
  const today6amStr = today6am.toLocaleString('uz-UZ', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const summaryHtml = `
    <table border="1" style="width:100%; border-collapse: collapse;">
      <tr>
        <td style="text-align: center; vertical-align: middle" colspan="1">${today6amStr}</td>
        <td style="text-align: center; vertical-align: middle" colspan="1" rowspan="2">${by_morning}</td>
        <td style="text-align: center; vertical-align: middle" colspan="3" rowspan="${Object.keys(accepted_from).length > 1 ? Object.keys(accepted_from).length + 2 : 3}">Jami:\n\n${accepted}</td>
      </tr>
      <tr>
        <td>Tong</td>
      </tr>
      ${accepted_from
      .map(
        (accepted, index) => `
        <tr>
          <td style="text-align: center; vertical-align: middle" colspan="1">${accepted.importerName}</td>
          <td style="text-align: center; vertical-align: middle" colspan="1">${accepted.amount}</td>
        </tr>
      `
      )
      .join("")}
      <tr>
        <th colspan="5"></th>
      </tr>
      <tr>
        <th>Nomi</th>
        <th>Yuklandi</th>
        <th>Astatka</th>
        <th>Singan</th>
        <th>Imzo</th>
      </tr>
      ${distributed_to
      .map(
        (distribution, index) => `
        <tr>
          <td style="text-align: center; vertical-align: middle">${index + 1}. ${distribution.courier_name}</td>
          <td style="text-align: center; vertical-align: middle">${distribution.eggs || 0}</td>
          <td style="text-align: center; vertical-align: middle">${distribution.remained}</td>
          <td style="text-align: center; vertical-align: middle">${distribution.broken}</td>
          <td style="text-align: center; vertical-align: middle"></td>
        </tr>
      `
      )
      .join("")}
      <tr>
        <th colspan="5"></th>
      </tr>
      <tr>
        <th>Jami</th>
        <th>${totalDistributed}</th>
        <th>${totalRemained}</th>
        <th>${totalBroken}</th>
        <th></th>
      </tr>
      <tr>
        <td colspan="3">Kun yakuniga xisobot</td>
        <td>Butun</td>
        <td style="text-align: center; vertical-align: middle">${butun}</td>
      </tr>
      <tr>
        <td>Kamomat</td>
        <td style="text-align: center; vertical-align: middle" colspan="2">${kamomat}</td>
        <td>Nasechka</td>
        <td style="text-align: center; vertical-align: middle">${nasechka}</td>
      </tr>
      <tr>
        <td>Qolgan tuxum soni</td>
        <td style="text-align: center; vertical-align: middle" colspan="2">${current}</td>
        <td>Melaj</td>
        <td style="text-align: center; vertical-align: middle">${melaj}</td>
      </tr>
      <tr>
        <td colspan="3">Ombor mudiri</td>
        <td colspan="2"></td>
      </tr>
    </table>
  `;

  const directory = path.dirname(filename);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  fs.writeFileSync(filename, summaryHtml);
};

const generateWarehouseExcel = async (data, filename) => {
  const {
    distributed_to = [],
    by_morning = 0,
    accepted_at = [],
    current = 0,
    couriers_broken = 0,
    couriers_current = 0,
    butun = 0,
    nasechka = 0,
    melaj = 0,
    kamomat = 0,
    accepted = 0,
  } = data;

  const totalDistributed = distributed_to.reduce(
    (acc, distribution) => acc + distribution.eggs,
    0
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Warehouse Report");

  sheet.addRow(["Jami", by_morning + accepted]);
  sheet.addRow(["Tong", by_morning]);
  sheet.addRow(["Kirim", accepted]);

  accepted_at.forEach((accepted, index) => {
    sheet.addRow([`${index + 1}. ${accepted.amount}`, accepted.time]);
  });

  sheet.addRow([]);
  sheet.addRow(["Nomi", "Yuklandi", "Astatka", "Singan", "Imzo"]);

  distributed_to.forEach((distribution, index) => {
    sheet.addRow([
      `${index + 1}. ${distribution.courier_name}`,
      distribution.eggs,
      "",
      "",
      "",
    ]);
  });

  sheet.addRow([]);
  sheet.addRow([
    "Jami",
    totalDistributed,
    couriers_current,
    couriers_broken,
    "",
  ]);
  sheet.addRow(["Kun yakuniga xisobot", "Butun", butun]);
  sheet.addRow(["Kamomat", kamomat, "", "Nasechka", nasechka]);
  sheet.addRow(["Qolgan tuxum soni", current, "", "Melaj", melaj]);
  sheet.addRow(["Ombor mudiri_____________"]);

  const directory = path.dirname(filename);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  await workbook.xlsx.writeFile(filename);
};

module.exports = { generateWarehouseHTML, generateWarehouseExcel };
