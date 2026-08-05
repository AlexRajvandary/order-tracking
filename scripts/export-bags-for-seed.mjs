import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, "../src/catalog/src/lib/bags-collection.ts");
const text = fs.readFileSync(src, "utf8");

const marker = "export const BAGS_COLLECTION";
const markerIdx = text.indexOf(marker);
if (markerIdx < 0) throw new Error("BAGS_COLLECTION not found");
const eqIdx = text.indexOf("=", markerIdx);
const start = text.indexOf("[", eqIdx);
const asIdx = text.indexOf("] as CatalogProduct[]", start);
const end = asIdx >= 0 ? asIdx : text.lastIndexOf("];");
if (start < 0 || end < 0) throw new Error("array bounds not found");

const arrText = text.slice(start, end + 1);
const jsonish = arrText.replace(/,(\s*[}\]])/g, "$1");
const products = JSON.parse(jsonish);

const today = new Date().toISOString();
const out = products.map((p) => ({
  id: randomUUID(),
  name: p.name,
  slug: p.slug,
  description: [
    "Категория: сумки",
    p.description || p.shortDescription || null,
    p.discountPercent ? `Скидка: ${p.discountPercent}` : null,
    typeof p.rating === "number" ? `Рейтинг: ${p.rating}` : null,
  ]
    .filter(Boolean)
    .join("\n"),
  sku: p.id,
  brand: p.brand || null,
  price: p.priceRub,
  currencyCode: "RUB",
  originalPrice: p.oldPriceRub ?? null,
  originalCurrencyCode: p.oldPriceRub != null ? "RUB" : null,
  imageUrl: p.imageUrl,
  sourceUrl: "https://zenmarket.jp/",
  isActive: p.inStock !== false,
  createdAt: today,
}));

const jsonPath = path.join(__dirname, "bags-seed.json");
fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2), "utf8");
console.log(`Wrote ${out.length} products to ${jsonPath}`);
console.log("sample:", JSON.stringify(out[0], null, 2));
