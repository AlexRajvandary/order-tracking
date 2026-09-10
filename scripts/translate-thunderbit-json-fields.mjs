import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const REQUIRED_FIELDS = ["商品名", "商品URL", "ブランド名", "価格 (JPY)", "商品画像"];

function createSku(sourceUrl) {
  const hash = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 16);
  return `THUNDERBIT-${hash.toUpperCase()}`;
}

function parsePrice(value, itemNumber) {
  const normalized = String(value).replace(/[\s,]/g, "");
  const price = Number(normalized);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`Item ${itemNumber} has an invalid price: ${value}`);
  }

  return price;
}

function usage() {
  console.error(
    "Usage: node scripts/translate-thunderbit-json-fields.mjs <input.json> [output.json]",
    "       [--category <name>] [--parent-category <name>] [--skip-incomplete]",
  );
}

const argumentsList = process.argv.slice(2);
const inputArgument = argumentsList.shift();
const outputArgument = argumentsList[0]?.startsWith("--") ? undefined : argumentsList.shift();

function readOption(name, fallback) {
  const index = argumentsList.indexOf(name);
  if (index < 0) return fallback;
  const value = argumentsList[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Option ${name} requires a value.`);
  }
  return value;
}

const categoryName = readOption("--category", "Женские сумки");
const parentCategoryName = readOption("--parent-category", "Сумки");
const skipIncomplete = argumentsList.includes("--skip-incomplete");

if (!inputArgument) {
  usage();
  process.exit(1);
}

const inputPath = path.resolve(inputArgument);
const inputFile = path.parse(inputPath);
const outputPath = outputArgument
  ? path.resolve(outputArgument)
  : path.join(inputFile.dir, `${inputFile.name}-english${inputFile.ext}`);

if (inputPath === outputPath) {
  throw new Error("Input and output paths must be different.");
}

const source = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const products = JSON.parse(source);

if (!Array.isArray(products)) {
  throw new Error("Expected the JSON root to be an array of products.");
}

const incompleteItems = [];
const completeProducts = products.flatMap((product, index) => {
  if (product === null || Array.isArray(product) || typeof product !== "object") {
    throw new Error(`Item ${index + 1} must be a JSON object.`);
  }

  const missingFields = REQUIRED_FIELDS.filter(
    (field) =>
      !Object.prototype.hasOwnProperty.call(product, field) ||
      String(product[field] ?? "").trim().length === 0,
  );
  if (missingFields.length > 0) {
    if (skipIncomplete) {
      incompleteItems.push({ item: index + 1, fields: missingFields });
      return [];
    }
    throw new Error(
      `Item ${index + 1} is missing fields: ${missingFields.join(", ")}`,
    );
  }

  return [{ product, itemNumber: index + 1 }];
});

const translatedProducts = completeProducts.map(({ product, itemNumber }) => {
  const sourceUrl = product["商品URL"];

  if (typeof sourceUrl !== "string" || sourceUrl.trim().length === 0) {
    throw new Error(`Item ${itemNumber} has an empty source URL.`);
  }

  return {
    name: product["商品名"],
    price: parsePrice(product["価格 (JPY)"], itemNumber),
    currencyCode: "JPY",
    imageUrl: product["商品画像"],
    sourceUrl,
    sku: createSku(sourceUrl),
    brand: product["ブランド名"],
    categoryName,
    parentCategoryName,
    condition: "new",
    isActive: true,
  };
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(translatedProducts, null, 2)}\n`, "utf8");

console.log(`Translated ${translatedProducts.length} products.`);
if (incompleteItems.length > 0) {
  console.log(`Skipped ${incompleteItems.length} incomplete products.`);
}
console.log(`Output: ${outputPath}`);
