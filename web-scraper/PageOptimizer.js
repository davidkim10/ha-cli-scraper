const Logger = require("../logger");
const logger = new Logger();

class PageOptimizer {
  static async optimizePageLoad(page) {
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      switch (resourceType) {
        case "image":
        case "font":
        case "stylesheet":
          req.abort();
          break;
        default:
          req.continue();
      }
    });
  }

  static async waitTillHTMLRendered(page, timeout = 30000, verbose) {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;

    while (checkCounts++ <= maxChecks) {
      let html = await page.content();
      let currentHTMLSize = html.length;
      let bodyHTMLSize = await page.evaluate(
        () => document.body.innerHTML.length
      );

      if (verbose) {
        console.log(
          " <> prev_size_check: ",
          lastHTMLSize,
          " <> curr_html_size: ",
          currentHTMLSize,
          " <> body_html_size: ",
          bodyHTMLSize
        );
      }

      if (lastHTMLSize && currentHTMLSize == lastHTMLSize) {
        countStableSizeIterations++;
      } else {
        countStableSizeIterations = 0;
      }

      if (countStableSizeIterations >= minStableSizeIterations) {
        verbose && logger.success("Page has loaded successfully.");
        break;
      }

      lastHTMLSize = currentHTMLSize ?? 0;
      await page.waitFor(checkDurationMsecs);
    }
  }
}

module.exports = PageOptimizer;
