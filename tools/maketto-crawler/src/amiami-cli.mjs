import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const BASE_URL = "https://www.amiami.com";
const HOME_URL = `${BASE_URL}/eng`;
const DEFAULT_OUTPUT = "../../imports/amiami-products.json";
const EXCLUDED_SLUGS = new Set(["category_list", "new", "sale", "bishounen", "mature"]);

function parseArguments(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    delayMs: 700,
    timeoutMs: 90_000,
    headed: true,
    discoverOnly: false,
    maxCategories: Number.POSITIVE_INFINITY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--headless") options.headed = false;
    else if (argument === "--discover-only") options.discoverOnly = true;
    else if (argument === "--output" && value) {
      options.output = value;
      index += 1;
    } else if (argument === "--delay-ms" && value) {
      options.delayMs = parseInteger(value, argument, 0);
      index += 1;
    } else if (argument === "--timeout-ms" && value) {
      options.timeoutMs = parseInteger(value, argument, 1);
      index += 1;
    } else if (argument === "--max-categories" && value) {
      options.maxCategories = parseInteger(value, argument, 1);
      index += 1;
    } else {
      throw new Error(`Неизвестный аргумент: ${argument}`);
    }
  }
  return options;
}

function parseInteger(value, option, minimum) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) {
    throw new Error(`${option} должен быть целым числом не меньше ${minimum}.`);
  }
  return number;
}

function printHelp() {
  console.log(`Playwright-сборщик основных товаров AmiAmi.

Использование:
  npm run scrape:amiami -- [параметры]

Параметры:
  --output <путь>          JSON-файл результата (по умолчанию: ${DEFAULT_OUTPUT})
  --discover-only         Только вывести найденные категории
  --max-categories <n>    Обработать первые n категорий
  --delay-ms <n>          Пауза между категориями (по умолчанию: 700)
  --timeout-ms <n>        Таймаут страницы (по умолчанию: 90000)
  --headless              Не показывать Chromium (по умолчанию браузер видимый)
  --help, -h              Показать справку
`);
}

async function discoverCategories(page, timeoutMs) {
  await page.goto(HOME_URL, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await page.locator('a[href*="/eng/c/"]').first().waitFor({ state: "attached", timeout: timeoutMs });

  return page.locator('a[href*="/eng/c/"]').evaluateAll((anchors, excluded) => {
    const seen = new Set();
    const categories = [];
    for (const anchor of anchors) {
      const url = new URL(anchor.href, location.origin);
      const match = url.pathname.match(/^\/eng\/c\/([^/]+)\/?$/);
      if (!match) continue;
      const slug = decodeURIComponent(match[1]);
      const name = (anchor.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!name || excluded.includes(slug) || seen.has(slug)) continue;
      seen.add(slug);
      categories.push({ name, slug, url: `${location.origin}/eng/c/${encodeURIComponent(slug)}/` });
    }
    return categories;
  }, [...EXCLUDED_SLUGS]);
}

async function extractCategoryProducts(page, category) {
  await page.locator(".newly-added-items").waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  return page.locator(".newly-added-items__item").evaluateAll((cards, currentCategory) =>
    cards.map((card) => {
      const link = card.querySelector("a[href]");
      const image = card.querySelector("img");
      const sourceUrl = link ? new URL(link.getAttribute("href"), location.origin).href : "";
      const url = new URL(sourceUrl || location.href);
      const sku = url.searchParams.get("gcode") || url.searchParams.get("scode") || "";
      const priceText = card.querySelector(".newly-added-items__item__price")?.textContent ?? "";
      const priceMatch = priceText.match(/[\d,]+(?:\.\d+)?/);
      return {
        name: (card.querySelector(".newly-added-items__item__name")?.textContent ?? link?.getAttribute("alt") ?? "").replace(/\s+/g, " ").trim(),
        price: priceMatch ? Number(priceMatch[0].replaceAll(",", "")) : 0,
        currencyCode: "JPY",
        imageUrl: (image?.getAttribute("data-src") || image?.getAttribute("src") || "").trim(),
        sourceUrl,
        sku,
        brand: (card.querySelector(".newly-added-items__item__brand")?.textContent ?? "").replace(/\s+/g, " ").trim(),
        categoryName: currentCategory.name,
        parentCategoryName: "AmiAmi",
        condition: "new",
        isActive: true,
      };
    }), category);
}

async function saveProducts(output, products) {
  const outputPath = path.resolve(process.cwd(), output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  return outputPath;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) return printHelp();

  const browser = await chromium.launch({ headless: !options.headed });
  const productsBySku = new Map();
  try {
    const context = await browser.newContext({
      locale: "en-US",
      viewport: { width: 1440, height: 1000 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    console.log(`Открываю ${HOME_URL} и обнаруживаю категории…`);
    const discovered = await discoverCategories(page, options.timeoutMs);
    const queue = discovered.slice(0, options.maxCategories);
    console.log(`Обнаружено категорий: ${discovered.length}`);
    queue.forEach((category, index) => console.log(`${index + 1}. ${category.name} — ${category.url}`));
    if (options.discoverOnly) return;

    console.log(`\nВ очередь поставлено категорий: ${queue.length}`);
    for (let index = 0; index < queue.length; index += 1) {
      const category = queue[index];
      console.log(`[${index + 1}/${queue.length}] ${category.name}`);
      try {
        await page.goto(category.url, { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
        const products = await extractCategoryProducts(page, category);
        let added = 0;
        for (const product of products) {
          if (!product.name || !product.sku || !product.sourceUrl || !product.imageUrl || product.price <= 0) continue;
          if (!productsBySku.has(product.sku)) added += 1;
          productsBySku.set(product.sku, product);
        }
        console.log(`  найдено ${products.length}, новых ${added}, уникальных всего ${productsBySku.size}`);
      } catch (error) {
        console.warn(`  категория пропущена: ${error instanceof Error ? error.message : error}`);
      }
      await saveProducts(options.output, [...productsBySku.values()]);
      if (options.delayMs > 0 && index + 1 < queue.length) await page.waitForTimeout(options.delayMs);
    }

    const outputPath = await saveProducts(options.output, [...productsBySku.values()]);
    console.log(`\nГотово: ${outputPath}`);
    console.log(`Сохранено уникальных товаров: ${productsBySku.size}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
