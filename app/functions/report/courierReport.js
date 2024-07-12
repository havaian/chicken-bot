const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const generateCourierHTML = (data, filename) => {
  const { delivered_to, by_morning, current, accepted, broken, expenses, courier_name, date } = data;
  const totalDelivered = delivered_to.reduce((acc, delivery) => acc + delivery.eggs, 0);
  const totalPayments = delivered_to.reduce((acc, delivery) => acc + delivery.payment, 0);
  const totalEarnings = totalPayments - expenses;

  // Limit to 40 entries
  const limitedDeliveredTo = delivered_to.slice(0, 40);

  const summaryHtml = `
    <table style="width:100%">
      <tr>
        <td colspan="2">Men yetkazib beruvchi F.I.O ${courier_name || ''}</td>
      </tr>
      <tr>
        <td colspan="2">Sana ${date ? new Date(date).toLocaleDateString() : ''}</td>
      </tr>
      <tr>
        <td>Olingan tuxum soni ${accepted || 0}</td>
        <td>Bor edi ${by_morning || 0}</td>
        <td>Jami ${(accepted || 0) + (by_morning || 0)}</td>
        <td>Sanab oldim_____________</td>
      </tr>
    </table>
    <br>
    <table border="1" style="width:100%; border-collapse: collapse;">
      <tr>
        <th>Mijoz</th>
        <th>Tuxum soni</th>
        <th>Narxi</th>
        <th>Olingan pul</th>
        <th>Qolgan pul</th>
      </tr>
      ${limitedDeliveredTo.map((delivery, index) => `
        <tr>
          <td>${index + 1}. ${delivery.name}</td>
          <td>${delivery.eggs}</td>
          <td>${delivery.price}</td>
          <td>${delivery.payment}</td>
          <td>${delivery.debt}</td>
        </tr>
      `).join('')}
    </table>
    <br>
    <table style="width:100%">
      <tr>
        <td>Tarqatilgan tuxum soni ${totalDelivered}</td>
        <td>Umumiy yig‘ilgan pul ${totalPayments}</td>
      </tr>
      <tr>
        <td>Qolgan tuxum soni ${current || 0}</td>
        <td>Chiqim ${expenses || 0}</td>
      </tr>
      <tr>
        <td>Singan tuxum soni ${broken || 0}</td>
        <td>Topshirilgan kassa ${totalEarnings}</td>
      </tr>
    </table>
    <p>Ushbu xisobot bo‘yicha qolib ketgan pullarni VTT«Nasriddinov Sirojiddin Nuriddinovich»ga olib kelib topshirishini o‘z zimamga olaman.</p>
    <table style="width:100%">
      <tr>
        <td>Yetkazib beruvchi ${courier_name || ''}</td>
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
  const { delivered_to, by_morning, current, accepted, broken, expenses, courier_name, date } = data;
  const totalDelivered = delivered_to.reduce((acc, delivery) => acc + delivery.eggs, 0);
  const totalPayments = delivered_to.reduce((acc, delivery) => acc + delivery.payment, 0);
  const totalEarnings = totalPayments - expenses;

  // Limit to 40 entries
  const limitedDeliveredTo = delivered_to.slice(0, 40);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Courier Report');

  sheet.addRow(['Men yetkazib beruvchi F.I.O', courier_name || '']);
  sheet.addRow(['Sana', date ? new Date(date).toLocaleDateString() : '']);
  sheet.addRow(['Olingan tuxum soni', accepted || '']);
  sheet.addRow(['Bor edi', by_morning || '']);
  sheet.addRow(['Jami', (accepted || 0) + (by_morning || 0)]);
  sheet.addRow(['Sanab oldim_____________']);

  sheet.addRow([]);
  sheet.addRow(['Mijoz', 'Tuxum soni', 'Narxi', 'Olingan pul', 'Qolgan pul']);

  limitedDeliveredTo.forEach((delivery, index) => {
    sheet.addRow([
      `${index + 1}. ${delivery.name}`,
      delivery.eggs,
      delivery.price,
      delivery.payment,
      delivery.debt
    ]);
  });

  sheet.addRow([]);
  sheet.addRow(['Tarqatilgan tuxum soni', totalDelivered]);
  sheet.addRow(['Umumiy yig‘ilgan pul', totalPayments]);
  sheet.addRow(['Qolgan tuxum soni', current || 0]);
  sheet.addRow(['Chiqim', expenses || 0]);
  sheet.addRow(['Singan tuxum soni', broken || 0]);
  sheet.addRow(['Topshirilgan kassa', totalEarnings]);

  sheet.addRow([]);
  sheet.addRow(['Ushbu xisobot bo‘yicha qolib ketgan pullarni VTT«Nasriddinov Sirojiddin Nuriddinovich»ga olib kelib topshirishini o‘z zimamga olaman.']);
  sheet.addRow(['Yetkazib beruvchi', courier_name || '']);
  sheet.addRow(['Tasdiqlayman_____________']);

  const directory = path.dirname(filename);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  await workbook.xlsx.writeFile(filename);
};

module.exports = { generateCourierHTML, generateCourierExcel };
