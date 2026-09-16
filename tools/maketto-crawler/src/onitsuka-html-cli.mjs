import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

function parseArguments(argv) {
  const options = {
    input: "",
    output: "../../imports/onitsuka-tiger-sneakers.json",
    category: "Sneakers",
    parentCategory: "Shoes",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--input" && value) options.input = value;
    else if (argument === "--output" && value) options.output = value;
    else if (argument === "--category" && value) options.category = value;
    else if (argument === "--parent-category" && value) options.parentCategory = value;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Неизвестный или неполный аргумент: ${argument}`);
    if (!["--help", "-h"].includes(argument)) index += 1;
  }
  return options;
}

function printHelp() {
  console.log(`Конвертер сохранённого HTML-каталога Onitsuka Tiger в JSON.

Использование:
  npm run parse:onitsuka -- --input <html-файл> [--output <json-файл>]

Параметры:
  --category <название>          Категория (по умолчанию Sneakers)
  --parent-category <название>   Родительская категория (по умолчанию Shoes)
`);
}

function normalizeUrl(value, baseUrl) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/^https:\/{3,}/i, "https://")
    .replace(/^http:\/{3,}/i, "http://");
  if (!cleaned) return "";
  if (cleaned.startsWith("//")) return `https:${cleaned}`;
  return new URL(cleaned, baseUrl).href;
}

function skuFromUrl(sourceUrl) {
  try {
    const fileName = new URL(sourceUrl).pathname.split("/").at(-1) ?? "";
    return decodeURIComponent(fileName.replace(/\.html$/i, "")).toUpperCase();
  } catch {
    return "";
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) return printHelp();
  if (!options.input) throw new Error("Укажите исходный HTML через --input.");

  const inputPath = path.resolve(process.cwd(), options.input);
  const outputPath = path.resolve(process.cwd(), options.output);
  const html = await readFile(inputPath, "utf8");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const rawProducts = await page.locator(".ds-sdk-product-list .ds-sdk-product-items").evaluateAll(
      (cards, metadata) => cards.map((card) => {
        const productLink = card.querySelector(".ds-sdk-product-item__product-name a[href]")
          ?? card.querySelector("a[href*='/product/']");
        const image = card.querySelector(".ds-sdk-product-item__image img");
        const price = card.querySelector(".ds-sdk-product-price [ge-data-converted-price]")
          ?? card.querySelector(".ds-sdk-product-price");
        return {
          name: (productLink?.getAttribute("alt") || productLink?.childNodes?.[0]?.textContent || "").trim(),
          priceText: price?.getAttribute("ge-data-converted-price") || price?.textContent || "",
          imageUrl: image?.getAttribute("src") || image?.getAttribute("data-src") || "",
          sourceUrl: productLink?.getAttribute("href") || "",
          brand: (card.querySelector(".ds-sdk-product-item__product-brand")?.textContent || metadata.brand).trim(),
          gender: (card.querySelector(".ds-sdk-product-item__product-gender")?.textContent || "").replace(/\s+/g, " ").trim().toUpperCase(),
          categoryName: metadata.category,
          parentCategoryName: metadata.parentCategory,
        };
      }),
      { brand: "Onitsuka Tiger", category: options.category, parentCategory: options.parentCategory },
    );

    const productsBySku = new Map();
    for (const item of rawProducts) {
      const sourceUrl = normalizeUrl(item.sourceUrl, "https://www.onitsukatiger.com");
      const imageUrl = normalizeUrl(item.imageUrl, "https://www.onitsukatiger.com");
      const sku = skuFromUrl(sourceUrl);
      const priceMatch = String(item.priceText).replace(/[\s,]/g, "").match(/\d+(?:\.\d+)?/);
      const price = priceMatch ? Number(priceMatch[0]) : 0;
      if (!item.name || !sourceUrl || !imageUrl || !sku || price <= 0) continue;
      productsBySku.set(sku, {
        name: item.name,
        price,
        currencyCode: "JPY",
        imageUrl,
        sourceUrl,
        sku,
        brand: item.brand || "Onitsuka Tiger",
        gender: item.gender || null,
        categoryName: item.categoryName,
        parentCategoryName: item.parentCategoryName,
        condition: "new",
        isActive: true,
      });
    }

    const products = [...productsBySku.values()];
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
    console.log(`Карточек в основном каталоге: ${rawProducts.length}`);
    console.log(`Сохранено уникальных товаров: ${products.length}`);
    console.log(`Файл: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
