// Puppeteer Global Config
const config = {
  options: {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--window-position=0,0",
      "--ignore-certifcate-errors",
      "--ignore-certifcate-errors-spki-list",
      '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"',
    ],
    headless: true,
    ignoreHTTPSErrors: false,
    // userDataDir: "./tmp",
    // slowMo: 0,
  },
};

module.exports = config;
