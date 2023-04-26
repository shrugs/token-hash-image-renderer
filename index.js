const express = require("express");
const puppeteer = require("puppeteer")
const sharp = require('sharp');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).end();
});

const ARWEAVE_URI = /^https:\/\/arweave.net\/4Tz9sZQ3ilCbO5dCdmVkeE-SSSF4nXNPu7Gp9lmTqjM\/(\d).html\?.+$/

const VIEWPORT_FOR_TEMPLATE = {
  0: { width: 1000, height: 1200 }, // Fidenza
  1: { width: 1600, height: 900 }, // Himminn
  2: { width: 1024, height: 1024 }, // Qwerty
  3: { width: 1024, height: 1024 }, // Ringers
  4: { width: 1024, height: 1024 }, // LGG
  5: { width: 1024, height: 1024 }, // Squiggle
  6: { width: 1024, height: 1024 }, // Window
}

app.get(["/:uri"], async (req, res) => {
  const uri =  Buffer.from(req.params["uri"], 'base64').toString('ascii');

  const matches = uri.match(ARWEAVE_URI);
  if (!matches) return res.status(400).end();

  const template = parseInt(matches[1]);
  const viewport = VIEWPORT_FOR_TEMPLATE[template];
  if (!viewport) return res.status(400).end();

  // https://github.com/fly-apps/puppeteer-js-renderer/blob/master/index.js
  const browser = await puppeteer.launch({
    executablePath: process.env.NODE_ENV === 'production'
      ? '/usr/bin/google-chrome'
      : undefined,
    headless: "new",
    args: [
      '--disable-gpu',
      '--use-gl=egl',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ],
  });
  const page = await browser.newPage();

  await page.setViewport(viewport);

  await page.goto(uri, { waitUntil: 'networkidle0' });
  const element = await page.$("body");
  let image = await element.screenshot({ type: 'png', omitBackground: true });

  await browser.close();

  switch (template) {
    case 5: {
      image = await sharp(image)
        .extract({ left: 100, top: 200, width: 1024 - 200, height: 1024 - 400 - 100 })
        .extend({top: 100, left: 100, right: 100, bottom: 100, background: '#FFF'})
        .resize({ width: 1024, height: 1024, fit: sharp.fit.cover })
        .png().toBuffer()
    }
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader("Content-Disposition", `inline; filename="wrapped-tokenhash.png"`);
  res.setHeader("Cache-Control", `public, s-maxage=${6 * 30 * 24 * 60 * 60}`);

  res.status(200).send(image)
});

app.listen(port, () => console.log(`listening on port ${port}!`));
