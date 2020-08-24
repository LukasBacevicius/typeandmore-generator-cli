require("dotenv").config();
const { Command, flags } = require("@oclif/command");
const puppeteer = require("puppeteer");
const fs = require("fs");

class GeneratePosterCommand extends Command {
  async generate(query, order) {
    const browser = await puppeteer.launch({
      defaultViewport: null,
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 12000,
      height: 12000,
    });

    await page.goto(`${process.env.APP_BASE}?${query}`, {
      waitUntil: "networkidle2",
    });

    await page.addStyleTag({
      content: "#preview{ box-shadow: none;} #ImageCol {padding: 0;}",
    });

    await page.addScriptTag({ path: require.resolve("dom-to-image") });

    await page.evaluate(() => {
      const element = document.getElementById("preview");
      const { width, height } = element.getBoundingClientRect();

      element.width = width * 20;
      element.height = height * 20;
    });

    const SVG = await page.evaluate(() =>
      domtoimage
        .toSvg(document.getElementById("preview"))
        .then((dataURL) => dataURL)
    );

    await page.goto(SVG);

    async function screenshotDOMElement(selector, padding = 0) {
      const rect = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        const { x, y, width, height } = element.getBoundingClientRect();
        return { left: x, top: y, width, height, id: element.id };
      }, selector);

      if (!fs.existsSync(order)) {
        fs.mkdirSync(order);
      }

      return await page.screenshot({
        path: `${order}/poster_${order}.png`,
        clip: {
          x: rect.left - padding,
          y: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        },
      });
    }

    await screenshotDOMElement("svg", 0);

    await browser.close();
  }

  async run() {
    const {
      flags: { query, order },
    } = this.parse(GeneratePosterCommand);

    if (!query || !order) this.error("Arguments missing");

    await this.generate(query, order);

    this.log(`Generated poster saved at ${order}/poster_${order}.png`);
  }
}

GeneratePosterCommand.description = `Describe the command here
...
Extra documentation goes here
`;

GeneratePosterCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({ char: "v" }),
  // add --help flag to show CLI version
  help: flags.help({ char: "h" }),
  query: flags.string({ char: "q", description: "poster selection query" }),
  order: flags.string({ char: "o", description: "order number" }),
};

module.exports = GeneratePosterCommand;
