const db = require("./db");
const puppeteer = require("puppeteer");
const { Webhook } = require("minimal-discord-webhook-node");
require("dotenv").config();
const hook = new Webhook(process.env.WEBHOOK_URL);

hook.setUsername(process.env.WEBHOOK_USERNAME);

function seed() {
  db.run(
    `INSERT INTO price (price, link) VALUES ('10000', '${process.env.PRODUCT_URL}')`,
    function (error) {
      if (error) {
        console.error(error.message);
      }
      console.log(`Inserted a row with the ID: ${this.lastID}`);
    }
  );
}

function updatePrice(price) {
  db.run(
    `UPDATE price SET price = ? WHERE link = ?`,
    [price, process.env.PRODUCT_URL],
    function (error) {
      if (error) {
        console.error(error.message);
      }
      console.log(`Row has been updated`);
    }
  );
}

function run() {
  db.each(
    `SELECT * FROM price ORDER BY id DESC LIMIT 1`,
    async (error, row) => {
      if (error) {
        throw new Error(error.message);
      }

      const browser = await puppeteer.launch({
        executablePath: "/usr/bin/chromium-browser",
      });
      const page = await browser.newPage();

      await page.goto(process.env.PRODUCT_URL);

      const textSelector = await page.waitForSelector(
        "#main-container > section:nth-child(4) > div > div.row.product-main-area.mrg-btm-xs > div.col-sm-5.col-md-8.col-lg-8 > div > div.row.highlights-container > div:nth-child(2) > form > div > div.highlight-content > div.product-page-pricing.product-highlight > div > div > div.pricing-block.has-installments"
      );
      let fullPrice = await textSelector?.evaluate((el) =>
        el.textContent.split("Lei")[0].trim()
      );

      fullPrice = fullPrice.replace(".", "");
      fullPrice = fullPrice.replace(",", ".");

      console.log(parseFloat(fullPrice), parseFloat(row.price));

      if (parseFloat(fullPrice) > parseFloat(row.price)) {
        updatePrice(parseFloat(fullPrice));
        hook.send(`Price just went higher (${fullPrice} Lei): ${row.link}`);
      } else if (parseFloat(fullPrice) < parseFloat(row.price)) {
        updatePrice(parseFloat(fullPrice));
        hook.send(`Price just dropped (${fullPrice} Lei): ${row.link}`);
      }

      browser.close();
    },
    (err, numRows) => {
      if (numRows === 0) {
        seed();
        run();
      }
    }
  );
}

run();

setInterval(() => {
  run();
}, 1000 * 60 * process.env.INTERVAL_MINUTES);
