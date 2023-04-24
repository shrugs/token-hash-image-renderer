const express = require("express");
const { chromium } = require("playwright")
const app = express();
const port = process.env.PORT || 3000;

app.get("/healthcheck", (req, res) => {
  res.status(200).end()
})

app.get(["/:uri"], async (req, res) => {
  const uri =  Buffer.from(req.params["uri"], 'base64').toString('ascii');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1000, height: 1200 });

  await page.goto(uri);
  const element = await page.$("body");

  // Capture screenshot
  const image = await element.screenshot({ type: 'png', omitBackground: true });

  // Close the browser instance
  await browser.close();

  res.setHeader("Content-Disposition", `inline; filename="wrapped-tokenhash.png"`);
  res.setHeader("Cache-Control", `public, s-maxage=${6 * 30 * 24 * 60 * 60}`);

  res.status(200).send(image)
});

app.listen(port, () => console.log(`HelloNode app listening on port ${port}!`));
