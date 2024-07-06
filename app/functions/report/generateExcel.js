const XLSX = require('xlsx');

const generateExcel = (data, filename) => {
  const { delivered_to, remained, broken, earnings, expenses } = data;
  const totalDelivered = delivered_to.reduce((acc, delivery) => acc + delivery.eggs, 0);
  const customersCount = delivered_to.length;

  const summaryData = [
    ["Bugungi Yetkazmalar"],
    ["Yetkazilgan", `${customersCount} mijozlar`],
    ["Qolgan tuxumlar", remained],
    ["Umumiy daromad", earnings],
    ["Singan tuxumlar", broken],
    ["Chiqim", expenses],
    ["Umumiy yetkazilgan tuxumlar", totalDelivered]
  ];

  const detailsData = delivered_to.map((delivery, index) => [
    `${index + 1}. ${delivery.name}`, `${delivery.eggs} tuxum`, `${delivery.payment} olindi`, `Vaqt: ${delivery.time}`
  ]);

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);

  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
  XLSX.utils.book_append_sheet(wb, wsDetails, "Details");

  XLSX.writeFile(wb, filename);
};

module.exports = generateExcel;
