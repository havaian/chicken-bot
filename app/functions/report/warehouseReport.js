const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const generateWarehouseHTML = (data, filename) => {
  const {
    distributed_to = [],
    by_morning = 0,
    accepted_from = [],
    current = 0,
    intact = 0,
    deficit = 0,
    incision = 0,
    melange = 0,
    broken = 0,
    accepted = 0,
  } = data;

  const totalDistributed = distributed_to.reduce(
    (acc, distribution) => acc + (distribution.eggs || 0),
    0
  );

  const totalRemained = distributed_to.reduce(
    (acc, distribution) => acc + (distribution.remained || 0),
    0
  );

  const totalBroken = distributed_to.reduce(
    (acc, distribution) => acc + (distribution.broken || 0),
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
        <th style="text-align: center; vertical-align: middle" colspan="1" rowspan="2">${by_morning}</th>
        <th style="text-align: center; vertical-align: middle" colspan="3" rowspan="${Object.keys(accepted_from).length > 1 ? Object.keys(accepted_from).length + 2 : 3}">Jami:\n\n${by_morning + accepted}</th>
      </tr>
      <tr>
        <td>Tong</td>
      </tr>
      ${accepted_from
      .map(
        (accepted, index) => `
        <tr>
          <td style="text-align: center; vertical-align: middle" colspan="1">${accepted.importerName || ""}</td>
          <th style="text-align: center; vertical-align: middle" colspan="1">${accepted.amount || 0}</th>
        </tr>
      `
      )
      .join("")}
      <tr>
        <td colspan="5"></td>
      </tr>
      <tr>
        <td>Nomi</td>
        <td>Yuklandi</td>
        <td>Astatka</td>
        <td>Singan</td>
        <td>Imzo</td>
      </tr>
      ${distributed_to
      .map(
        (distribution, index) => `
        <tr>
          <td style="text-align: center; vertical-align: middle">${index + 1}. ${distribution.courier_name || ""}</td>
          <th style="text-align: center; vertical-align: middle">${distribution.eggs || 0}</th>
          <th style="text-align: center; vertical-align: middle">${distribution.remained || 0}</th>
          <th style="text-align: center; vertical-align: middle">${distribution.broken || 0}</th>
          <td style="text-align: center; vertical-align: middle"></td>
        </tr>
      `
      )
      .join("")}
      <tr>
        <td colspan="5"></td>
      </tr>
      <tr>
        <td colspan="1">Ombor singan</td>
        <th style="text-align: center; vertical-align: middle" colspan="4">${broken}</th>
      </tr>
      <tr>
        <td>Jami</td>
        <th>${totalDistributed}</th>
        <th>${totalRemained}</th>
        <td>Jami</td>
        <th>${totalBroken}</th>
      </tr>
      <tr>
        <td colspan="3">Kun yakuniga xisobot</td>
        <td>Butun</td>
        <th style="text-align: center; vertical-align: middle">${intact}</th>
      </tr>
      <tr>
        <td>Kamomat</td>
        <th style="text-align: center; vertical-align: middle" colspan="2">${deficit}</th>
        <td>Nasechka</td>
        <th style="text-align: center; vertical-align: middle">${incision}</th>
      </tr>
      <tr>
        <td>Qolgan tuxum soni</td>
        <th style="text-align: center; vertical-align: middle" colspan="2">${current}</th>
        <td>Melanj</td>
        <th style="text-align: center; vertical-align: middle">${melange}</th>
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
    current = 0,
    accepted = [],
    accepted_from = [],
    intact = 0,
    deficit = 0,
    incision = 0,
    melange = 0,
    broken = 0,
  } = data;

  const totalDistributed = distributed_to.reduce(
    (acc, distribution) => acc + (distribution.eggs || 0),
    0
  );

  const totalRemained = distributed_to.reduce(
    (acc, distribution) => acc + (distribution.remained || 0),
    0
  );

  const totalBroken = distributed_to.reduce(
    (acc, distribution) => acc + (distribution.broken || 0),
    0
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Warehouse Report");

  sheet.addRow(["Jami", by_morning + accepted]);
  sheet.addRow(["Tong", by_morning]);
  sheet.addRow(["Kirim", accepted]);

  accepted_from.forEach((accepted, index) => {
    sheet.addRow([`${index + 1}. ${accepted.importerName || ""}`, accepted.amount || 0]);
  });

  sheet.addRow([]);
  sheet.addRow(["Nomi", "Yuklandi", "Astatka", "Singan", "Imzo"]);

  distributed_to.forEach((distribution, index) => {
    sheet.addRow([
      `${index + 1}. ${distribution.courier_name || ""}`,
      distribution.eggs || 0,
      "",
      "",
      "",
    ]);
  });

  sheet.addRow([]);
  sheet.addRow([
    "Jami",
    totalDistributed,
    totalRemained,
    "Jami",
    totalBroken
  ]);
  sheet.addRow(["Ombor singan", broken]);
  sheet.addRow(["Kun yakuniga xisobot", "Butun", intact]);
  sheet.addRow(["Kamomat", deficit, "Nasechka", incision]);
  sheet.addRow(["Qolgan tuxum soni", current, "Melaj", melange]);
  sheet.addRow(["Ombor mudiri_____________"]);

  const directory = path.dirname(filename);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  await workbook.xlsx.writeFile(filename);
};

module.exports = { generateWarehouseHTML, generateWarehouseExcel };
