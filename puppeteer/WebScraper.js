const puppeteer = require("puppeteer");
const PageOptimizer = require("./PageOptimizer");
const Logger = require("../logger");
const config = require("./config");

class WebScraper {
  constructor(source) {
    this.logger = new Logger();
    this._data = [];
    this.source = source;
    this.browser;
    this.pages = {};
    this.page;
    this.pageCount;
  }

  static encode(query) {
    return encodeURIComponent(JSON.stringify(query));
  }

  get data() {
    return this._data;
  }

  _storePageReference(page, pageReference) {
    this.pageCount = ++this.pageCount || 1;
    const ref = pageReference || this.pageCount;
    const key = `page${this.pageCount}`;
    const value = {
      id: this.pageCount,
      ref,
      page,
      source: this.source,
    };
    this.pages[key] = value;
  }

  async newPage(pageURL, pageReference) {
    try {
      if (!this.browser) {
        const err = "No browser running. Start your webscraper";
        throw new Error(err);
      }
      const page = await this.browser.newPage();
      this._storePageReference(page, pageReference);
      await PageOptimizer.optimizePageLoad(page);
      if (pageURL) {
        const msg = `Attempting to connect to ${pageURL.substring(0, 32)}...`;
        this.logger.log(msg);
        await page.goto(pageURL, { timeout: 10000, waitUntil: "load" });
        await PageOptimizer.waitTillHTMLRendered(page);
      }
      return page;
    } catch (err) {
      this.logger.error("newPage fn");
      this.logger.error(err);
    }
  }

  async start() {
    try {
      this.browser = await puppeteer.launch(config.options);
      return this.browser;
    } catch (err) {
      this.logger.error(err);
    }
  }
}

module.exports = WebScraper;
