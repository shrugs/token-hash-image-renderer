const { ethers } = require("ethers");
const { Cluster } = require('puppeteer-cluster');
const _ = require('lodash')
const {existsSync} = require('fs')

const VIEWPORT_FOR_TEMPLATE = {
  0: { width: 1000, height: 1200 },  // Fidenza
  1: { width: 1024, height: 1024 },  // Cargo
  2: { width: 1024, height: 1024 },  // Qwerty
  3: { width: 1024, height: 1024 },  // Ringers
  4: { width: 1024, height: 1024 },  // LGG
  5: { width: 1024, height: 1024 },  // Squiggle
  6: { width: 1024, height: 1024 },  // Window
  7: { width: 1024, height: 1024 },  // fake it till you make it
  8: { width: 1024, height: 1024 },  // contractions
  9: { width: 1024, height: 1024 },  // intersections
  10: { width: 1024, height: 1024 }, // tide predictor
}

const CONCURRENCY = {
  0: 10,  // Fidenza
  1: 4,  // Cargo
  2: 10,  // Qwerty
  3: 10,  // Ringers
  4: 1,  // LGG
  5: 10,  // Squiggle
  6: 10,  // Window
  7: 10,  // fake it till you make it
  8: 10,  // contractions
  9: 10,  // intersections
  10: 10, // tide predictor
}

// https://arweave.net/SGxR0nspX2CdQsxYtMyval7VS15Flc6VHBq9dNdgIVE/0.html
const makeTemplateUri = (templateId, tokenId, hash) => `http://localhost:8000/${templateId}.html?${new URLSearchParams({
  payload: Buffer.from(JSON.stringify({ tokenId, hash })).toString('base64')
})}`

const pathForTokenAndTemplate = (tokenId, templateId) => `./output/${tokenId}-${templateId}.png`
const hashForTokenId = (tokenId) => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`RANDOM${tokenId}`))

async function main() {
  const templateId = parseInt(process.argv[2]);
  console.log(`rendering template ${templateId}`)
  const tokens = _.times(1000).map(tokenId => ({
    tokenId,
    hash: hashForTokenId(tokenId),
  }))

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: CONCURRENCY[templateId],
    puppeteerOptions: {
      headless: 'new',
      args: [
        '--use-gl=egl',
        '--use-cmd-decoder=passthrough',
        '--no-sandbox'
      ],
    }
  });

  cluster.on('taskerror', (err, data, willRetry) => {
    if (willRetry) {
      console.warn(`Encountered an error while crawling ${JSON.stringify(data, null)}. ${err.message}\nThis job will be retried`);
    } else {
      console.error(`Failed to crawl ${JSON.stringify(data, null)}: ${err.message}`);
    }
  });

  await cluster.task(async ({ page, data: { templateId, tokenId, hash } }) => {
    const uri = makeTemplateUri(templateId, tokenId, hash);
    console.log(`token ${tokenId}, template ${templateId} at ${uri}`);
    const viewport = VIEWPORT_FOR_TEMPLATE[templateId];

    await page.setViewport(viewport);
    await page.goto(uri, {
      waitUntil: templateId === 4 ? 'domcontentloaded' : undefined,
      timeout: templateId === 4 ? 10_000 : 5_000,
    });

    await page.screenshot({
      type: 'png',
      path: pathForTokenAndTemplate(tokenId, templateId),
    })
  });

  for (const {tokenId, hash} of tokens) {
    if (!existsSync(pathForTokenAndTemplate(tokenId, templateId))) {
      cluster.queue({ templateId, tokenId, hash });
    }
  }

  await cluster.idle();
  await cluster.close();
}

main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})
