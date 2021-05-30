const yargs = require('yargs');
const ObjectsToCsv = require('objects-to-csv');
const moment = require('moment');
const uuid = require('short-uuid');
const { error, success } = require('./clicolors');

const createCsv = (dataObject, query) => {
  const date = moment().subtract(10, 'days').calendar();
  const formatDate = date.replace(/\//g, '-');
  const fileName = `${query}-${formatDate}_${uuid.generate()}`;
  const csv = new ObjectsToCsv(dataObject);
  csv.toDisk(`./csv/${fileName}.csv`);

  console.log(
    success('\n[SUCCESS]'),
    'CSV file has been created successfully.',
    '\n'
  );
};

const { query, quantity = 10 } = yargs.argv;
const searchWashington = require('./puppeteer/washington-license-board');

if (!query) {
  console.log(
    error('[ERROR]'),
    'Please enter a search query.\nEx: node scrape --query=plumbing --quantity=10'
  );
  return;
}

searchWashington(query, quantity).then((data) => {
  createCsv(data, query);
});
