const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const generateWarehouseHTML = (data, filename) => {
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
    accepted = 0
  } = data;

  const totalDistributed = distributed_to.reduce((acc, distribution) => acc + distribution.eggs, 0);

  const summaryHtml = `
    <table border="1" style="width:100%; border-collapse: collapse;">
      <tr>
        <td>Jami</td>
        <td colspan="4">${by_morning + accepted}</td>
      </tr>
      <tr>
        <td>Tong</td>
        <td colspan="4">${by_morning}</td>
      </tr>
      <tr>
        <td>Kirim</td>
        <td colspan="4">${accepted}</td>
      </tr>
      ${accepted_at.map((accepted, index) => `
        <tr>
          <td colspan="2">${index + 1}. ${accepted.amount}</td>
          <td colspan="3">${accepted.time}</td>
        </tr>
      `).join('')}
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
      ${distributed_to.map((distribution, index) => `
        <tr>
          <td>${index + 1}. ${distribution.courier_name}</td>
          <td>${distribution.eggs}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `).join('')}
      <tr>
        <th colspan="5"></th>
      </tr>
      <tr>
        <th>Jami</th>
        <th>${totalDistributed}</th>
        <th>${couriers_current}</th>
        <th>${couriers_broken}</th>
        <th></th>
      </tr>
      <tr>
        <td colspan="3">Kun yakuniga xisobot</td>
        <td>Butun</td>
        <td>${butun}</td>
      </tr>
      <tr>
        <td>Kamomat</td>
        <td colspan="2">${kamomat}</td>
        <td>Nasechka</td>
        <td>${nasechka}</td>
      </tr>
      <tr>
        <td>Qolgan tuxum soni</td>
        <td colspan="2">${current}</td>
        <td>Melaj</td>
        <td>${melaj}</td>
      </tr>
      <tr>
        <td colspan="3">Ombor mudiri</td>
        <td colspan="2">_____________</td>
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
    accepted = 0
  } = data;

  const totalDistributed = distributed_to.reduce((acc, distribution) => acc + distribution.eggs, 0);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Warehouse Report');

  sheet.addRow(['Jami', by_morning + accepted]);
  sheet.addRow(['Tong', by_morning]);
  sheet.addRow(['Kirim', accepted]);

  accepted_at.forEach((accepted, index) => {
    sheet.addRow([`${index + 1}. ${accepted.amount}`, accepted.time]);
  });

  sheet.addRow([]);
  sheet.addRow(['Nomi', 'Yuklandi', 'Astatka', 'Singan', 'Imzo']);

  distributed_to.forEach((distribution, index) => {
    sheet.addRow([
      `${index + 1}. ${distribution.courier_name}`,
      distribution.eggs,
      '',
      '',
      ''
    ]);
  });

  sheet.addRow([]);
  sheet.addRow(['Jami', totalDistributed, couriers_current, couriers_broken, '']);
  sheet.addRow(['Kun yakuniga xisobot', 'Butun', butun]);
  sheet.addRow(['Kamomat', kamomat, '', 'Nasechka', nasechka]);
  sheet.addRow(['Qolgan tuxum soni', current, '', 'Melaj', melaj]);
  sheet.addRow(['Ombor mudiri_____________']);

  const directory = path.dirname(filename);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  await workbook.xlsx.writeFile(filename);
};

module.exports = { generateWarehouseHTML, generateWarehouseExcel };