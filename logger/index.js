const clc = require("cli-color");
const error = clc.red;
const info = clc.cyanBright;
const notice = clc.yellowBright;
const success = clc.green;

class Logger {
  logs = [];

  history() {
    console.table(this.logs);
  }

  log(message) {
    const log = message + `\n`;
    const date = new Date();
    this.logs.push([date, message]);
    process.stdout.write(log);
  }

  bold(message) {
    const log = clc.bold(message);
    this.log(log);
  }

  error(message) {
    const log = error("[ERROR]") + ` ${message}`;
    this.log(log);
  }

  scrape(message) {
    const log = notice("[SCRAPE]") + ` ${message}`;
    this.log(log);
  }

  start() {
    const intro = "....\n" + "• RUNNING SCRAPER •\n" + "....\n";
    const style = { ".": notice("-----") };
    this.log(clc.art(intro, style));
  }

  success(message) {
    const log = success("[SUCCESS]") + ` ${message}`;
    this.log(log);
  }

  table(obj) {
    const tableHead = Object.keys(obj).map((th) => info(th));
    const tableBody = Object.values(obj);
    process.stdout.write(clc.columns([tableHead, tableBody]));
  }
}

module.exports = Logger;
