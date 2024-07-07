// convertHTMLToImage.js

const puppeteer = require('puppeteer');
const fs = require('fs');

const convertHTMLToImage = async (htmlFilename, imageFilename) => {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const htmlContent = fs.readFileSync(htmlFilename, 'utf8');

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
  await page.screenshot({ path: imageFilename, type: 'jpeg', fullPage: true });

  await browser.close();
};

module.exports = convertHTMLToImage;
