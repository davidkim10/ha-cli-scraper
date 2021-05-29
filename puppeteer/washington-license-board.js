const puppeteer = require('puppeteer');
const { clc, info, notice, success } = require('../clicolors');

// Puppeteer Browser Config
const config = require('./config');

// Terminal Intro Message
const introMessage = {
  text: '....\n' + '• RUNNING SCRAPER •\n' + '....\n',
  style: { '.': notice('-----') },
};

const searchWashington = async (query, requestedQuantity) => {
  process.stdout.write(clc.art(introMessage.text, introMessage.style));

  // •
  // Instantiate Puppeteer with Configs.
  const browser = await puppeteer.launch(config.options);
  const page = await browser.newPage();

  // Do not load css & images
  config.optimization(page);

  // •
  // STORE ALL DATA IN RESULTS {}
  const RESULTS = {
    data: [],
    source: 'Washington License Board',
  };

  const { data } = RESULTS;

  // •
  // Go to Washington Licensing Site
  const baseUrl = 'https://secure.lni.wa.gov/verify/Results.aspx';
  const searchQuery = {
    pageNumber: 0,
    SearchType: 2,
    SortColumn: 'Rank',
    SortOrder: 'desc',
    pageSize: 10,
    ContractorTypeFilter: [],
    SessionID: 'kniflv0uwlms0nbww40c4j0e',
    SAW: '',
    Name: `${query}`,
    searchCat: 'Name',
    searchText: `${query}`,
    firstSearch: 1,
  };

  const queryParams = encodeURIComponent(JSON.stringify(searchQuery));
  await page.goto(`${baseUrl}#${queryParams}`), { waitUntil: 'networkidle0' };

  // Wait for Total Results to load
  try {
    console.log(`Connecting to ${RESULTS.source}... \n`);
    await page.waitForSelector('#resultsArea');
    await newPage.waitForNavigation({ waitUntil: 'networkidle0' });
  } catch (e) {
    if (e instanceof puppeteer.errors.TimeoutError) {
      console.log('Timeout Error!', e);
    }
  }

  // •
  // Click checkbox to display active only
  await page.$eval('#chkLicStatus', (checkbox) => checkbox.click());

  // •
  // Change selector to show 100 results
  await page.$eval('#resultsLengthSelect', (el) => el.click());
  await page.select('select#resultsLengthSelect', '100');
  await page.waitFor(4000);

  try {
    await page.waitForSelector('#chkLicStatusNo', {
      visible: true,
    });
    await page.waitForSelector('#itemsTotal');
  } catch (e) {
    if (e instanceof puppeteer.errors.TimeoutError) {
      console.log('Timeout Error! Please try again.  \n', e);
    }
  }

  const totalResults = await page.$eval('#chkLicStatusNo', (el) =>
    el.innerText.replace(/["'()]/g, '')
  );

  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.waitFor(() => !!document.querySelectorAll('.resultItem').length > 0),
  ]);

  // •
  // Get ID's of each business profile.
  // Does not use regular path names for each profile.
  // Require IDs to view page.
  let businessIds = [];

  // --> Where are we in the results page? Set initial val.
  let resultsShowing = await page.$eval(
    '#itemsShowing',
    (currentResult) => currentResult.innerText.split('-')[1]
  );

  const scrapeBusinessListingIds = async () => {
    await page.waitForSelector('.resultItem');
    await page.waitForSelector('#itemsShowing');

    const resultId = await page.$$eval('.resultItem', (results) => {
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
      await page.$eval('.nextButton', (btn) => btn.click());

      // Update val for which result are showing
      // Indicates where we are in search results
      resultsShowing = await page.$eval(
        '#itemsShowing',
        (currentResult) => currentResult.innerText.split('-')[1]
      );
    }
  } else {
    await scrapeBusinessListingIds();
  }

  // •
  // Create new page for loop
  let newPage = await browser.newPage();

  // Do not load css & images
  config.optimization(newPage);

  // •
  // Loop through each ID (business profile) from the list above
  for (business of businessIds) {
    console.log(notice('[Scrape Business ID]'), business);
    // --> Open link in new page
    newPage.goto(`https://secure.lni.wa.gov/verify/Detail.aspx?${business}`, {
      waitUntil: 'networkidle2',
    });

    try {
      await newPage.waitForNavigation({ waitUntil: 'networkidle0' });
      await newPage.waitForSelector('#BusinesOwnersName');
    } catch (err) {
      console.log(err);
    }

    try {
      const companyData = await newPage.evaluate(() => {
        // Scrape data points on business page

        // Get business name
        let business = document.querySelector('#BusinessName').innerText.trim();

        // Get owner first name
        let firstName = document
          .querySelector('#BusinesOwnersFirstName')
          .innerText.trim();

        // Get owner last name
        let lastName = document
          .querySelector('#BusinesOwnersLastName')
          .innerText.trim();

        // Get owner phone number
        let phoneNumber = document
          .querySelector('#PhoneNumber')
          .innerText.trim();

        // Get contractor license info
        let licenseEffective = document
          .querySelector('#EffectiveDate')
          .innerText.trim();

        let licenseExpiration = document
          .querySelector('#ExpirationDate')
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

      data.push(companyData);
    } catch (err) {
      console.log(err);
    }
  }

  await browser.close();

  // Log Results!
  console.log(
    success('\n[SUCCESS]'),
    'The scrape has completed successfully. The details are below:\n'
  );
  console.log(clc.bold('Source:'), RESULTS.source);
  console.log(clc.bold('URL:'), baseUrl, '\n');

  process.stdout.write(
    clc.columns([
      [
        info('Query'),
        info('Available Results'),
        info('Requested Results'),
        info('Returned Results'),
      ],
      [query, totalResults, requestedQuantity, data.length],
    ])
  );
  return RESULTS.data;
};

module.exports = searchWashington;
