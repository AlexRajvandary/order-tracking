import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const DEFAULT_BASE_URL = "https://komodostation.com";
const DEFAULT_OUTPUT = "../../imports/komodo-products.json";
const PAGE_SIZE = 100;

function parseArguments(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    output: DEFAULT_OUTPUT,
    headed: false,
    delayMs: 500,
    maxPages: 100,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];

    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--headed") options.headed = true;
    else if (argument === "--output" && value) {
      options.output = value;
      index += 1;
    } else if (argument === "--base-url" && value) {
      options.baseUrl = value.replace(/\/$/, "");
      index += 1;
    } else if (argument === "--delay-ms" && value) {
      options.delayMs = positiveInteger(value, "--delay-ms", true);
      index += 1;
    } else if (argument === "--max-pages" && value) {
      options.maxPages = positiveInteger(value, "--max-pages");
      index += 1;
    } else {
      throw new Error(`Неизвестный аргумент: ${argument}`);
    }
  }

  return options;
}

function positiveInteger(value, option, allowZero = false) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < (allowZero ? 0 : 1)) {
    throw new Error(`${option} должен быть ${allowZero ? "неотрицательным" : "положительным"} целым числом.`);
  }
  return number;
}

function printHelp() {
  console.log(`Сбор основных товаров KOMODO STATION в JSON для импорта.

Использование:
  npm run scrape:komodo -- [параметры]

Параметры:
  --output <путь>      Файл результата (по умолчанию: ${DEFAULT_OUTPUT})
  --headed             Показать Chromium; используйте, если Cloudflare просит проверку
  --delay-ms <число>   Задержка между страницами API (по умолчанию: 500)
  --max-pages <число>  Защитный лимит страниц (по умолчанию: 100)
  --base-url <url>     Базовый URL магазина
  --help, -h           Показать справку
`);
}

async function waitForStore(page, baseUrl) {
  await page.goto(`${baseUrl}/?lang=en`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(async () => {
      try {
        const response = await fetch("/wp-json/wc/store/v1/products?per_page=1", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const contentType = response.headers.get("content-type") ?? "";
        return {
          ready: response.ok && contentType.includes("application/json"),
          status: response.status,
          contentType,
        };
      } catch {
        return { ready: false, status: 0, contentType: "" };
      }
    });

    if (state.ready) return;
    await page.waitForTimeout(2_000);
  }

  throw new Error(
    "WooCommerce Store API не стал доступен. Запустите скрипт с --headed и пройдите проверку Cloudflare в открывшемся окне.",
  );
}

async function fetchStoreApi(page, endpoint) {
  return page.evaluate(async (apiEndpoint) => {
    const response = await fetch(apiEndpoint, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("application/json")) {
      const body = await response.text();
      throw new Error(
        `Store API вернул HTTP ${response.status} (${contentType}): ${body.slice(0, 160)}`,
      );
    }
    return {
      data: await response.json(),
      totalPages: Number(response.headers.get("X-WP-TotalPages") ?? "0"),
    };
  }, endpoint);
}

async function fetchAllPages(page, endpoint, maxPages, delayMs) {
  const result = [];
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const response = await fetchStoreApi(
      page,
      `${endpoint}${separator}per_page=${PAGE_SIZE}&page=${pageNumber}`,
    );
    const items = Array.isArray(response.data) ? response.data : [];
    result.push(...items);
    console.log(`Страница ${pageNumber}: получено ${items.length}, всего ${result.length}.`);

    if (items.length < PAGE_SIZE || (response.totalPages > 0 && pageNumber >= response.totalPages)) {
      break;
    }
    if (delayMs > 0) await page.waitForTimeout(delayMs);
  }
  return result;
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(product) {
  const prices = product?.prices ?? {};
  const rawPrice = prices.price ?? prices.regular_price ?? "0";
  const minorUnit = Number.isInteger(prices.currency_minor_unit)
    ? prices.currency_minor_unit
    : 0;
  const numericPrice = Number(rawPrice);
  return Number.isFinite(numericPrice) ? numericPrice / 10 ** minorUnit : 0;
}

function findBrand(product) {
  const directBrand = product?.brands?.[0]?.name;
  if (directBrand) return decodeHtml(directBrand);

  const brandAttribute = product?.attributes?.find((attribute) =>
    /^(brand|manufacturer)$/i.test(attribute?.name ?? ""),
  );
  return decodeHtml(brandAttribute?.terms?.[0]?.name ?? brandAttribute?.options?.[0] ?? "");
}

function resolveCategories(product, categoriesById) {
  const assigned = (product?.categories ?? [])
    .map((category) => categoriesById.get(category.id) ?? category)
    .filter(Boolean);
  if (assigned.length === 0) return { categoryName: "", parentCategoryName: "" };

  const assignedIds = new Set(assigned.map((category) => category.id));
  const leaf = assigned.find((category) => !assigned.some((other) => other.parent === category.id))
    ?? assigned.at(-1);
  const parent = leaf?.parent
    ? categoriesById.get(leaf.parent)
    : assigned.find((category) => category.id !== leaf?.id && !assignedIds.has(category.parent));

  return {
    categoryName: decodeHtml(leaf?.name),
    parentCategoryName: decodeHtml(parent?.name),
  };
}

function mapProduct(product, categoriesById) {
  const categories = resolveCategories(product, categoriesById);
  const sourceUrl = String(product?.permalink ?? "").trim();
  const imageUrl = String(product?.images?.[0]?.src ?? "").trim();
  const currencyCode = String(product?.prices?.currency_code ?? "").trim().toUpperCase();

  return {
    name: decodeHtml(product?.name),
    price: parsePrice(product),
    currencyCode,
    imageUrl,
    sourceUrl,
    sku: String(product?.sku ?? "").trim() || `KOMODO-${product.id}`,
    brand: findBrand(product),
    categoryName: categories.categoryName,
    parentCategoryName: categories.parentCategoryName,
    condition: "new",
    isActive: true,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const browser = await chromium.launch({ headless: !options.headed });
  try {
    const context = await browser.newContext({
      locale: "en-US",
      viewport: { width: 1440, height: 1000 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    console.log(`Открываю ${options.baseUrl}…`);
    await waitForStore(page, options.baseUrl);

    console.log("Загружаю категории…");
    const categories = await fetchAllPages(
      page,
      "/wp-json/wc/store/v1/products/categories?hide_empty=false",
      options.maxPages,
      options.delayMs,
    );
    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    console.log("Загружаю товары…");
    const sourceProducts = await fetchAllPages(
      page,
      "/wp-json/wc/store/v1/products?catalog_visibility=visible",
      options.maxPages,
      options.delayMs,
    );
    const productsById = new Map(sourceProducts.map((product) => [product.id, product]));
    const products = [...productsById.values()]
      .map((product) => mapProduct(product, categoriesById))
      .filter((product) => product.name && product.sourceUrl && product.imageUrl && product.currencyCode);

    const outputPath = path.resolve(process.cwd(), options.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");

    console.log(`Готово: ${outputPath}`);
    console.log(`Сохранено товаров: ${products.length} из ${sourceProducts.length}.`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
