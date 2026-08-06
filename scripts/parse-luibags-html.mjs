/**
 * Stage 1: parse ZenPlus-style product HTML dump → denormalized JSON.
 *
 * Usage:
 *   node scripts/parse-luibags-html.mjs [inputHtml] [outputJson]
 *
 * Defaults:
 *   input:  C:/Users/stark/Documents/luibags.txt
 *   output: scripts/data/luibags.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputPath =
  process.argv[2] || "C:/Users/stark/Documents/luibags.txt";
const outputPath =
  process.argv[3] || path.join(__dirname, "data", "luibags.json");

const ZENPLUS_ORIGIN = "https://www.zenplus.jp";
const DEFAULT_BRAND = "Louis Vuitton";

function decodeHtmlEntities(s) {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function stripTags(s) {
  return decodeHtmlEntities(s.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(name) {
  let slug = name.trim().toLowerCase();
  slug = slug.replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-");
  slug = slug.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug || "shop";
}

/** "Mercari | Частный" → "Mercari" */
function cleanStoreName(raw) {
  if (!raw) return null;
  const s = decodeHtmlEntities(raw).trim();
  const cut = s.split("|")[0]?.trim();
  return cut || s;
}

function parseMoneyAttr(raw) {
  if (!raw) return null;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapCondition(raw) {
  if (!raw) return { condition: "used", conditionLabel: null };
  const label = decodeHtmlEntities(raw).trim();
  const lower = label.toLowerCase();
  if (lower.includes("новое") || lower.includes("new")) {
    return { condition: "new", conditionLabel: label };
  }
  return { condition: "used", conditionLabel: label };
}

function resolveSourceUrl(href) {
  const cleaned = decodeHtmlEntities(href).trim();
  if (!cleaned) return { sourceUrl: null, zenplusUrl: null };

  let zenplusUrl = cleaned;
  if (cleaned.startsWith("/")) {
    zenplusUrl = ZENPLUS_ORIGIN + cleaned;
  } else if (!/^https?:\/\//i.test(cleaned)) {
    zenplusUrl = `${ZENPLUS_ORIGIN}/${cleaned.replace(/^\//, "")}`;
  }

  try {
    const u = new URL(zenplusUrl);
    const nested = u.searchParams.get("u");
    if (nested && /^https?:\/\//i.test(nested)) {
      return { sourceUrl: nested, zenplusUrl };
    }
  } catch {
    // keep zenplusUrl
  }

  return { sourceUrl: zenplusUrl, zenplusUrl };
}

function extractExternalId(href, sourceUrl) {
  try {
    const u = new URL(
      href.startsWith("http") ? href : ZENPLUS_ORIGIN + href,
      ZENPLUS_ORIGIN,
    );
    for (const key of ["id", "itemCode", "pid"]) {
      const v = u.searchParams.get(key);
      if (v) return v;
    }
    const nested = u.searchParams.get("u");
    if (nested) {
      try {
        const nu = new URL(nested);
        for (const key of ["pid", "item", "asin", "id"]) {
          const v = nu.searchParams.get(key);
          if (v) return v;
        }
        const parts = nu.pathname.split("/").filter(Boolean);
        if (parts.length) return parts.at(-1);
      } catch {
        // ignore
      }
    }
    const pathId = u.pathname.match(/\/(t\d+)\b/i);
    if (pathId) return pathId[1];
  } catch {
    // ignore
  }
  if (sourceUrl) {
    return createHash("sha1").update(sourceUrl).digest("hex").slice(0, 16);
  }
  return null;
}

function preferLargerImage(url) {
  if (!url) return null;
  let u = decodeHtmlEntities(url).trim();
  if (u.startsWith("//")) u = "https:" + u;
  return u.replace(/-small(\.[a-z0-9]+)(\?|$)/i, "$1$2");
}

function parseCard(body, href) {
  const shopBadge = (body.match(/product-badge-shop">\s*([^<]+)/) || [])[1];
  const storeBadge = (body.match(/product-badge-store">\s*([^<]+)/) || [])[1];
  const condBadge = (
    body.match(/product-badge-condition-[^"]*">\s*([^<]+)/) || []
  )[1];

  const titleAttr = (body.match(
    /class="item-title[^"]*"[^>]*title="([^"]*)"/,
  ) || [])[1];
  const titleInner = (body.match(
    /class="item-title[^"]*"[^>]*>([\s\S]*?)<\/h3>/,
  ) || [])[1];
  const name = stripTags(titleAttr || titleInner || "").slice(0, 500);
  if (!name) return null;

  const img = preferLargerImage(
    (body.match(/<img[^>]*src="([^"]+)"/) || [])[1],
  );

  const priceRub = parseMoneyAttr(
    (body.match(/data-rub="([^"]+)"/) || [])[1],
  );
  const priceJpy = parseMoneyAttr(
    (body.match(/data-jpy="([^"]+)"/) || [])[1],
  );
  const priceUsd = parseMoneyAttr(
    (body.match(/data-usd="([^"]+)"/) || [])[1],
  );

  const categories = [];
  const catBlock = body.match(/ssv2-card-cats[\s\S]*?<\/div>/);
  if (catBlock) {
    for (const cm of catBlock[0].matchAll(/ssv2-cat-link[^>]*>([^<]+)/g)) {
      const c = stripTags(cm[1]);
      if (c && !categories.includes(c)) categories.push(c);
    }
  }

  const { condition, conditionLabel } = mapCondition(condBadge);
  const shopName = cleanStoreName(storeBadge) || decodeHtmlEntities(shopBadge || "").trim() || null;
  const sellerName = shopBadge
    ? decodeHtmlEntities(shopBadge).trim()
    : null;

  const { sourceUrl, zenplusUrl } = resolveSourceUrl(href);
  const externalId = extractExternalId(href, sourceUrl);

  return {
    brand: DEFAULT_BRAND,
    shopName,
    shopSlug: shopName ? slugify(shopName) : null,
    sellerName,
    condition,
    conditionLabel,
    categories,
    name,
    imageUrl: img,
    sourceUrl,
    zenplusUrl,
    price: priceRub,
    currencyCode: priceRub != null ? "RUB" : null,
    originalPrice: priceJpy,
    originalCurrencyCode: priceJpy != null ? "JPY" : null,
    priceUsd,
    externalId,
    sku: externalId ? `zenplus-${externalId}` : null,
  };
}

console.log("Reading", inputPath);
const html = fs.readFileSync(inputPath, "utf8");
console.log("HTML bytes:", html.length);

const re =
  /<a class="product-item product-link"[^>]*href="([^"]+)"[\s\S]*?<\/a>\s*<\/div>/g;

const products = [];
const seen = new Set();
let skipped = 0;
let m;

while ((m = re.exec(html))) {
  const href = m[1];
  const item = parseCard(m[0], href);
  if (!item) {
    skipped += 1;
    continue;
  }
  const dedupeKey =
    item.sku ||
    item.sourceUrl ||
    createHash("sha1").update(item.name + "|" + (item.imageUrl || "")).digest("hex");
  if (seen.has(dedupeKey)) {
    skipped += 1;
    continue;
  }
  seen.add(dedupeKey);
  products.push(item);
}

const shops = [...new Set(products.map((p) => p.shopName).filter(Boolean))].sort();
const conditions = [
  ...new Set(products.map((p) => p.conditionLabel || p.condition)),
].sort();
const categoryNames = [
  ...new Set(products.flatMap((p) => p.categories)),
].sort();

const payload = {
  source: path.basename(inputPath),
  generatedAt: new Date().toISOString(),
  brand: DEFAULT_BRAND,
  count: products.length,
  skipped,
  shops,
  conditions,
  categoryNames,
  products,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");

console.log(
  JSON.stringify(
    {
      output: outputPath,
      count: products.length,
      skipped,
      shops: shops.length,
      categories: categoryNames.length,
      withSourceUrl: products.filter((p) => p.sourceUrl).length,
      withImage: products.filter((p) => p.imageUrl).length,
      withCategories: products.filter((p) => p.categories.length).length,
      used: products.filter((p) => p.condition === "used").length,
      neu: products.filter((p) => p.condition === "new").length,
      sample: products.slice(0, 2),
    },
    null,
    2,
  ),
);
