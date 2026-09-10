import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const FIELD_MAP = new Map([
  ["商品名", "name"],
  ["商品URL", "sourceUrl"],
  ["ブランド名", "brand"],
  ["価格 (JPY)", "price"],
  ["商品画像", "imageUrl"],
  ["セール情報", "saleInfo"],
]);

const CATEGORY_NAME = "Женские сумки";
const PARENT_CATEGORY_NAME = "Сумки";

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
  );
}

const [, , inputArgument, outputArgument] = process.argv;

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

const translatedProducts = products.map((product, index) => {
  if (product === null || Array.isArray(product) || typeof product !== "object") {
    throw new Error(`Item ${index + 1} must be a JSON object.`);
  }

  const unknownFields = Object.keys(product).filter((field) => !FIELD_MAP.has(field));
  if (unknownFields.length > 0) {
    throw new Error(
      `Item ${index + 1} contains unknown fields: ${unknownFields.join(", ")}`,
    );
  }

  const missingFields = [...FIELD_MAP.keys()].filter(
    (field) => !Object.prototype.hasOwnProperty.call(product, field),
  );
  if (missingFields.length > 0) {
    throw new Error(
      `Item ${index + 1} is missing fields: ${missingFields.join(", ")}`,
    );
  }

  const itemNumber = index + 1;
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
    categoryName: CATEGORY_NAME,
    parentCategoryName: PARENT_CATEGORY_NAME,
    condition: "new",
    isActive: true,
  };
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(translatedProducts, null, 2)}\n`, "utf8");

console.log(`Translated ${translatedProducts.length} products.`);
console.log(`Output: ${outputPath}`);
