const puppeteer = require("puppeteer");
const Logger = require("../logger");
const WebScraper = require("./WebScraper");

// Puppeteer Browser Config
const logger = new Logger();
const config = require("./config");
const PageOptimizer = require("./PageOptimizer");

const searchWashington = async (query, requestedQuantity) => {
  logger.start();
  const BASE_URL = "https://secure.lni.wa.gov/verify/Results.aspx";
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
  const targetURL = `${BASE_URL}#${SEARCH_QUERY}`;
  const webScraper = new WebScraper("Washington License Board");
  const browser = await webScraper.start();
  const page = await webScraper.newPage(targetURL, "homepage");

  // Wait for Total Results to load
  try {
    await page.waitForSelector("#resultsArea");
  } catch (e) {
    if (e instanceof puppeteer.errors.TimeoutError) {
      logger.error("Timeout Error!: ${e.message}");
    }
  }

  // Click checkbox to display active only
  // Change selector to show 100 results
  await page.$eval("#chkLicStatus", (checkbox) => checkbox.click());
  await page.$eval("#resultsLengthSelect", (el) => el.click());
  await page.select("select#resultsLengthSelect", "100");
  await page.waitFor(4000);
  try {
    await page.waitForSelector("#chkLicStatusNo");
    await page.waitForSelector("#itemsTotal");
  } catch (e) {
    if (e instanceof puppeteer.errors.TimeoutError) {
      logger.error("Timeout Error!: ${e.message}");
    }
  }

  const totalResults = await page.$eval("#chkLicStatusNo", (el) => {
    el.innerText.replace(/["'()]/g, "");
  });

  await Promise.race([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.waitFor(() => !!document.querySelectorAll(".resultItem").length > 0),
  ]);

  // •
  // Get ID's of each business profile.
  // Does not use regular path names for each profile.
  // Require IDs to view page.
  let businessIds = [];

  // --> Where are we in the results page? Set initial val.
  let resultsShowing = await page.$eval(
    "#itemsShowing",
    (currentResult) => currentResult.innerText.split("-")[1]
  );

  const scrapeBusinessListingIds = async () => {
    await page.waitForSelector(".resultItem");
    await page.waitForSelector("#itemsShowing");

    const resultId = await page.$$eval(".resultItem", (results) => {
      return results.map((result) => result.id);
    });

    // Filter IDs to only get business listings starting with UBI
    const filteredIds = resultId
      .slice(0, requestedQuantity)
      .filter((id) => /^ubi/gim.test(id));

    // Update list of page ids
    businessIds = [...businessIds, ...filteredIds].filter(Boolean);
  };

  // •
  // Scrape directory and get all business ids
  if (requestedQuantity > 100) {
    while (resultsShowing != totalResults) {
      console.log(`[EVALUATING]: ${resultsShowing} | ${totalResults}`);
      await scrapeBusinessListingIds();

      // Go to next page
      await page.$eval(".nextButton", (btn) => btn.click());

      // Update val for which result are showing
      // Indicates where we are in search results
      resultsShowing = await page.$eval(
        "#itemsShowing",
        (currentResult) => currentResult.innerText.split("-")[1]
      );
    }
  } else {
    await scrapeBusinessListingIds();
  }

  // •
  // Loop through each ID (business profile) from the list above
  const page2 = await browser.newPage();
  for (business of businessIds) {
    const targetURL = `https://secure.lni.wa.gov/verify/Detail.aspx?${business}`;
    await page2.goto(targetURL, { waitUntil: "domcontentloaded" });
    await PageOptimizer.waitTillHTMLRendered(page2);
    logger.scrape(`Business ID: ${business}`);

    try {
      const companyData = await page2.evaluate(() => {
        // Scrape data points on business page

        // Get business name
        let business = document.querySelector("#BusinessName").innerText.trim();

        // Get owner first name
        let firstName = document
          .querySelector("#BusinesOwnersFirstName")
          .innerText.trim();

        // Get owner last name
        let lastName = document
          .querySelector("#BusinesOwnersLastName")
          .innerText.trim();

        // Get owner phone number
        let phoneNumber = document
          .querySelector("#PhoneNumber")
          .innerText.trim();

        // Get contractor license info
        let licenseEffective = document
          .querySelector("#EffectiveDate")
          .innerText.trim();

        let licenseExpiration = document
          .querySelector("#ExpirationDate")
          .innerText.trim();

        return {
          business,
          owner: `${firstName} ${lastName}`,
          phoneNumber,
          license: {
            effective: licenseEffective,
            expiration: licenseExpiration,
          },
        };
      });
      console.log(companyData);
      webScraper.data.push(companyData);
    } catch (err) {
      logger.error(err);
    }
  }

  await browser.close();

  // Log Results!
  logger.success(
    "The scrape has completed successfully. The details are below:\n"
  );
  logger.bold(`Source:${webScraper.source}`);
  logger.bold(`URL:${BASE_URL}`);
  logger.table({
    Query: query,
    Available_Results: totalResults,
    Requested_Results: requestedQuantity,
    Returned_Results: webScraper.data.length,
  });

  return webScraper.data;
};

module.exports = searchWashington;
