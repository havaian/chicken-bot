const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const generateWarehouseHTML = (data, filename) => {
  const {
    distributed_to = [],
    by_morning = {},
    current = {},
    intact = {},
    deficit = {},
    incision = {},
    melange = {},
    melange_by_warehouse = {},
    broken = {},
    accepted = [],
    remained = {}
  } = data;

  const totalDistributed = {};
  const totalRemained = {};
  const totalBroken = {};

  distributed_to.forEach(distribution => {
    for (let [category, amount] of Object.entries(distribution.eggs || {})) {
      if (!totalDistributed[category]) totalDistributed[category] = 0;
      totalDistributed[category] += amount;
    }
    for (let [category, amount] of Object.entries(distribution.remained || {})) {
      if (!totalRemained[category]) totalRemained[category] = 0;
      totalRemained[category] += amount;
    }
    for (let [category, amount] of Object.entries(distribution.broken || {})) {
      if (!totalBroken[category]) totalBroken[category] = 0;
      totalBroken[category] += amount;
    }
  });

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
        <td style="text-align: center; vertical-align: middle" colspan="1" rowspan="2">${Object.entries(by_morning).map(([category, amount]) => `${category}: <b>${amount}</b>`).join("<br>")}</td>
        <td style="text-align: center; vertical-align: middle" colspan="1" rowspan="${accepted.length > 1 ? accepted.length + 2 : 3}">
          Jami:<br>
          ${(() => {
            const combinedCategories = { ...by_morning };

            // Process eggs from accepted array
            for (const item of accepted) {              
              for (const [category, amount] of Object.entries(item.eggsReceived || {})) {                
                combinedCategories[category] = (combinedCategories[category] || 0) + amount;
              }
            }
            
            // Format combined categories
            return Object.entries(combinedCategories)
              .map(([category, amount]) => `${category}: <b>${amount}</b>`)
              .join("<br>");
          })()}
        </td>
        <td style="text-align: center; vertical-align: middle" colspan="1" rowspan="${accepted.length > 1 ? accepted.length + 2 : 3}">
          Astatka:<br>
          ${(() => {
            // Format combined categories
            return Object.entries(remained)
              .map(([category, amount]) => `${category}: <b>${amount}</b>`)
              .join("<br>");
          })()}
        </td>
      </tr>
      <tr>
        <td>Tong</td>
      </tr>
      ${accepted.length > 0 
      ? accepted.map(
        (accept) => Object.entries(accept.eggsReceived || {}).map(([category, amount]) => `
        <tr>
          <td style="text-align: center; vertical-align: middle" colspan="1">${accept.importerName}</td>
          <td style="text-align: center; vertical-align: middle" colspan="1">${category}: <b>${amount}</b></td>
        </tr>
      `).join("")
      ).join("") 
      : ''}
      <tr>
        <td colspan="5"></td>
      </tr>
      <tr>
        <td>Nomi</td>
        <td>Yuklandi</td>
        <td>Astatka</td>
        <!--<td>Singan</td>-->
        <td>Imzo</td>
      </tr>
      ${distributed_to
      .map(
        (distribution, index) => `
        <tr>
          <td style="text-align: left; vertical-align: middle">${index + 1}. ${distribution.courier_name || ""}</td>
          <td style="text-align: left; vertical-align: middle">${Object.entries(distribution.eggs || {})
            .filter(([_, amount]) => amount > 0)
            .map(([category, amount]) => `${category}: <b>${amount}</b>`)
            .join("<br>")}</td>
          <td style="text-align: left; vertical-align: middle">${Object.entries(distribution.remained || {})
            .map(([category, amount]) => `${category}: <b>${amount}</b>`)
            .join("<br>")}</td>
          <!--<td style="text-align: left; vertical-align: middle">${Object.entries(distribution.broken || {})
            .map(([category, amount]) => `${category}: <b>${amount}</b>`)
            .join("<br>")}</td>-->
          <td style="text-align: left; vertical-align: middle"></td>
        </tr>
      `
      )
      .join("")}
      <tr>
        <td colspan="5"></td>
      </tr>
      <tr>
        <td colspan="1">Ombor singan</td>
        <td style="text-align: center; vertical-align: middle" colspan="4">${Object.entries(broken).map(([category, amount]) => `${category}: <b>${amount}</b>`).join("<br>")}</td>
      </tr>
      <tr>
        <td>Jami</td>
        <td>${Object.entries(totalDistributed).map(([category, amount]) => `${category}: <b>${amount}</b>`).join("<br>")}</td>
        <td>${Object.entries(totalRemained).map(([category, amount]) => `${category}: <b>${amount}</b>`).join("<br>")}</td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td colspan="3">Kun yakuniga xisobot</td>
        <td>Butun</td>
        <td style="text-align: center; vertical-align: middle">${Object.entries(intact).map(([category, amount]) => `${category}: <b>${amount}</b>`).join("<br>")}</td>
      </tr>
      <tr>
        <td>Kamomad</td>
        <td style="text-align: center; vertical-align: middle" colspan="2">${Object.entries(deficit).map(([category, amount]) => `${category}: <b>${amount}</b>`).join("<br>")}</td>
        <td>Nasechka</td>
        <td style="text-align: center; vertical-align: middle">${Object.entries(incision).map(([category, amount]) => `${category}: <b>${amount}</b>`).join("<br>")}</td>
      </tr>
      <tr>
        <td>Qolgan tuxum soni</td>
        <td style="text-align: center; vertical-align: middle" colspan="2">${Object.entries(current).map(([category, amount]) => `${category}: <b>${amount}</b>`).join("<br>")}</td>
        <td>Melanj</td>
        <td style="text-align: center; vertical-align: middle">${Object.entries(melange_by_warehouse).map(([category, amount]) => `${category}: <b>${amount || 0} (${amount * 25})</b>`).join("<br>")}</td>
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
    by_morning = {},
    current = {},
    accepted = [],
    intact = {},
    deficit = {},
    incision = {},
    melange = {},
    broken = {},
  } = data;

  const totalDistributed = {};
  const totalRemained = {};
  const totalBroken = {};

  distributed_to.forEach(distribution => {
    for (let [category, amount] of Object.entries(distribution.eggs || {})) {
      if (!totalDistributed[category]) totalDistributed[category] = 0;
      totalDistributed[category] += amount;
    }
    for (let [category, amount] of Object.entries(distribution.remained || {})) {
      if (!totalRemained[category]) totalRemained[category] = 0;
      totalRemained[category] += amount;
    }
    for (let [category, amount] of Object.entries(distribution.broken || {})) {
      if (!totalBroken[category]) totalBroken[category] = 0;
      totalBroken[category] += amount;
    }
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Warehouse Report");

  sheet.addRow(["Jami", Object.entries(by_morning).reduce((sum, [category, amount]) => sum + amount, 0) + accepted.reduce((sum, item) => sum + item.amount, 0)]);
  sheet.addRow(["Tong", Object.entries(by_morning).map(([category, amount]) => `${category}: ${amount}`).join("\n")]);
  sheet.addRow(["Kirim", accepted.map(item => `${item.category}: ${item.amount}`).join("\n")]);

  accepted.forEach((accept, index) => {
    sheet.addRow([`${index + 1}. ${accept.category || ""}`, accept.amount || 0]);
  });

  sheet.addRow([]);
  sheet.addRow(["Nomi", "Yuklandi", "Astatka", "Singan", "Imzo"]);

  distributed_to.forEach((distribution, index) => {
    sheet.addRow([
      `${index + 1}. ${distribution.courier_name || ""}`,
      Object.entries(distribution.eggs || {})
        .filter(([_, amount]) => amount > 0)
        .map(([category, amount]) => `${category}: ${amount}`)
        .join("\n"),
      Object.entries(distribution.remained || {}).map(([category, amount]) => `${category}: ${amount}`).join("\n"),
      Object.entries(distribution.broken || {}).map(([category, amount]) => `${category}: ${amount}`).join("\n"),
      "",
    ]);
  });

  sheet.addRow([]);
  sheet.addRow([
    "Jami",
    Object.entries(totalDistributed).map(([category, amount]) => `${category}: ${amount}`).join("\n"),
    Object.entries(totalRemained).map(([category, amount]) => `${category}: ${amount}`).join("\n"),
    "Jami",
    Object.entries(totalBroken).map(([category, amount]) => `${category}: ${amount}`).join("\n")
  ]);
  sheet.addRow(["Ombor singan", Object.entries(broken).map(([category, amount]) => `${category}: ${amount}`).join("\n")]);
  sheet.addRow(["Kun yakuniga xisobot", "Butun", Object.entries(intact).map(([category, amount]) => `${category}: ${amount}`).join("\n")]);
  sheet.addRow(["Kamomad", Object.entries(deficit).map(([category, amount]) => `${category}: ${amount}`).join("\n"), "Nasechka", Object.entries(incision).map(([category, amount]) => `${category}: ${amount}`).join("\n")]);
  sheet.addRow(["Qolgan tuxum soni", Object.entries(current).map(([category, amount]) => `${category}: ${amount}`).join("\n"), "Melanj", Object.entries(melange).map(([category, amount]) => `${category}: ${amount}`).join("\n")]);
  sheet.addRow(["Ombor mudiri_____________"]);

  const directory = path.dirname(filename);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  await workbook.xlsx.writeFile(filename);
};

module.exports = { generateWarehouseHTML, generateWarehouseExcel };
