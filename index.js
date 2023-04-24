const express = require("express");
const puppeteer = require("puppeteer")
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).end();
});

app.get(["/:uri"], async (req, res) => {
  const uri =  Buffer.from(req.params["uri"], 'base64').toString('ascii');

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

  await page.setViewport({ width: 1000, height: 1200 });

  await page.goto(uri, { waitUntil: 'networkidle0' });
  const element = await page.$("body");
  const image = await element.screenshot({ type: 'png', omitBackground: true });

  await browser.close();

  res.setHeader('Content-Type', 'image/png');
  res.setHeader("Content-Disposition", `inline; filename="wrapped-tokenhash.png"`);
  res.setHeader("Cache-Control", `public, s-maxage=${6 * 30 * 24 * 60 * 60}`);

  res.status(200).send(image)
});

app.listen(port, () => console.log(`listening on port ${port}!`));
