const XLSX = require('xlsx');
const puppeteer = require('puppeteer');
const fs = require('fs');

const htmlTemplate = (summaryHtml, detailsHtml) => `
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
<h1>Bugungi Yetkazmalar</h1>
${summaryHtml}
<h2>Batafsil ma'lumot</h2>
${detailsHtml}
</body>
</html>
`;

const convertExcelToImage = async (filename) => {
  const wb = XLSX.readFile(filename);
  const wsSummary = wb.Sheets['Summary'];
  const wsDetails = wb.Sheets['Details'];

  const summaryHtml = XLSX.utils.sheet_to_html(wsSummary);
  const detailsHtml = XLSX.utils.sheet_to_html(wsDetails);

  const htmlContent = htmlTemplate(summaryHtml, detailsHtml);

  fs.writeFileSync('report.html', htmlContent);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

  // Adjust viewport height to capture all content
  const dimensions = await page.evaluate(() => {
    return {
      width: document.body.scrollWidth,
      height: document.body.scrollHeight
    };
  });

  await page.setViewport({
    width: dimensions.width,
    height: dimensions.height
  });

  // Capture the content as a JPG image
  await page.screenshot({ path: 'report.jpg', type: 'jpeg', fullPage: true });

  await browser.close();
};

module.exports = convertExcelToImage;
