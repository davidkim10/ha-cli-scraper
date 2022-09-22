const Logger = require("../logger");
const WebScraper = require("../puppeteer/WebScraper");
const PageOptimizer = require("../puppeteer/PageOptimizer");

const searchWashington = async (query, requestedQuantity) => {
  const logger = new Logger();
  const BASE_URL = "https://secure.lni.wa.gov/verify/Results.aspx";
  const BUSINESS_IDS = [];
  const DATA_POINTS = {
    firstName: "#BusinesOwnersFirstName",
    lastName: "#BusinesOwnersLastName",
    phoneNumber: "#PhoneNumber",
    licenseEffective: "#EffectiveDate",
    licenseExpiration: "#ExpirationDate",
  };
  const SEARCH_QUERY = WebScraper.encode({
    pageNumber: 0,
    SearchType: 2,
    SortColumn: "Rank",
    SortOrder: "desc",
    pageSize: 10,
    ContractorTypeFilter: [],
    SessionID: "kniflv0uwlms0nbww40c4j0e",
    SAW: "",
    Name: `${query}`,
    searchCat: "Name",
    searchText: `${query}`,
    firstSearch: 1,
  });

  // Create web scraper
  logger.start();
  const targetURL = `${BASE_URL}#${SEARCH_QUERY}`;
  const webScraper = new WebScraper("Washington License Board");
  const browser = await webScraper.start();
  const page = await webScraper.newPage(targetURL, "homepage");

  // Click checkbox to display active only
  // Change selector to show 100 results
  async function clickCheckBoxAndResultCount() {
    await page.$eval("#chkLicStatus", (checkbox) => checkbox.click());
    await page.$eval("#resultsLengthSelect", (el) => el.click());
    await page.select("select#resultsLengthSelect", "100");
    try {
      PageOptimizer.waitTillHTMLRendered(page);
      await page.waitForSelector("#chkLicStatusNo");
      await page.waitForSelector("#itemsTotal");
    } catch (err) {
      if (WebScraper.isTimeOutError(err)) {
        logger.error(`Timeout Error!: ${err.message}`);
      }
    }
  }

  // Parse text for total results
  async function getTotalResults() {
    return await page.$eval("#chkLicStatusNo", (el) => {
      const strPattern = new RegExp(`["'()]`, "g");
      return el.innerText.replace(strPattern, "");
    });
  }

  async function scrapeBusinessIds(quantity) {
    try {
      await page.waitForSelector(".resultItem");
      await page.waitForSelector("#itemsShowing");
      // Get ID's of each business profile.
      // Filter IDs to only get business listings starting with UBI
      // Does not use regular path names for each profile.
      // Require IDs to view page.
      const businessIds = await page.$$eval(
        ".resultItem",
        (results, quantity) => {
          return results
            .map((result) => result.id)
            .slice(0, quantity)
            .filter((id) => /^ubi/gim.test(id))
            .filter(Boolean);
        },
        quantity
      );
      return businessIds;
    } catch (err) {
      logger.error(err);
    }
  }

  async function scrapeBusinessPage(page, businessId) {
    const targetURL = `https://secure.lni.wa.gov/verify/Detail.aspx?${businessId}`;
    try {
      await page.goto(targetURL, { waitUntil: "domcontentloaded" });
      await PageOptimizer.waitTillHTMLRendered(page);
      logger.scrape(`Business ID: ${businessId}`);
      const companyData = await page.evaluate((DATA_POINTS) => {
        const getText = (q) => document.querySelector(q).innerText.trim();
        return Object.keys(DATA_POINTS).reduce((acc, key) => {
          const elementId = DATA_POINTS[key];
          const value = getText(elementId) || "n/a";
          const data = {
            ...acc,
            [key]: value,
          };
          return data;
        }, {});
      }, DATA_POINTS);

      return companyData;
    } catch (err) {
      logger.error(err);
    }
  }

  async function getNumberOfResultsDisplayed() {
    return page.$eval(
      "#itemsShowing",
      (currentResult) => currentResult.innerText.split("-")[1]
    );
  }

  async function paginateResultsPer100() {
    // Scrape directory and get all business ids
    // Where are we in the results page? Set initial val.
    let resultsShowing = await getNumberOfResultsDisplayed();
    while (resultsShowing != TOTAL_RESULTS) {
      console.log(`[EVALUATING]: ${resultsShowing} | ${TOTAL_RESULTS}`);
      const groupOfIds = await scrapeBusinessIds();
      BUSINESS_IDS.push(...groupOfIds);

      // Go to next page
      await page.$eval(".nextButton", (btn) => btn.click());

      // Update results showing to next batch (per 100)
      resultsShowing = getNumberOfResultsDisplayed(requestedQuantity);
    }
  }

  // Update page to view results
  await clickCheckBoxAndResultCount();
  const TOTAL_RESULTS = await getTotalResults();

  await Promise.race([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.waitFor(() => !!document.querySelectorAll(".resultItem").length > 0),
  ]);

  if (requestedQuantity > 100) {
    await paginateResultsPer100();
  } else {
    const groupOfIds = await scrapeBusinessIds(requestedQuantity);
    BUSINESS_IDS.push(...groupOfIds);
  }

  // Loop through each ID (business profile) from the list above
  const page2 = await browser.newPage();
  for (let business of BUSINESS_IDS) {
    const data = await scrapeBusinessPage(page2, business);
    webScraper.data.push(data);
  }

  browser.close().catch(null);

  // Log Results!
  const successMsg = "Process completed successfully! The details are below:\n";
  const sourceMsg1 = `Source:${webScraper.source}`;
  const sourceMsg2 = `URL:${BASE_URL}`;
  logger.success(successMsg);
  logger.bold(sourceMsg1);
  logger.bold(sourceMsg2);
  logger.table({
    Query: query,
    Available_Results: TOTAL_RESULTS,
    Requested_Results: requestedQuantity,
    Returned_Results: webScraper.data.length,
  });

  return webScraper.data;
};

module.exports = searchWashington;
