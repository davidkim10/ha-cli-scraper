const yargs = require("yargs");
const moment = require("moment");
const ObjectsToCsv = require("objects-to-csv");
const Logger = require("./logger");
const logger = new Logger();
const searchWashington = require("./websites/washington-license-board");

const createCsv = (dataObject, query) => {
  const date = moment().subtract(10, "days").calendar();
  const formatDate = date.replace(/\//g, "-");
  const fileName = `${query}-${formatDate}_${moment().unix()}`;
  const csv = new ObjectsToCsv(dataObject);
  csv.toDisk(`./csv/${fileName}.csv`);
  logger.success("CSV file has been created successfully.");
};

const { query, quantity = 10 } = yargs.argv;

if (!query) {
  const err = "Please enter a search query flag (--query).";
  const tip = "\nEx: node scrape --query=plumbing --quantity=10";
  logger.error(err + tip);
  return;
}

searchWashington(query, quantity).then((data) => {
  createCsv(data, query);
});
