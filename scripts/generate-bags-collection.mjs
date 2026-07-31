import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const transcriptPath =
  "C:/Users/stark/.cursor/projects/c-Users-stark-Documents-order-tracking/agent-transcripts/d3cba317-8e2a-4e7d-8b25-f552bf567698/d3cba317-8e2a-4e7d-8b25-f552bf567698.jsonl";

function findHtml(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  let best = "";
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const walk = (v) => {
        if (typeof v === "string") {
          if (
            v.includes("MP002XW1MAIA") &&
            v.includes("grid__catalog") &&
            v.length > best.length
          ) {
            best = v;
          }
        } else if (Array.isArray(v)) {
          v.forEach(walk);
        } else if (v && typeof v === "object") {
          Object.values(v).forEach(walk);
        }
      };
      walk(obj);
    } catch {
      /* skip */
    }
  }
  if (!best) throw new Error("HTML not found");
  return best;
}

function parsePrice(text) {
  if (!text) return null;
  const n = Number(String(text).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pickImage(block) {
  const candidates = [];
  const re = /(?:src|data-src)="(\/\/a\.lmcdn\.ru\/[^"]+)"/g;
  let m;
  while ((m = re.exec(block))) {
    const u = "https:" + m[1];
    if (u.includes("/adv/")) continue;
    candidates.push(u);
  }
  return (
    candidates.find((u) => /_1_v/.test(u) && /img389x562/.test(u)) ||
    candidates.find((u) => /_1_v/.test(u)) ||
    candidates.find((u) => /img389x562/.test(u)) ||
    candidates[0] ||
    null
  );
}

function mapCategorySlug(href, name) {
  const h = (href || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (h.includes("klatch") || n.includes("клатч")) return "клатчи";
  if (h.includes("poyasnaya") || n.includes("поясн")) return "кросс-боди";
  if (h.includes("sportivnaya") || n.includes("спортивн")) return "сумки-на-плечо";
  if (h.includes("ryukzak") || n.includes("рюкзак")) return "женские-рюкзаки";
  if (n.includes("кросс") || h.includes("xbody") || h.includes("crossbody"))
    return "кросс-боди";
  if (n.includes("на плечо") || h.includes("shoulder")) return "сумки-на-плечо";
  return "женские-сумки";
}

function tintFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const tints = [
    "#1f6f5b",
    "#c45c26",
    "#2a4a6b",
    "#6b3a4a",
    "#3d3a2f",
    "#4a5d4e",
    "#1a2332",
    "#0f3d4c",
  ];
  return tints[h % tints.length];
}

const html = findHtml(transcriptPath);
const parts = html.split(/id="([A-Z0-9]{8,})"/);
const products = [];

for (let i = 1; i < parts.length; i += 2) {
  const id = parts[i];
  const block = parts[i + 1] || "";
  if (!block.includes("x-product-card") && !block.includes("product-card-description"))
    continue;
  if (block.includes("banner-slot") && !block.includes("product-name")) continue;

  const href = (block.match(/href="(\/p\/[^"]+)"/) || [])[1] || "";
  const brand = ((block.match(/brand-name[^>]*>([^<]+)/) || [])[1] || "").trim();
  let name = ((block.match(/product-name[^>]*>([^<]+)/) || [])[1] || "").trim();
  if (!name) name = "Сумка";
  const fullName = brand ? `${brand} ${name}`.replace(/\s+/g, " ").trim() : name;

  const priceNew = parsePrice((block.match(/price-new[^>]*>([^<]+)/) || [])[1]);
  const priceSingle = parsePrice((block.match(/price-single[^>]*>([^<]+)/) || [])[1]);
  const priceOld = parsePrice((block.match(/price-old[^>]*>([^<]+)/) || [])[1]);
  const priceSecondOld = parsePrice(
    (block.match(/price-second-old[^>]*>([^<]+)/) || [])[1],
  );
  const price = priceNew || priceSingle;
  if (!price) continue;

  const discount =
    (block.match(/ui-product-custom-badge-title[^>]*>\s*(−?\d+%)/) || [])[1] || null;
  const isPremium = /ui-product-custom-badge-title[^>]*>\s*premium/i.test(block);
  const rating = Number(((block.match(/_rating_[^>]*>\s*([\d.]+)/) || [])[1]) || NaN);
  const reviewsCount = Number(
    ((block.match(/_reviewsCount_[^>]*>\s*\((\d+)\)/) || [])[1]) || NaN,
  );
  const tags = [...block.matchAll(/_tag_d2m9d_2">([^<]+)/g)]
    .map((x) => x[1].trim())
    .filter(Boolean);
  const imageUrl = pickImage(block);
  const pathSlug = (
    (href.match(/\/p\/[^/]+\/([^/?#]+)/) || [])[1] || `bags-${id.toLowerCase()}`
  ).toLowerCase();
  const categorySlug = mapCategorySlug(href, name);

  const descBits = [];
  if (brand) descBits.push(brand);
  if (isPremium) descBits.push("premium");
  if (discount) descBits.push(`скидка ${discount}`);
  if (Number.isFinite(rating)) {
    descBits.push(
      `рейтинг ${rating}${Number.isFinite(reviewsCount) ? ` (${reviewsCount})` : ""}`,
    );
  }

  products.push({
    id,
    slug: `${pathSlug}-${id.toLowerCase()}`,
    name: fullName,
    brand: brand || null,
    productName: name,
    category: "Сумки",
    categorySlug,
    sectionId: "bags",
    priceRub: price,
    oldPriceRub: priceOld,
    secondOldPriceRub: priceSecondOld,
    currency: "RUB",
    discountPercent: discount,
    isPremium,
    rating: Number.isFinite(rating) ? rating : null,
    reviewsCount: Number.isFinite(reviewsCount) ? reviewsCount : null,
    tags,
    imageUrl,
    hrefPath: href.split("?")[0],
    tint: tintFromId(id),
    inStock: true,
    shortDescription: descBits.join(" · ") || "Сумка",
    description: `${fullName}. Артикул ${id}.${isPremium ? " Premium." : ""}${discount ? ` Скидка ${discount}.` : ""}`,
  });
}

const outJson = path.join(root, "src/catalog/src/lib/bags-raw.json");
fs.writeFileSync(outJson, JSON.stringify(products, null, 2), "utf8");

const catalogItems = products.map((p) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  category: p.category,
  priceRub: p.priceRub,
  currency: "RUB",
  shortDescription: p.shortDescription,
  description: p.description,
  tags: [
    ...(p.isPremium ? ["premium"] : []),
    ...(p.discountPercent ? [p.discountPercent] : []),
    ...p.tags,
  ],
  tint: p.tint,
  inStock: true,
  imageUrl: p.imageUrl,
  brand: p.brand,
  oldPriceRub: p.oldPriceRub,
  discountPercent: p.discountPercent,
  rating: p.rating,
  reviewsCount: p.reviewsCount,
  isPremium: p.isPremium,
  sectionId: "bags",
  categorySlug: p.categorySlug,
}));

const ts = `/* Autogenerated from Lamoda catalog HTML — do not edit by hand */
import type { CatalogProduct } from "./catalog-products";

export const BAGS_COLLECTION: CatalogProduct[] = ${JSON.stringify(catalogItems, null, 2)} as CatalogProduct[];
`;

const outTs = path.join(root, "src/catalog/src/lib/bags-collection.ts");
fs.writeFileSync(outTs, ts, "utf8");

console.log("products", products.length);
console.log("slug uniq", new Set(products.map((p) => p.slug)).size);
console.log("sample0", products[0]?.name, products[0]?.imageUrl);
console.log("sample2", products[2]?.name, products[2]?.imageUrl);
