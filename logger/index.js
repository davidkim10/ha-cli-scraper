const clc = require("cli-color");
const error = clc.red;
const info = clc.cyanBright;
const notice = clc.yellowBright;
const success = clc.green;
const moment = require("moment");

class Logger {
  constructor() {
    this.logs = [];
  }

  addLogHistory(message, type = "log") {
    const date = moment().valueOf();
    const seen = moment().fromNow("ss");
    const log = { date, seen, type, log: message };
    this.logs.push(log);
  }

  history() {
    console.table(this.logs);
  }

  log(message, historyMsg, type) {
    const log = message + `\n`;
    const historyLog = historyMsg ?? message;
    this.addLogHistory(historyLog, type);
    process.stdout.write(log);
  }

  bold(message) {
    const log = clc.bold(message);
    this.log(log, message, "bold");
  }

  error(message) {
    const log = error("[ERROR]") + ` ${message}`;
    this.log(log, message, "error");
  }

  scrape(message) {
    const log = notice("[SCRAPE]") + ` ${message}`;
    this.log(log, message, "scrape");
  }

  start() {
    const message = "• RUNNING SCRAPER •";
    const intro = `....\n ${message} \n....\n`;
    const style = { ".": notice("-----") };
    this.log(clc.art(intro, style), message, "start");
  }

  success(message) {
    const log = success("[SUCCESS]") + ` ${message}`;
    this.log(log, message, "success");
  }

  table(obj) {
    const tableHead = Object.keys(obj).map((th) => info(th));
    const tableBody = Object.values(obj);
    const table = clc.columns([tableHead, tableBody]);
    this.addLogHistory(obj, "table");
    process.stdout.write(`\n ${table} \n`);
  }
}

module.exports = Logger;
