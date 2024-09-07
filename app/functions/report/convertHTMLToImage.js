const puppeteer = require("puppeteer");
const fs = require("fs");

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const convertHTMLToImage = async (htmlFilename, imageFilename, fontChoice = 'Roboto') => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let browser;
    try {
      console.log(`Attempt ${attempt} to launch browser`);
      browser = await puppeteer.launch({
        headless: "new",
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions',
          '--ignore-certificate-errors'
        ],
        timeout: 60000,
        ignoreHTTPSErrors: true,
        dumpio: true
      });

      const page = await browser.newPage();
      console.log('New page created');

      let htmlContent = fs.readFileSync(htmlFilename, "utf8");
      console.log('HTML content read');

      // Inject font-face and apply it to the body
      const fontFace = fontChoice === 'Poppins' ? 
        `@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');` :
        `@import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');`;

      htmlContent = `
        <style>
          ${fontFace}
          body { font-family: '${fontChoice}', sans-serif; }
        </style>
        ${htmlContent}
      `;

      await page.setContent(htmlContent, { waitUntil: "networkidle0", timeout: 60000 });
      console.log('Content set on page with custom font');

      // Wait a bit to ensure fonts are loaded
      await sleep(1000);

      const dimensions = await page.evaluate(() => {
        return {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        };
      });
      console.log('Page dimensions calculated', dimensions);

      await page.setViewport({
        width: dimensions.width,
        height: dimensions.height,
      });
      console.log('Viewport set');

      await page.screenshot({ path: imageFilename, type: "jpeg", fullPage: true });
      console.log('Screenshot taken');

      await browser.close();
      console.log('Browser closed successfully');
      return; // Success, exit the function
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
      if (attempt === MAX_RETRIES) {
        throw error; // Rethrow the error if all retries have been exhausted
      }
      await sleep(RETRY_DELAY);
    }
  }
};

module.exports = convertHTMLToImage;